import { bayLookout } from './campJob'
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
  if (
    id === 'camp:bay' &&
    (t === 'north hull' ||
      t === 'north bay' ||
      t === 'hull' ||
      t === 'pike' ||
      t === 'skiff' ||
      t.includes('lash') ||
      t.includes('pike'))
  ) {
    const cord = !!state.flags.lashCord
    const trade = (state.items.wrench ?? 0) > 0 && !state.flags.wrenchBayTrade && !cord
    const flash = cord
      ? "Pike is still scraping his skiff in the north bay. The lash cord is already in your hand."
      : trade
        ? "Pike scrapes his skiff in the north bay and does not look up. A lash cord is on the runner. You can steal it, or trade him the wrench for it."
        : "Pike scrapes his skiff in the north bay and does not look up. A lash cord is on the runner."
    return { flag: { bayLooked: true }, flash }
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
        : 'The stolen hull is loud. Oil-Tooth is under it. The Cartel tag is still sewn in your cuff unless you let him cut it.',
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

  if (state.sceneId === 'camp:bay' && !state.flags.bayLooked && !state.flags.lashCord) {
    add(list, labels, {
      group: 'Look',
      command: 'search north bay',
      why: "a lash cord is on Pike's skiff",
    })
  }

  if (state.sceneId === 'camp:bay') {
    if (!state.flags.bayPikeTook) {
      add(list, labels, {
        group: 'Take',
        command: 'steal bolt from Pike',
        why: "a resin bolt comes off Pike's skiff in the north bay",
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
        why: "a curl of wire from Vetch's cuff",
      })
    }
    if ((state.items.wrench ?? 0) > 0 && !state.flags.wrenchBayTrade) {
      if (!state.flags.lashCord) {
        add(list, labels, {
          group: 'Take',
          command: 'trade wrench to Pike',
          why: "the lash cord comes off Pike's skiff in the north bay",
        })
      }
      add(list, labels, {
        group: 'Take',
        command: 'trade wrench to Sarn',
        why: 'one twist of scrap',
      })
      add(list, labels, {
        group: 'Take',
        command: 'trade wrench to Vetch',
        why: 'a small Drop comes out of the glove',
      })
    }

    add(list, labels, { group: 'Talk', command: 'talk Pike', why: 'scrapes his skiff in the north bay' })
    add(list, labels, { group: 'Talk', command: 'talk Sarn', why: 'counts bolts beside his skiff in the east bay' })
    add(list, labels, { group: 'Talk', command: 'talk Vetch', why: 'welds a cracked skid in the south bay' })
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
  if (!cmds.length) return 'Nothing hidden here. Try look.'
  return ['Things you could try:'].concat(cmds.map((entry) => entry.command)).join('\n')
}
