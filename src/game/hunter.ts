import { CARAPACE_HUNTER_HEAT, SPINE_HUNTER, spineHunterFor } from './content/spineHunter'
import { beginEncounter } from './encounter'
import { check } from './logic'
import type { Choice, GameState } from './types'

export function isWireSide(sceneId: string): boolean {
  return sceneId === 'camp:wire' || sceneId.startsWith('camp:kaelen')
}

export function isMawGround(sceneId: string): boolean {
  return sceneId.startsWith('maw:') || sceneId === 'ch2:stub'
}

function campGround(state: Pick<GameState, 'hubId' | 'sceneId'>): boolean {
  return state.hubId === 'camp04' || state.sceneId.startsWith('camp:')
}

/** Spine hub, plus the Outcast leg of the Cache Run. Stray Heat is the hunt Heat here. */
export function spineGround(state: Pick<GameState, 'hubId' | 'sceneId'>): boolean {
  return state.hubId === 'spine' || state.sceneId.startsWith('spine:') || state.sceneId.startsWith('ch1:o-')
}

/** The Strays have a reason to look. Mirrors campHeard for the Cartel. */
export function straysHeard(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.strayNotice
}

function threshGround(state: Pick<GameState, 'hubId' | 'sceneId'>): boolean {
  return state.hubId === 'threshold' || state.sceneId.startsWith('thresh:')
}

export function isSybellaOverlay(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return (
    !state.flags.encounterHere &&
    !!state.flags.hunterHere &&
    (state.hubId === 'redmaw' || isMawGround(state.sceneId)) &&
    state.sceneId !== 'maw:sybella' &&
    state.sceneId !== 'maw:sybella-shadow'
  )
}

export function isCampHunt(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return !state.flags.encounterHere && !!state.flags.hunterHere && campGround(state)
}

export function isSpineHunt(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return !state.flags.encounterHere && !!state.flags.hunterHere && spineGround(state)
}

export function isThreshHunt(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return !state.flags.encounterHere && !!state.flags.hunterHere && threshGround(state)
}

export function isPressureOverlay(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return isSybellaOverlay(state) || isCampHunt(state) || isSpineHunt(state) || isThreshHunt(state)
}

export function pressureFace(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId' | 'heat'>): string | null {
  const hot = (state.heat?.cartel ?? 0) >= 7
  if (isSybellaOverlay(state)) return 'Sybella'
  if (isCampHunt(state)) return hot ? 'Valerius' : 'Hound-handler'
  if (isSpineHunt(state)) return spineHunterFor(state).face
  if (isThreshHunt(state)) return 'Court Guard'
  return null
}

const CLEAR = ['hunterHere', 'hunterFrom']

/** In-place stake. Marks the encounter clock so this beat does not also roll a road fight. */
function stay(state: GameState, extra: Choice['effects']): Choice['effects'] {
  const { flag, ...rest } = extra
  return {
    ticks: 1,
    unsetFlag: CLEAR,
    ...rest,
    flag: { encounterAt: state.ticks, ...(flag ?? {}) },
  }
}

export const CAMP_HUNT_APPEND = `A muzzle knocks this ground. The Hound-handler, resin gloves, a Shard-Hound on a short chip-lead. The Overseer's name is on the tag.

"Upright labor. He likes a diagram. I like a throat." You stay on this ground. Pay, fight, hide, or choose a road.`

export const SPINE_HUNT_APPEND = SPINE_HUNTER.append

export const VALERIUS_HUNT_APPEND = `He came himself. Cartel Heat dragged Overseer Valerius out of the tower. The skiff-woman wants the other end of you. That is a lever, later, if you live.

"Escape already spent a Hound. This one is my feet." You are still on this ground.`

export const THRESH_HUNT_APPEND = `The chant stutters on this ground. A Court guard lowers a spear. Thalia's gold is a crack in the hymn, not a hand on your collar.

"Fraud." You stay on this ground. Pay, hide, fight, or run to the paddock yourself.`

export const SYBELLA_SHADOW_APPEND = `The skiff-shadow slides over this ground without moving you. Sybella's voice, cold as stone that remembers rain:

"You carry sap like a lamp in a tomb. The old roads remember that light, and so do the things that sleep under them. Give the sand something to remember you by, or I'll leave you here for it."

You are still here. Face her smoke only if you walk it.`

