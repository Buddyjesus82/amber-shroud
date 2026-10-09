import { bayLookout } from './campJob'
import { FIRST_DROP_GOAL, firstDropPending } from './firstDrop'
import { getScene, resolveBody } from './content'
import { roadPressureScene } from './encounter'
import { isPressureOverlay } from './hunter'
import { check } from './logic'
import { compassMoves, hubMapOf, nodeIdForScene } from './map'
import { PEOPLE, personAtScene, personKnown, type Person } from './people'
import { talkIntentsFor } from './talk'
import type { Effect, GameState, Scene } from './types'

export type HelpGroup = 'Look' | 'Take' | 'Talk' | 'Go' | 'Fight'

export type HelpEntry = {
  group: HelpGroup
  command: string
  why: string
}

export const HELP_GROUPS: HelpGroup[] = ['Look', 'Take', 'Talk', 'Go', 'Fight']

/** Aliases that show up in prose without naming that person. */
const GENERIC = new Set([
  'skiff',
  'merchant',
  'shade',
  'leash',
  'handler',
  'clerk',
  'payroll',
  'runner',
  'runners',
  'stilts',
  'stilt',
  'blonde',
  'sifter',
  'overseer',
])

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A typed line repeats a button when every real word is already on that label. */
function covered(command: string, labels: string[]): boolean {
  const words = norm(command)
    .split(' ')
    .filter((w) => w.length >= 3)
  if (!words.length) return false
  return labels.some((label) => {
    const have = new Set(norm(label).split(' ').filter(Boolean))
    return words.every((w) => have.has(w))
  })
}

function add(list: HelpEntry[], labels: string[], entry: HelpEntry) {
  const key = norm(entry.command)
  const why = entry.why.replace(/\s+/g, ' ').trim()
  if (!key || !why || list.some((e) => norm(e.command) === key) || covered(entry.command, labels)) return
  list.push({ ...entry, why })
}

function proseOf(state: GameState, scene: Scene): string {
  return resolveBody(scene, (c) => check(c, state), scene.body)
}

function nameKeys(person: Person): string[] {
  const keys = [person.name, ...person.aliases]
    .map(norm)
    .filter((k) => k && !GENERIC.has(k))
  return [...new Set(keys)]
}

function mentioned(prose: string, person: Person): boolean {
  const words = new Set(norm(prose).split(' ').filter(Boolean))
  return nameKeys(person).some((key) => key.split(' ').every((part) => words.has(part)))
}

/** The mouth already on this beat. Help should not reintroduce them. */
function partnerId(state: GameState, scene: Scene): string | null {
  if (scene.kind === 'talk') {
    const who = personAtScene(scene.id)
    if (who) return who.id
  }
  if (scene.speaker) {
    const speaker = norm(scene.speaker)
    for (const person of Object.values(PEOPLE)) {
      if (nameKeys(person).some((key) => speaker.includes(key))) return person.id
    }
  }
  if (scene.id === 'camp:bay' && bayLookout(state)) return 'oiltooth'
  return null
}

function alreadyTalked(state: GameState, person: Person): boolean {
  return !!(state.flags[person.metFlag] || state.flags[`asked:${person.id}`])
}

function cardWhy(card: string): string {
  const clean = card.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim()
  const parts = clean.split(/\s[—–]\s/)
  const source = parts.length > 1 ? parts.slice(1).join(' ').trim() : clean
  const sentence = (source.split(/(?<=\.)\s/)[0] ?? source).replace(/[.]+$/, '').trim()
  const words = sentence.split(' ').filter(Boolean)
  let cut = -1
  for (let i = 0; i < words.length && i < 8; i++) {
    if (i >= 3 && /[,;]$/.test(words[i] ?? '')) cut = i
  }
  const picked = cut >= 0 ? words.slice(0, cut + 1) : words.length <= 12 ? words : words.slice(0, 6)
  return picked.join(' ').replace(/[,:;]+$/, '')
}

/** Scene talk already answers "fight", so a road-fight line would describe the wrong result. */
function sceneSwallowsFight(scene: Scene, state: GameState): boolean {
  const rules = [...(scene.intents ?? []), ...talkIntentsFor(scene.id)]
  return rules.some((rule) => {
    if (!check(rule.show, state)) return false
    return rule.tags.some((tag) => /\b(fight|attack|stab|bite|strike)\b/i.test(tag))
  })
}

