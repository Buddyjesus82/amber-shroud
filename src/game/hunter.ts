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

function spineGround(state: Pick<GameState, 'hubId' | 'sceneId'>): boolean {
  return state.hubId === 'spine' || state.sceneId.startsWith('spine:')
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

export function pressureFace(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): string | null {
  if (isSybellaOverlay(state)) return 'Sybella'
  if (isCampHunt(state)) return 'Hound-handler'
  if (isSpineHunt(state)) return 'Valerius'
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

export const CAMP_HUNT_APPEND = `A muzzle knocks this ground. Not Valerius — the Hound-handler, resin gloves, a Shard-Hound on a short chip-lead. The Overseer's name is on the tag. His boots are still in the tower.

"Upright labor. He likes a diagram. I like a throat." You are not moved. Pay, fight, hide, or choose a road.`

export const SPINE_HUNT_APPEND = `The wash narrows on this ground. Valerius has the sun behind him like he rented it — he came to you. Shade did not.

"A Drop in my vial, a price, or a fight." You leave only if you pick a road.`

export const THRESH_HUNT_APPEND = `The chant stutters on this ground. A Court guard lowers a spear. Thalia's gold is a crack in the hymn, not a hand on your collar.

"Fraud." You are not dragged to the paddock. Pay, hide, fight, or run there yourself.`

export const SYBELLA_SHADOW_APPEND = `The skiff-shadow slides over this ground without moving you. Sybella's voice, almost kind:

"Tick. Tick. The Maw does not wait on hub-roaming. An hour from me is not free."

You are still here. She is not a teleport. Face her smoke only if you walk it.`

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
      show: { any: [{ flag: 'hungerKnown' }, { item: 'silas_tip' }, { item: 'oram_map' }] },
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
        all: [{ flagUnset: 'hungerKnown' }, { not: { item: 'silas_tip' } }, { not: { item: 'oram_map' } }],
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
      label: 'Fight the Hound',
      sub: 'Bite vs Hide. Health takes the hits. You stay.',
      tone: 'danger',
      effects: beginEncounter(state, 'pup', 'You go for the jaw. The handler swears. This ground becomes a fight.'),
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
      show: { slot: 'armor' },
      effects: stay(state, {
        pressure: 1,
        flash: 'Dust-cloth or hide. The handler’s glance slides. Gear did that. You never left.',
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
  if (state.sceneId !== 'camp:yard' && state.sceneId !== 'camp:vats') {
    rows.push({
      id: 'hunter-line',
      label: 'Dive the scrape-line',
      sub: 'That choice is the Yard.',
      effects: {
        sap: -1,
        ticks: 1,
        heat: { cartel: 1 },
        unsetFlag: CLEAR,
        goto: 'camp:yard',
        flash: 'You become a back among backs. You chose the Yard. The Hound passes. The handler lost the scent.',
      },
    })
  }
  rows.push(...hungerOuts({ cartel: 2 }))
  return rows
}

function spineHuntChoices(state: GameState): Choice[] {
  const rows: Choice[] = [
    {
      id: 'spine-scrap',
      label: 'Pay him one scrap',
      sub: 'A minute on this ground.',
      show: { item: 'scrap' },
      effects: stay(state, {
        remove: { scrap: 1 },
        flash: 'He takes the scrap like a receipt. The wash stays yours for a minute. You did not walk.',
      }),
    },
    {
      id: 'spine-glint',
      label: 'Pay him a Glint',
      sub: 'Cartel Heat cools. You stay.',
      show: { item: 'glints' },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { cartel: -1 },
        flash: 'Amber chip, amber quiet. He points the Hound past you. This ground does not change.',
      }),
    },
    {
      id: 'spine-fight',
      label: 'Fight the Shard-Hound',
      sub: 'Bite vs Hide. Health takes the hits. You stay.',
      tone: 'danger',
      effects: beginEncounter(state, 'pup', 'The jaw is the fight. Valerius watches from this same ground.'),
    },
    {
      id: 'spine-hide',
      label: 'Eat the wash and stay',
      sub: 'Sap and Cartel Heat.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { cartel: 1 },
        pressure: 1,
        flash: 'Grit in the teeth. He lets the minute pass and writes the cowardice. You are still here.',
      }),
    },
    {
      id: 'spine-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay.',
      show: { slot: 'armor' },
      effects: stay(state, {
        pressure: 1,
        flash: 'The glance slides off the cloth. He files a miss. You never left this ground.',
      }),
    },
    {
      id: 'spine-bargain',
      label: 'Bargain the east',
      sub: 'Sap and Cartel Heat. You stay. He files the heading.',
      effects: stay(state, {
        sap: -1,
        heat: { cartel: 1 },
        pressure: 1,
        flash: 'You name the Maw. He almost smiles. The file is the price. Your feet stay.',
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
        heat: { cartel: 1 },
        unsetFlag: CLEAR,
        flash: 'Shade takes you because you ran to it. Valerius lets the choice stand. He will price it later.',
      },
    })
  }
  rows.push(...hungerOuts({ cartel: 1 }))
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
      sub: 'Bite vs Hide. Health takes the hits. You stay.',
      tone: 'danger',
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
      show: { slot: 'armor' },
      effects: stay(state, {
        pressure: 1,
        flash: 'The cloth does the lying. The spear hesitates. You never left this ground.',
      }),
    },
    {
      id: 'thresh-bargain',
      label: 'Bargain an hour',
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
      label: 'Buy the hour with a Glint',
      sub: 'Seekers-only receipt. You stay.',
      show: { all: [{ door: 'vessel' }, { item: 'glints' }] },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { seekers: -1 },
        flash: 'She takes the Glint like a hymn. An hour. Not a pardon. You are still here.',
      }),
    },
    {
      id: 'sybella-evidence',
      label: 'Offer a Glint. She will not sell.',
      sub: 'She keeps it. Seekers Heat ticks. You stay.',
      show: { all: [{ not: { door: 'vessel' } }, { item: 'glints' }] },
      effects: stay(state, {
        remove: { glints: 1 },
        heat: { seekers: 1 },
        pressure: 1,
        flash:
          'She does not bargain with Cartel mouths or Stray empties. She keeps the Glint as evidence. You bought a hotter hour. You never left.',
      }),
    },
    {
      id: 'sybella-hold',
      label: 'Eat grit. Let the shadow pass.',
      sub: 'Sap and Seeker Heat. You stay.',
      tone: 'quiet',
      effects: stay(state, {
        sap: -1,
        heat: { seekers: 1 },
        pressure: 1,
        flash: 'The shadow lifts because you spent the hour badly. You did not walk. She still knows.',
      }),
    },
    {
      id: 'sybella-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay. She still counts the hour.',
      show: { slot: 'armor' },
      effects: stay(state, {
        pressure: 1,
        flash: 'Dust-cloth or hide. The skiff-shadow slides. Pressure keeps the receipt. You never left.',
      }),
    },
    {
      id: 'sybella-defy',
      label: 'Tell her you are not a battery',
      tone: 'danger',
      effects: stay(state, {
        heat: { seekers: 2 },
        pressure: 1,
        flash: 'She writes the refusal. The shadow leaves this ground. Seekers Heat does not.',
      }),
    },
    {
      id: 'sybella-swing',
      label: 'Swing at the shadow',
      sub: 'She is not a body. Health and Heat. You stay.',
      tone: 'danger',
      effects: stay(state, {
        health: -1,
        heat: { seekers: 2 },
        pressure: 1,
        flash: 'You hit grit. The lullaby notes the attempt. You are still here, poorer in blood.',
      }),
    },
    {
      id: 'sybella-smoke',
      label: 'Go to her smoke and face it',
      effects: {
        goto: 'maw:sybella',
        ticks: 1,
        unsetFlag: CLEAR,
        flash: 'You spend the walk. Whatever ground you left waits without you.',
      },
    },
  ]
}

export function pressureAppend(state: GameState): string | null {
  if (isSybellaOverlay(state)) return SYBELLA_SHADOW_APPEND
  if (isCampHunt(state)) return CAMP_HUNT_APPEND
  if (isSpineHunt(state)) return SPINE_HUNT_APPEND
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
  if (/\b(pay|bribe)\b/.test(hay)) return rows.find((c) => /scrap|glint|scrip|evidence/.test(c.id)) ?? null
  if (/\b(fight|attack|bite|kill|stab|swing)\b/.test(hay)) return rows.find((c) => /fight|swing/.test(c.id)) ?? null
  if (/\bcloak\b/.test(hay)) return rows.find((c) => c.id.includes('cloak')) ?? null
  if (/\b(hide|crouch|duck|grit)\b/.test(hay)) {
    if (state.equipped?.armor) {
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