function hungerOuts(heat: Choice['effects']['heat']): Choice[] {
  return [
    {
      id: 'hunter-ride',
      label: 'Run for the hotwired Strider',
      show: { flag: 'striderHot' },
      tone: 'hunger',
      effects: {
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat,
        flag: { hungerKnown: true },
        unsetFlag: CLEAR,
      },
    },
    {
      id: 'hunter-run',
      label: 'Break for the Hunger',
      show: { any: [{ flag: 'hungerKnown' }, { item: 'oram_map' }] },
      tone: 'hunger',
      effects: {
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat,
        pressure: 1,
        flag: { hungerKnown: true },
        unsetFlag: CLEAR,
      },
    },
    {
      id: 'hunter-blind',
      label: 'Run anyway. Heading or not.',
      show: {
        all: [{ flagUnset: 'hungerKnown' }, { not: { item: 'oram_map' } }],
      },
      tone: 'danger',
      effects: {
        flag: { hungerKnown: true, cacheBlind: true },
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat,
        unsetFlag: CLEAR,
      },
    },
  ]
}

function campHuntChoices(state: GameState): Choice[] {
  const rows: Choice[] = [
    {
      id: 'hunter-scrap',
      label: 'Pay the handler one scrap',
      sub: 'A minute. Not a pardon. You stay.',
      show: { item: 'scrap' },
      effects: stay(state, {
        remove: { scrap: 1 },
        flash:
          'The glove closes. The Hound’s head turns. You bought a minute, not a pardon. Valerius still has the tower. You never left.',
      }),
    },
    {
      id: 'hunter-glint',
      label: 'Pay the handler a Glint',
      sub: 'Expensive quiet. Cartel Heat cools. You stay.',
      show: { item: 'glints' },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { cartel: -1 },
        flash:
          'Coin the company did not print. The handler pockets it and walks the Hound past. You are still on this ground.',
      }),
    },
    {
      id: 'hunter-scrip',
      label: 'Press scrip into the glove',
      sub: 'Paper that says owned. You stay.',
      show: { item: 'scrip' },
      effects: stay(state, {
        remove: { scrip: 1 },
        heat: { cartel: -1 },
        flash: 'Owned is a solved problem. The handler likes solved. The Hound loses interest. You did not move.',
      }),
    },
    {
      id: 'hunter-fight',
      label: 'Fight the Hound-handler',
      sub: 'The man with the leash. You stay.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: beginEncounter(state, 'handler', 'You go for the man with the leash. The hound lunges and he hauls it short. This ground becomes a fight.'),
    },
    {
      id: 'hunter-hold',
      label: 'Drop into the grit',
      sub: 'Stay. Costs Sap and Cartel Heat.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { cartel: 1 },
        pressure: 1,
        flash: 'You eat grit. The Hound smells you and the handler is lazy. You are still here. Cartel Heat ticks.',
      }),
    },
    {
      id: 'hunter-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay. The glance slides.',
      show: { any: [{ slot: 'armor' }, { slot: 'cloak' }] },
      effects: stay(state, {
        pressure: 1,
        flash: 'The armor takes the glance. Gear did that. You never left.',
      }),
    },
    {
      id: 'hunter-bargain',
      label: 'Bargain a heading',
      sub: 'Sap and Cartel Heat. You stay. He files you.',
      effects: stay(state, {
        sap: -1,
        heat: { cartel: 1 },
        pressure: 1,
        flash:
          'You offer the dunes. The handler files you eastbound and walks the Hound on. Valerius still has the tower. You never left.',
      }),
    },
  ]
  rows.push({
    id: 'hunter-line',
    label: 'Dive the scrape-line',
    sub: 'Cartel Heat -1. You stay on this ground.',
    effects: stay(state, {
      sap: -1,
      heat: { cartel: -1 },
      flash: 'You drop into work that is already here. Cartel Heat cools. The handler loses the shape of you. You never left.',
    }),
  })
  rows.push(...hungerOuts({ cartel: 2 }))
  return rows
}