function mapShowsRoads(state: GameState, scene: Scene): boolean {
  if (!state.hubId || scene.kind === 'crisis' || state.chapterId === 'cache-run') return false
  const map = hubMapOf(state)
  if (!map?.ready) return false
  return !!nodeIdForScene(map, state.sceneId, false)
}

/** Concrete `search <thing>` lines. Only targets that resolve on this scene. */
export function sceneSearch(state: GameState, target: string): Effect | null {
  const t = norm(target).replace(/^the /, '')
  const id = state.sceneId
  if (id === 'camp:bay') {
    if (t === 'north hull' || t === 'north bay' || t === 'pike' || t.includes('pike') || t.includes('lash') || t === 'cord') {
      return { goto: 'camp:bay-pike', flag: { bayLooked: true } }
    }
    if (t === 'east bay' || t === 'sarn' || t.includes('sarn')) {
      return { goto: 'camp:bay-sarn', flag: { bayLooked: true } }
    }
    if (t === 'south bay' || t === 'vetch' || t.includes('vetch')) {
      return { goto: 'camp:bay-vetch', flag: { bayLooked: true } }
    }
    if (t === 'center bay' || t === 'centre bay' || t.includes('jaxson') || t.includes('vance') || t.includes('skiff')) {
      return {
        flash: bayLookout(state)
          ? 'Jaxson is on his back under his skiff in the center bay, hotwiring it.'
          : "Jaxson's skiff stands in the center bay with nobody at it.",
      }
    }
  }
  if (id === 'camp:bay-pike') {
    if (t.includes('cord') || t.includes('lash') || t === 'post') {
      return {
        flash: state.flags.lashCord
          ? 'The post is bare. The lash cord is already in your hand.'
          : 'A lash cord hangs coiled on a post at the left of the bay.',
      }
    }
    if (t.includes('bolt') || t.includes('leg') || t.includes('joint') || t.includes('tag')) {
      if (state.flags.bayPikeTook) return { flash: 'Pike watches his rear leg now. Nothing more comes off it without a shout.' }
      if ((state.items.wrench ?? 0) > 0) {
        return { flash: 'A resin bolt with a corporate tag sits in the knee joint of a rear leg, on the side Pike is not working. The wrench will turn it out.' }
      }
      return { flash: 'A resin bolt with a corporate tag sits in the knee joint of a rear leg. It is threaded tight and needs a wrench.' }
    }
  }
  if (id === 'camp:bay-sarn' && (t.includes('crate') || t.includes('bolt') || t.includes('scrap') || t.includes('twist'))) {
    return {
      flash: state.flags.baySarnTook
        ? 'The rows of bolts on his crate are counted again. The scrap pile is one twist short.'
        : 'Counted rows of bolts and a small pile of scrap twists sit on his crate.',
    }
  }
  if (id === 'camp:bay-vetch') {
    if (t.includes('vial') || t.includes('drop')) {
      return {
        flash:
          state.flags.wrenchBayTrade === 'vetch'
            ? 'The spot under her skiff is empty. The vial is yours now.'
            : 'A Drop vial sits under her skiff, by a leg. Vetch keeps it for trade.',
      }
    }
    if (t.includes('wire') || t.includes('crate') || t.includes('copper')) {
      return {
        flash: state.flags.bayVetchTook
          ? 'The crate is bare. The copper wire is gone.'
          : 'A coil of copper wire sits on a crate at the right.',
      }
    }
  }
  if (id === 'spine:jodi' && (t.includes('snake') || t.includes('python') || t.includes('grudge'))) {
    return { flash: 'Grudge, her sand python. Thick as your arm, the colour of the dunes, draped over her shoulders with its head on her pile. Its tongue reads the air around your hands. She says it bites to make a point.' }
  }
  if (id === 'spine:jodi' && (t.includes('vulture') || t.includes('pastor') || t.includes('bird'))) {
    return { flash: 'Two vultures on a frame of bone and pipe. The big one is Pastor. They watch the road for the dead and bring her what is in their pockets.' }
  }
  if (id === 'spine:jodi' && t.includes('rat')) {
    return { flash: 'Sand rats in the canvas folds. More than she will count. They run the pile and are gone when you look straight at them.' }
  }
  if (id === 'spine:jodi' && (t.includes('spider') || t.includes('jar'))) {
    return { flash: 'A stoppered jar of black sand-spiders by her boot, and two loose ones on the seams of her wraps. They watch your hands as closely as she does.' }
  }
  if (id === 'spine:ridge' && (t.includes('track') || t.includes('print') || t === 'wash')) {
    return { flash: 'Hound tracks run down the east wash, from below Silas\'s shade to Hound Sign. The Dry Well road gets there too.' }
  }
  if (id === 'spine:well') {
    if (t.includes('brick') || t.includes('carving') || t.includes('words')) {
      return {
        flash: state.flags.wellScrap
          ? 'KAELEN CUTS DUSK and CACHE IS BAIT are cut into the bricks. The loose one is already out, and the hole behind it is empty.'
          : 'KAELEN CUTS DUSK and CACHE IS BAIT are cut into the bricks. The brick under the words sits loose in its mortar.',
      }
    }
    if (t.includes('throat') || t.includes('resin') || t === 'well') {
      if (state.flags['skim:spine:well']) return { flash: 'The well-throat is scraped bare.' }
      return {
        flash: state.equipped?.weapon
          ? 'Hard resin lines the inside of the well-throat. Your weapon will scrape one Drop out of it.'
          : 'Hard resin lines the inside of the well-throat. Scraping a Drop out of it needs a weapon equipped.',
      }
    }
  }
  if (id === 'spine:hound' && (t.includes('kill') || t.includes('shard') || t.includes('print') || t.includes('tooth'))) {
    return {
      flash: state.flags.houndTooth
        ? 'Fresh Shard-Hound prints in the dust. The old kill beside them has no shard left in it.'
        : 'Fresh Shard-Hound prints in the dust. Beside them, an old kill still has a spent shard in its jaw.',
    }
  }
  if (id === 'ch1:p-pipe' && (t === 'grate' || t === 'bolt' || t === 'pipe' || t === 'fence')) {
    const wrench = (state.items.wrench ?? 0) > 0
    return {
      flash: wrench
        ? 'A steam grate, bolts Camp-04 cheaped out on. The wrench will take the west bolt. The open wash is the other way, and Clerk Rell is on the far side.'
        : 'A steam grate. No wrench. You can crawl the hot pipe, or run the open wash where Clerk Rell is already waiting.',
    }
  }
  if (id === 'ch1:p-clerk' && (t === 'tablet' || t === 'clerk' || t === 'papers')) {
    return {
      flash: 'Clerk Rell’s steam-tablet. He wants work papers, or he writes you down as escaped and calls a Hound. Then he goes home.',
    }
  }
  if (id === 'ch1:p-oil' && (t === 'hull' || t === 'runner' || t === 'lash' || t === 'tag' || t === 'cuff')) {
    const wrench = (state.items.wrench ?? 0) > 0
    return {
      flash: wrench
        ? 'The stolen hull is loud. A lash on the port runner is coming loose. The wrench would seat it. The Cartel tag is still sewn in your cuff.'
        : 'The stolen hull is loud. Jaxson is under it. The Cartel tag is still sewn in your cuff unless you let him cut it.',
    }
  }
  return null
}

/**
 * Hidden typed actions for this scene: discoveries that work and are not already buttons.
 * Every command here must resolve through interpret without a Miss.
 */
export function helpEntries(state: GameState, labels: string[]): HelpEntry[] {
  if (state.flags.downed || (state.health ?? 1) <= 0 || state.flags.encounterHere || isPressureOverlay(state)) {
    return []
  }

  const list: HelpEntry[] = []
  const scene = getScene(state.sceneId, state.door)
  const partner = partnerId(state, scene)
  const prose = proseOf(state, scene)

  const wrench = (state.items.wrench ?? 0) > 0
  if (state.sceneId === 'camp:bay') {
    if (!state.flags.bayPikeTook && wrench) {
      add(list, labels, {
        group: 'Take',
        command: 'steal bolt from Pike',
        why: "the wrench turns a resin bolt out of Pike's rear leg",
      })
    }
    if (!state.flags.baySarnTook) {
      add(list, labels, {
        group: 'Take',
        command: 'steal scrap from Sarn',
        why: 'Sarn skips a count on purpose',
      })
    }
    if (!state.flags.bayVetchTook) {
      add(list, labels, {
        group: 'Take',
        command: 'steal wire from Vetch',
        why: "copper wire sits on a crate in Vetch's bay",
      })
    }
    if (wrench && !state.flags.wrenchBayTrade) {
      if (!state.flags.lashCord) {
        add(list, labels, {
          group: 'Take',
          command: 'trade wrench to Pike',
          why: 'Pike hands over the lash cord off his post',
        })
      }
      add(list, labels, { group: 'Take', command: 'trade wrench to Sarn', why: 'one twist of scrap' })
      add(list, labels, { group: 'Take', command: 'trade wrench to Vetch', why: 'the Drop vial under her skiff' })
    }
    add(list, labels, { group: 'Talk', command: 'talk Pike', why: 'works a leg of his skiff in the north bay' })
    add(list, labels, { group: 'Talk', command: 'talk Sarn', why: 'counts bolts beside his skiff in the east bay' })
    add(list, labels, { group: 'Talk', command: 'talk Vetch', why: 'welds a cracked skid in the south bay' })
  }

  if (state.sceneId === 'camp:bay-pike') {
    if (!state.flags.lashCord) add(list, labels, { group: 'Look', command: 'look cord', why: 'coiled on a post at the left' })
    if (!state.flags.bayPikeTook && (wrench || !state.flags.wrenchBayTrade)) {
      add(list, labels, { group: 'Look', command: 'look bolt', why: 'a resin bolt in a rear knee joint' })
    }
  }
  if (state.sceneId === 'camp:bay-sarn') {
    add(list, labels, { group: 'Look', command: 'look crate', why: 'counted bolts and scrap twists' })
  }
  if (state.sceneId === 'camp:bay-vetch') {
    if (state.flags.wrenchBayTrade !== 'vetch') {
      add(list, labels, { group: 'Look', command: 'look vial', why: 'a Drop vial under her skiff' })
    }
    if (!state.flags.bayVetchTook) add(list, labels, { group: 'Look', command: 'look wire', why: 'copper wire on a crate' })
  }

  if (state.sceneId === 'spine:ridge') {
    add(list, labels, { group: 'Look', command: 'look at tracks', why: 'Hound tracks on the eastern wash' })
  }
  if (state.sceneId === 'spine:well') {
    if (!state.flags.wellScrap) add(list, labels, { group: 'Look', command: 'look at bricks', why: 'a loose brick under the carved words' })
    if (!state.flags['skim:spine:well']) add(list, labels, { group: 'Look', command: 'look at throat', why: 'hard resin inside the well' })
  }
  if (state.sceneId === 'spine:hound' && !state.flags.houndTooth) {
    add(list, labels, { group: 'Look', command: 'look at kill', why: 'an old kill beside the prints' })
  }

  for (const person of Object.values(PEOPLE)) {
    if (person.id === partner || alreadyTalked(state, person) || !personKnown(state, person)) continue
    const present = personAtScene(scene.id)?.id === person.id
    if (!present && !mentioned(prose, person)) continue
    const why = cardWhy(person.card)
    if (!why) continue
    add(list, labels, { group: 'Talk', command: `who is ${person.name}`, why })
  }

  if (!mapShowsRoads(state, scene)) {
    const moves = compassMoves(state)
    const byDir = new Map<string, typeof moves>()
    for (const move of moves) {
      const group = byDir.get(move.dir) ?? []
      group.push(move)
      byDir.set(move.dir, group)
    }
    for (const group of byDir.values()) {
      if (group.length !== 1) continue
      const move = group[0]
      add(list, labels, {
        group: 'Go',
        command: `go ${move.dir.toLowerCase()} to ${move.name}`,
        why: 'connected road',
      })
    }
  }

  const mouth = !!(personAtScene(scene.id) || scene.speaker || talkIntentsFor(scene.id).length)
  const fightButton = labels.some((label) => /\b(fight|attack)\b/i.test(label) || /\bscrap the\b/i.test(label))
  if (
    !mouth &&
    !fightButton &&
    !sceneSwallowsFight(scene, state) &&
    roadPressureScene(scene.id) &&
    scene.kind !== 'talk' &&
    scene.kind !== 'crisis' &&
    scene.kind !== 'ending'
  ) {
    add(list, labels, {
      group: 'Fight',
      command: 'fight the road',
      why: 'something steps into the grit',
    })
  }

  return list
}

export function hiddenCommands(state: GameState, labels: string[]): string[] {
  return helpEntries(state, labels).map((entry) => entry.command)
}

export function helpText(state: GameState, labels: string[]): string {
  const cmds = helpEntries(state, labels)
  const goal = firstDropPending(state) && !state.flags.encounterHere && !state.flags.downed ? [FIRST_DROP_GOAL] : []
  if (!cmds.length) return goal.concat('Nothing hidden here. Try look.').join('\n')
  return goal.concat('Things you could try:', cmds.map((entry) => entry.command)).join('\n')
}