/** Which Spine face the hunt fields at this Stray Heat, before the hunt locks it in. */
export function spineHunterKindAt(strays: number): 'collector' | 'carapace' {
  return strays >= CARAPACE_HUNTER_HEAT ? 'carapace' : 'collector'
}

function spineHuntChoices(state: GameState): Choice[] {
  const hunter = spineHunterFor(state)
  const carapace = hunter.kind === 'carapace'
  const who = carapace ? 'Nim' : 'The collector'
  const pay: Choice[] = carapace
    ? [
        {
          id: 'spine-offer',
          label: 'Pour a Drop on his sand',
          sub: 'Costs 1 Drop. He takes it as the blood the sand is owed, once. You stay.',
          show: { all: [{ item: 'vial_drop' }, { flagUnset: 'carapaceOffered' }] },
          effects: stay(state, {
            remove: { vial_drop: 1 },
            add: { vial_empty: 1 },
            flag: { carapaceOffered: true },
            flash:
              'You pour the Drop onto his pinch of sand. He watches it soak in, nods once, and walks back down the slope. "Next time the sand takes yours," he says.',
          }),
        },
      ]
    : [
        {
          id: 'spine-scrap',
          label: 'Pay the collector one scrap',
          sub: 'A minute on this ground.',
          show: { item: 'scrap' },
          effects: stay(state, {
            remove: { scrap: 1 },
            flash: 'The collector takes the scrap and walks back down-slope. You stay where you are.',
          }),
        },
        {
          id: 'spine-glint',
          label: 'Pay the collector a Glint',
          sub: 'Stray Heat cools. You stay.',
          show: { item: 'glints' },
          effects: stay(state, {
            remove: { glints: 1 },
            heat: { strays: -1 },
            flash: 'The collector pockets the Glint and walks back down-slope. Stray Heat cools. You stay where you are.',
          }),
        },
      ]
  const rows: Choice[] = [
    ...pay,
    {
      id: 'spine-fight',
      label: hunter.fightLabel,
      sub: hunter.fightSub,
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: beginEncounter(state, hunter.kind, hunter.fightOpen),
    },
    {
      id: 'spine-hide',
      label: 'Eat the wash and stay',
      sub: 'Sap and Stray Heat.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { strays: 1 },
        pressure: 1,
        flash: `You keep your face in the grit. ${who} waits out the minute and walks back down-slope. Stray Heat rises.`,
      }),
    },
    {
      id: 'spine-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay.',
      show: { any: [{ slot: 'armor' }, { slot: 'cloak' }] },
      effects: stay(state, {
        pressure: 1,
        flash: `The glance slides off the cloth. ${who} looks past you. You never left this ground.`,
      }),
    },
    {
      id: 'spine-bargain',
      label: 'Bargain the east',
      sub: 'Sap and Stray Heat. You stay.',
      effects: stay(state, {
        sap: -1,
        heat: { strays: 1 },
        pressure: 1,
        flash: carapace
          ? 'You tell him you are walking east to the Maw. "Then I walk east," he says, and lets you be for now. Stray Heat rises.'
          : 'You tell the collector you are walking east to the Maw. They let you be for now. Stray Heat rises.',
      }),
    },
  ]
  if (!state.sceneId.startsWith('spine:shade') && !state.sceneId.startsWith('spine:silas') && state.sceneId !== 'spine:tip') {
    rows.push({
      id: 'spine-shade',
      label: 'Break for Silas’s shade',
      sub: 'You choose the tent. Sap.',
      effects: {
        goto: 'spine:shade',
        sap: -1,
        ticks: 1,
        pressure: 1,
        heat: { strays: 1 },
        unsetFlag: CLEAR,
        flash: `You run for the tent. ${who} stays on the ridge and watches you go. Stray Heat rises.`,
      },
    })
  }
  rows.push(...hungerOuts({ strays: 1 }))
  return rows
}

function threshHuntChoices(state: GameState): Choice[] {
  const rows: Choice[] = [
    {
      id: 'thresh-scrip',
      label: 'Press scrip into the spear-hand',
      sub: 'Paper. You stay.',
      show: { item: 'scrip' },
      effects: stay(state, {
        remove: { scrip: 1 },
        heat: { seekers: -1 },
        flash: 'The spear lifts. Paper beats a hymn if the hymn is underpaid. You are still here.',
      }),
    },
    {
      id: 'thresh-glint',
      label: 'Offer a Glint to the guard',
      sub: 'He takes it. Seekers Heat still ticks. You stay.',
      show: { item: 'glints' },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { seekers: 1 },
        flash: 'He palms the Glint and does not thank you. The spear turns. Seekers Heat ticks. You did not move.',
      }),
    },
    {
      id: 'thresh-fight',
      label: 'Meet the spear',
      sub: 'Strike vs Shell. Health takes the hits. You stay.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: beginEncounter(state, 'cutter', 'The spear is a person with a knife-smile. This ground is the fight.'),
    },
    {
      id: 'thresh-hide',
      label: 'Kneel in the hymn-dust',
      sub: 'Stay. Sap and Seeker Heat.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { seekers: 1 },
        pressure: 1,
        flash: 'Dust on the mouth. The guard decides you are not worth a verse. You are still here.',
      }),
    },
    {
      id: 'thresh-cloak',
      label: 'Let the cloth eat the glance',
      sub: 'Armor on. Stay.',
      show: { any: [{ slot: 'armor' }, { slot: 'cloak' }] },
      effects: stay(state, {
        pressure: 1,
        flash: 'The cloth does the lying. The spear hesitates. You never left this ground.',
      }),
    },
    {
      id: 'thresh-bargain',
      label: 'Ask the guard to pass you',
      sub: 'Sap and Seeker Heat. You stay.',
      effects: stay(state, {
        sap: -1,
        heat: { seekers: 1 },
        pressure: 1,
        flash: 'You ask for an hour. He gives you the dust you are already standing in, and a hotter hymn.',
      }),
    },
  ]
  if (state.sceneId !== 'thresh:paddock' && !state.sceneId.startsWith('thresh:oram')) {
    rows.push({
      id: 'thresh-paddock',
      label: 'Run for Oram’s paddock',
      sub: 'You choose the Striders. Sap.',
      effects: {
        goto: 'thresh:paddock',
        sap: -1,
        ticks: 1,
        pressure: 1,
        heat: { seekers: 1 },
        unsetFlag: CLEAR,
        flash: 'You spend the run. Oram puts a Strider between you and the spear. That was your feet, not a yank.',
      },
    })
  }
  rows.push(...hungerOuts({ seekers: 2 }))
  return rows
}

export function sybellaShadowChoices(state: GameState): Choice[] {
  return [
    {
      id: 'sybella-glint',
      label: 'Offer a Glint to the sand',
      sub: 'Old rite. She is not paid. Seekers Heat cools. You stay.',
      show: { item: 'glints' },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { seekers: -1 },
        flag: { sybellaOffering: true },
        flash: 'You set the Glint in the grit like an offering, not a price. Her breath steadies. Seekers Heat cools. You are still here.',
      }),
    },
    {
      id: 'sybella-hold',
      label: 'Eat grit. Let the shadow pass.',
      sub: 'Sap. Seekers Heat ticks. You stay.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { seekers: 1 },
        pressure: 1,
        flash: 'You eat grit and let her pass. You did not walk. She still knows your shape.',
      }),
    },
    {
      id: 'sybella-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. You stay. She still sees you.',
      show: { any: [{ slot: 'armor' }, { slot: 'cloak' }] },
      effects: stay(state, {
        pressure: 1,
        flash: 'The armor takes the glance. The skiff-shadow slides. You never left.',
      }),
    },
    {
      id: 'sybella-defy',
      label: 'Tell her to find someone else to shadow',
      sub: 'Seekers +2. You stay.',
      tone: 'danger',
      effects: stay(state, {
        heat: { seekers: 2 },
        pressure: 1,
        flash: 'You tell her to find someone else. The shadow leaves this ground. Seekers Heat does not.',
      }),
    },
    {
      id: 'sybella-swing',
      label: 'Swing at the shadow',
      sub: 'She is not a body you can drop. Health and Heat. You stay.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: stay(state, {
        health: -1,
        heat: { seekers: 2 },
        pressure: 1,
        flash: 'You hit grit. She notes the try and does not bleed. You are still here, and the cut is real.',
      }),
    },
    {
      id: 'sybella-smoke',
      label: 'Go to her smoke and face it',
      effects: {
        goto: 'maw:sybella',
        ticks: 1,
        unsetFlag: ['hunterHere'],
        flash: 'You spend the walk. Whatever ground you left waits without you.',
      },
    },
  ]
}

export function pressureAppend(state: GameState): string | null {
  if (isSybellaOverlay(state)) return SYBELLA_SHADOW_APPEND
  if (isCampHunt(state)) return state.heat.cartel >= 7 ? VALERIUS_HUNT_APPEND : CAMP_HUNT_APPEND
  if (isSpineHunt(state)) return spineHunterFor(state).append
  if (isThreshHunt(state)) return THRESH_HUNT_APPEND
  return null
}

export function pressureChoices(state: GameState): Choice[] {
  if (state.flags.encounterHere || !state.flags.hunterHere) return []
  const rows = isSybellaOverlay(state)
    ? sybellaShadowChoices(state)
    : isCampHunt(state)
      ? campHuntChoices(state)
      : isSpineHunt(state)
        ? spineHuntChoices(state)
        : isThreshHunt(state)
          ? threshHuntChoices(state)
          : []
  return rows.filter((c) => check(c.show, state))
}

function findId(rows: Choice[], id: string): Choice | null {
  return rows.find((c) => c.id === id) ?? null
}

/** Short Do verbs for a pressure card. Full button labels still match on their own. */
export function pressureVerb(state: GameState, text: string): Choice | null {
  const rows = pressureChoices(state)
  if (!rows.length) return null
  const hay = text.toLowerCase()
  if (/\bglint/.test(hay)) return rows.find((c) => /glint|evidence/.test(c.id)) ?? null
  if (/\bscrap/.test(hay)) return rows.find((c) => c.id.endsWith('scrap')) ?? null
  if (/\bscrip/.test(hay)) return rows.find((c) => c.id.includes('scrip')) ?? null
  if (/\b(pour|offer)\b/.test(hay)) return findId(rows, 'spine-offer')
  if (/\b(pay|bribe)\b/.test(hay)) return rows.find((c) => /scrap|glint|scrip|evidence|offer/.test(c.id)) ?? null
  if (/\b(handler|hound)\b/.test(hay) && /\b(fight|attack|kill|stab|swing)\b/.test(hay)) {
    return rows.find((c) => c.id === 'hunter-fight' || c.id === 'spine-fight') ?? null
  }
  if (/\b(fight|attack|bite|kill|stab|swing)\b/.test(hay)) return rows.find((c) => /fight|swing/.test(c.id)) ?? null
  if (/\b(talk|ask|say|tell|speak)\b/.test(hay)) {
    return rows.find((c) => /defy|bargain|hold/.test(c.id)) ?? null
  }
  if (/\bcloak\b/.test(hay)) return rows.find((c) => c.id.includes('cloak')) ?? null
  if (/\b(hide|crouch|duck|grit)\b/.test(hay)) {
    if (state.equipped?.armor || state.equipped?.cloak) {
      const cloak = rows.find((c) => c.id.includes('cloak'))
      if (cloak) return cloak
    }
    return rows.find((c) => /hold|hide/.test(c.id)) ?? null
  }
  if (/\b(bargain|deal)\b/.test(hay)) return rows.find((c) => /bargain|defy/.test(c.id)) ?? null
  if (/\b(line|yard|scrape)\b/.test(hay)) return findId(rows, 'hunter-line')
  if (/\b(shade|silas)\b/.test(hay)) return findId(rows, 'spine-shade')
  if (/\b(paddock|oram)\b/.test(hay)) return findId(rows, 'thresh-paddock')
  if (/\b(smoke|face her|sybella)\b/.test(hay)) return findId(rows, 'sybella-smoke')
  if (/\b(stay|hold|wait|dismiss|pass)\b/.test(hay)) {
    return findId(rows, 'hunter-hold') ?? findId(rows, 'sybella-hold') ?? findId(rows, 'spine-hide') ?? findId(rows, 'thresh-hide')
  }
  if (/\b(run|flee|escape)\b/.test(hay)) {
    return findId(rows, 'hunter-line') ?? findId(rows, 'spine-shade') ?? findId(rows, 'thresh-paddock')
  }
  return null
}
