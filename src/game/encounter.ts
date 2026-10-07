import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { disguiseActive, equippedShell, equippedStrike } from './kit'
import { CARAPACE_HUNTER, SPINE_HUNTER } from './content/spineHunter'
import type { Choice, Effect, FlagMap, GameState, ItemId } from './types'
import { hash, OPENERS, sandAnswers, PAIR_LINE, HUSK_CONTROLLER_LINE, sandGripLine, TERRAINS, terrainPool, type Terrain, type TerrainId } from './fightTricks'

export type EncounterKind = 'jackal' | 'cutter' | 'tick' | 'pup' | 'scavenger' | 'patrol' | 'handler' | 'overseer' | 'collector' | 'carapace' | 'husk'

/** Fight hits. Sap stays thirst/travel. */
export const HEALTH_MAX = 6

type Spec = {
  kind: EncounterKind
  name: string
  strike: number
  shell: number
  hp: number
  line: string
}

const SPECS: Spec[] = [
  {
    kind: 'jackal',
    name: 'Dust-jackal',
    strike: 2,
    shell: 1,
    hp: 1,
    line: 'A dust-jackal blocks the grit — ribs like wire, eyes like spent Glints. It will take a hand or a skip.',
  },
  {
    kind: 'cutter',
    name: 'Rim cutter',
    strike: 3,
    shell: 2,
    hp: 2,
    line: 'A rim-cutter stands up out of scrap-shade. Half a person, half a stolen knife. Knife-smile. Saleable pockets. Optional throat.',
  },
  {
    kind: 'tick',
    name: 'Amber-tick',
    strike: 1,
    shell: 3,
    hp: 1,
    line: "An amber-tick clings to a rib of rock, fat with somebody else's Drop. You can crack it or leave it humming.",
  },
  {
    kind: 'pup',
    name: 'Shard-pup',
    strike: 4,
    shell: 2,
    hp: 2,
    line: 'A Shard-pup, already a jaw. Cartel leftovers. Fight or give the road.',
  },
  {
    kind: 'scavenger',
    name: 'Waste scavenger',
    strike: 2,
    shell: 1,
    hp: 2,
    line: 'A waste scavenger blocks the grit. A person who robs travelers who look alone. Stolen knife. Empty pockets. Optional throat.',
  },
  {
    kind: 'patrol',
    name: 'Vent patrol',
    strike: 2,
    shell: 0,
    hp: 1,
    line: 'Vent patrol. One clerk, shock baton, standing on the bolt. A short scrap. Then the vent, or not.',
  },
  {
    kind: 'handler',
    name: 'Hound-handler',
    strike: 3,
    shell: 2,
    hp: 2,
    line: 'The Hound-handler. Lean kit, shock-leash, an amber-eyed shard-hound at his heel with its eyes open. He is the fight. The hound stays on the leash.',
  },
  {
    kind: 'overseer',
    name: 'Overseer Valerius',
    strike: 4,
    shell: 3,
    hp: 3,
    line: 'Overseer Valerius. Bald, scarred, steam baton in the fist. He came himself.',
  },
  // Spine hunter fight. Copy and stats live in content/spineHunter.ts.
  { kind: 'collector', ...SPINE_HUNTER.encounter },
  { kind: 'carapace', ...CARAPACE_HUNTER.encounter },
  {
    kind: 'husk',
    name: 'Amber Husk',
    strike: 2,
    shell: 3,
    hp: 3,
    line: 'An Amber Husk. Calcified resin and bone, man-height and hunched, amber core under the rib cage. It keeps coming until the heart is shattered.',
  },
]

const TEACH = 'Fight or give the road. The rules: help fight.'

/** Every exchange that lands deals at least this much, both ways. */
export const DAMAGE_FLOOR = 1
/** Each side's swing is 0..SWING_MAX added to Strike, per exchange. */
export const SWING_MAX = 2
/** Rounds in a row with no damage either way before the enemy breaks off. */
export const STALL_ROUNDS = 3

function seed(state: GameState): number {
  let n = state.ticks * 11 + state.pressure * 5 + state.sap * 3
  for (const ch of state.sceneId) n += ch.charCodeAt(0)
  n += (state.items.scrap ?? 0) + (state.items.glints ?? 0) * 2
  return Math.abs(n)
}

/**
 * Swing for one side of one exchange: 0..SWING_MAX. Seeded from the road seed, the round, and the side,
 * so a save replays the same fight and tests stay fixed.
 */
export function swingOf(state: GameState, side: 'you' | 'them'): number {
  const round = Number(state.flags.encounterRound ?? 0)
  let h = (seed(state) * 2654435761 + round * 40503 + (side === 'you' ? 17 : 91)) >>> 0
  for (const ch of String(state.flags.encounterKind ?? '')) h = (Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0)
  h ^= h >>> 15
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 13
  return (h >>> 0) % (SWING_MAX + 1)
}

/** Damage one side deals in an exchange. A landed exchange never rounds down to nothing. */
export function exchangeDamage(strike: number, swing: number, shell: number, floor = DAMAGE_FLOOR): number {
  return Math.max(floor, strike + swing - shell)
}

export function encounterSpec(state: GameState): Spec {
  const kind = state.flags.encounterKind
  const named = SPECS.find((s) => s.kind === kind)
  if (named) return named
  return SPECS[seed(state) % SPECS.length]
}

export function turfFaction(state: GameState): 'cartel' | 'seekers' | 'strays' {
  const id = state.sceneId
  if (id.startsWith('spine:hound') || id === 'spine:valerius') return 'cartel'
  if (state.hubId === 'spine' || id.startsWith('spine:') || id.startsWith('ch1:o-')) return 'strays'
  if (state.hubId === 'threshold' || id.startsWith('thresh:') || id.startsWith('ch1:v-')) return 'seekers'
  if (state.hubId === 'redmaw' || id.startsWith('maw:')) return 'seekers'
  return 'cartel'
}

/** 0 safe (Skiff Bay), 3 common (Red Maw Approach and the first long road). */
export function hubDanger(state: GameState): number {
  const id = state.sceneId
  if (id.startsWith('camp:bay') || id === 'thresh:court' || id === 'spine:shade' || id === 'thresh:cell') return 0
  if (id === 'ch1:p-pipe' || id === 'ch1:o-noon' || id === 'ch1:v-hymn' || id === 'maw:rim' || id === 'maw:lip') return 3
  if (state.hubId === 'redmaw' || id.startsWith('maw:')) return 2
  if (id === 'camp:wire' || id === 'camp:guard' || id === 'spine:hound' || state.hubId === 'spine') return 2
  if (state.hubId === 'threshold') return 1
  return 1
}

export function encounterPercent(state: GameState, firstWalk: boolean): number {
  if (firstWalk) return 70
  const danger = hubDanger(state)
  const heat = state.heat[turfFaction(state)]
  let p = [8, 16, 30, 48][danger] ?? 16
  p += Math.max(0, heat - 1) * 5
  if (heat <= 2) p = Math.min(p, danger >= 3 ? 22 : 12)
  if (heat >= 6) p = Math.max(p, danger === 0 ? 18 : 42)
  return Math.min(72, p)
}

const ROAD_BEATS = new Set(['ch1:p-pipe', 'ch1:o-noon', 'ch1:v-hymn'])

/** Bunks, stalls, and the first room of a door. Fights live on roads and turf, not in the opening sentence. */
const HOME = new Set([
  'camp:cages',
  'camp:lean',
  'camp:jaxson',
  'camp:jaxson-cache',
  'camp:jaxson-drop',
  'camp:tower',
  'camp:valerius',
  'camp:shiv',
  'camp:relic',
  'spine:ridge',
  'spine:silas',
  'spine:tip',
  'thresh:court',
  'thresh:thalia',
])

export function encounterGround(state: GameState): boolean {
  if (state.sceneId.startsWith('open:') || state.sceneId.startsWith('crisis:')) return false
  if (HOME.has(state.sceneId)) return false
  const scene = getScene(state.sceneId)
  if (scene.kind === 'talk' || scene.kind === 'crisis' || scene.kind === 'ending') return false
  if (scene.kind === 'place') return true
  return ROAD_BEATS.has(state.sceneId)
}

export function pickEncounterKind(state: GameState): EncounterKind {
  const n = seed(state)
  const turf = turfFaction(state)
  // High Seeker Heat can field a husk on any road: Seekers walk husks beyond Spire ground.
  if (state.heat.seekers >= 5 && n % 5 === 0) return 'husk'
  if (turf === 'cartel') {
    const pool: EncounterKind[] = ['pup', 'pup', 'cutter', 'jackal', 'tick']
    return pool[n % pool.length]
  }
  if (turf === 'seekers') {
    const pool: EncounterKind[] =
      state.heat.seekers >= 3
        ? ['husk', 'husk', 'cutter', 'jackal', 'tick', 'scavenger']
        : ['cutter', 'cutter', 'jackal', 'tick', 'scavenger']
    return pool[n % pool.length]
  }
  const pool: EncounterKind[] = ['scavenger', 'scavenger', 'jackal', 'jackal', 'tick']
  return pool[n % pool.length]
}

/** Spire-adjacent and Vessel hymn ground: husks cling to stone like gargoyles. */
export function huskGround(state: GameState): boolean {
  const id = state.sceneId
  return (
    state.hubId === 'threshold' ||
    id.startsWith('thresh:') ||
    id.startsWith('ch1:v-') ||
    id.startsWith('maw:') ||
    state.hubId === 'redmaw'
  )
}

export function enemyHealth(kind: EncounterKind): number {
  return SPECS.find((s) => s.kind === kind)?.hp ?? 1
}

const ENCOUNTER_SCENES = new Set([
  'camp:yard',
  'camp:vents',
  'camp:wire',
  'camp:guard',
  'camp:bay',
  'spine:ridge',
  'spine:well',
  'spine:hound',
  'thresh:court',
  'thresh:paddock',
  'thresh:guard',
  'thresh:sift',
  'maw:rim',
  'maw:market',
  'maw:lip',
  'ch1:p-pipe',
  'ch1:o-noon',
  'ch1:v-hymn',
])

export function canEncounter(state: GameState, opts?: { traveled?: boolean; firstWalk?: boolean }): boolean {
  if (state.flags.hunterHere || state.flags.encounterHere || state.flags.downed) return false
  if ((state.health ?? 1) <= 0) return false
  if (!encounterGround(state)) return false
  const last = Number(state.flags.encounterAt ?? -99)
  const heat = state.heat[turfFaction(state)]
  const gap = heat >= 7 ? 2 : heat >= 4 ? 3 : 5
  if (last >= 0 && state.ticks - last < gap && !opts?.firstWalk) return false
  const firstWalk = !!opts?.firstWalk && !state.flags.roadFightSeen
  const percent = encounterPercent(state, firstWalk)
  return seed(state) % 100 < percent
}

export type Clash = {
  spec: Spec
  strike: number
  shell: number
  swingOut: number
  swingIn: number
  dmgOut: number
  dmgIn: number
  theirHp: number
  yourHp: number
}

export function clashOf(state: GameState, floor = DAMAGE_FLOOR): Clash {
  const spec = encounterSpec(state)
  const strike = equippedStrike(state)
  const shell = equippedShell(state)
  const swingOut = swingOf(state, 'you')
  const swingIn = swingOf(state, 'them')
  const dmgOut = exchangeDamage(strike, swingOut, spec.shell, floor)
  const dmgIn = exchangeDamage(spec.strike, swingIn, shell, floor)
  const theirNow = Number(state.flags.encounterHp ?? spec.hp)
  const healthMax = state.healthMax ?? HEALTH_MAX
  const yours = state.health ?? healthMax
  return {
    spec,
    strike,
    shell,
    swingOut,
    swingIn,
    dmgOut,
    dmgIn,
    theirHp: Math.max(0, theirNow),
    yourHp: Math.max(0, Math.min(healthMax, yours)),
  }
}

function compareLines(c: Clash): string {
  return `You Strike ${c.strike} vs their Shell ${c.spec.shell}\n\nTheir Strike ${c.spec.strike} vs your Shell ${c.shell}`
}


/** Fight ground, picked once when the fight opens. */
export function terrainOf(state: GameState): Terrain {
  const id = state.flags.encounterTerrain
  if (typeof id === 'string' && id in TERRAINS) return TERRAINS[id as TerrainId]
  return TERRAINS.open
}

function openerOf(state: GameState, spec: Spec): string {
  const list = OPENERS[spec.kind] ?? []
  const i = Number(state.flags.encounterOpen ?? 0)
  const line = list[i] || spec.line
  if (state.flags.encounterPair) return `${line} ${PAIR_LINE}`
  if (state.flags.encounterController) return `${line} ${HUSK_CONTROLLER_LINE}`
  return line
}

/** Encounter interrupt body only — never the place underneath. */
export function encounterCard(state: GameState): string {
  const clashText = state.flags.encounterClash
  if (typeof clashText === 'string' && clashText) return clashText
  const c = clashOf(state)
  const compares = compareLines(c)
  const head = `${openerOf(state, c.spec)}\n\n${terrainOf(state).line}`
  if (!state.flags.fightTaught) {
    return `${head}\n\n${compares}\n\n${TEACH}`
  }
  return `${head}\n\n${compares}`
}

export function encounterAppend(state: GameState): string {
  return encounterCard(state)
}

export function encounterChoices(state: GameState): Choice[] {
  if (isEncounterResult(state)) {
    const ventWon = state.sceneId === 'camp:sabotage' && state.flags.encounterKind === 'patrol' && !!state.flags.guardDown
    const base = dismissEncounter(state)
    return [
      {
        id: 'enc-continue',
        label: ventWon ? 'Bay. The bolt is open.' : 'On.',
        tone: 'quiet',
        effects: ventWon
          ? {
              ...base,
              goto: 'camp:bay',
              flash: 'The clerk is down. The vent screams. Shock Baton · Strike 4. Equip it. Jaxson is under a hull.',
            }
          : base,
      },
    ]
  }
  const spec = encounterSpec(state)
  const f = state.flags
  const runLock = f.encounterPinned
    ? 'The harpoon line has you. Land a hit first.'
    : f.encounterLatched
      ? 'The tick is on you. Pull it off first.'
      : ''
  const rows: Choice[] = [
    {
      id: 'enc-fight',
      label: `Fight ${whoOf(spec)}`,
      sub: f.encounterFeint ? 'Strike. Your feint is set: next hit +2.' : 'Strike vs Shell. Health takes the hits.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'fight', ticks: 1 },
    },
    {
      id: 'enc-guard',
      label: 'Guard',
      sub:
        spec.kind === 'overseer' || spec.kind === 'husk'
          ? 'No attack. Their hit is 1 lighter this round.'
          : 'No attack. Their hit is 2 lighter this round.',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'guard', ticks: 1 },
    },
    {
      id: 'enc-feint',
      label: 'Feint',
      sub: 'No attack. Their hit is 1 lighter, and your next Strike gets +2.',
      enable: { all: [{ healthMin: 1 }, { flagUnset: 'encounterFeint' }] },
      locked: 'Your feint is already set. Strike now.',
      effects: { resolveEncounter: 'feint', ticks: 1 },
    },
    {
      id: 'enc-trick',
      label: 'Throw sand in their eyes',
      sub:
        spec.kind === 'husk'
          ? 'Once a fight. No attack. A husk has no eyes: sand almost never works.'
          : 'Once a fight. No attack. 4 in 10: they miss this round and the next.',
      enable: { all: [{ healthMin: 1 }, { flagUnset: 'encounterTrickUsed' }] },
      locked: 'Already used this fight.',
      effects: { resolveEncounter: 'trick', ticks: 1 },
    },
    {
      id: 'enc-core',
      label: 'Aim for the core',
      sub: 'Once a fight. About half the time you crack the amber heart for a heavy blow. Otherwise you miss this exchange and they hit you.',
      show: { all: [{ flagEq: ['encounterKind', 'husk'] }, { flagUnset: 'encounterCoreTried' }] },
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'core', ticks: 1 },
    },
    {
      id: 'enc-seeker',
      label: 'Cut the Seeker down',
      sub: 'No hit on the husk. Often you drop the Seeker and stop the extractor. The husk still hits you this exchange.',
      show: {
        all: [
          { flagEq: ['encounterKind', 'husk'] },
          { flag: 'encounterController' },
          { flagUnset: 'encounterControllerDown' },
        ],
      },
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'seeker', ticks: 1 },
    },
    {
      id: 'enc-resin',
      label: 'Draw resin',
      sub:
        state.flags.encounterController && !state.flags.encounterControllerDown
          ? 'Seeker Extractor. Once a fight. Cut the siphon filament so the husk cannot be re-charged. No hit on the husk; it still hits you.'
          : 'Seeker Extractor. Once a fight. Draw resin under the plates: scrap +1, Sap +1. The core stays lit. The husk still hits you.',
      show: {
        all: [
          { flagEq: ['encounterKind', 'husk'] },
          { equipped: 'seeker_extractor' },
          { flagUnset: 'encounterResinTried' },
        ],
      },
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'resin', ticks: 1 },
    },
    {
      id: 'enc-pull',
      label: 'Pull the tick off',
      sub: state.equipped?.hands === 'hide_gloves' ? 'Stops the Sap drain. The Hide Gloves let you strike in the same exchange.' : 'No attack. Stops the Sap drain.',
      show: { flag: 'encounterLatched' },
      effects: { resolveEncounter: 'pull', ticks: 1 },
    },
    {
      id: 'enc-deal',
      label: spec.kind === 'collector' ? 'Call it square' : 'Take the scrap and let it go',
      sub: spec.kind === 'collector' ? 'The fight ends. Stray Heat cools by 1. No loot.' : 'The fight ends. Scrap +1. No more hits.',
      show: { flag: 'encounterOffer' },
      effects: { resolveEncounter: 'deal', ticks: 1 },
    },
    {
      id: 'enc-run',
      label: 'Run',
      sub: `${runChance(state)} in 100 you get away, no loot. If not, they hit you.`,
      enable: runLock ? { flag: '__never__' } : { healthMin: 1 },
      locked: runLock || 'Too hurt to fight.',
      effects: { resolveEncounter: 'run', ticks: 1 },
    },
    {
      id: 'enc-skip',
      label: 'Give the road. No loot.',
      tone: 'quiet',
      show: { flagUnset: 'encounterRound' },
      effects: { resolveEncounter: 'skip' },
    },
    {
      id: 'enc-cloak',
      label: 'Let the cloak eat the glance. Skip.',
      show: { all: [{ any: [{ slot: 'armor' }, { slot: 'cloak' }] }, { flagUnset: 'encounterRound' }] },
      effects: { resolveEncounter: 'skip' },
    },
  ]
  if (disguiseCheck(state, spec.kind)) {
    rows.push({
      id: 'enc-disguise',
      label: 'Walk past in the Vessel cloth',
      sub: '3 in 4 they read a cup and let you by. No loot. If they look closely, the cloth is seen through and Cartel Heat rises by 2.',
      effects: { resolveEncounter: 'disguise', ticks: 1 },
    })
  }
  return rows.filter((c) => check(c.show, state))
}

/** Cartel people on the road. The vent clerk at the sabotage stays a fight. */
const CARTEL_KINDS: EncounterKind[] = ['patrol', 'handler', 'overseer']

function disguiseCheck(state: GameState, kind: EncounterKind): boolean {
  return disguiseActive(state) && CARTEL_KINDS.includes(kind) && state.sceneId !== 'camp:sabotage' && !state.flags.encounterRound
}

/** Percent chance a Run gets away. */
export function runChance(state: GameState): number {
  const spec = encounterSpec(state)
  let p = 60 + terrainOf(state).run
  if (spec.kind === 'handler') p -= 20
  if (state.flags.encounterPair && Number(state.flags.encounterHp ?? 0) >= 2) p -= 10
  if (state.equipped?.legs === 'shin_wraps') p += 10
  return Math.max(10, Math.min(90, p))
}

export function encounterSpeaker(state: GameState): string {
  return encounterSpec(state).name
}

/** Same road seed as who showed up, shifted so the pocket is its own bucket. */
function pocket(state: GameState): number {
  return Math.abs(seed(state) * 17 + 9) % 10
}

/**
 * Junk a body can actually carry. Shop and quest steel stay on their shelves.
 * Fauna pay scrap or sap. People sometimes pay with a knife, a scav wrap, or a cloak.
 */
/** People carry salve sometimes. Beasts never do. */
export const HUMAN_KINDS: readonly EncounterKind[] = ['cutter', 'scavenger', 'patrol', 'handler', 'overseer', 'collector', 'carapace']
export const BEAST_KINDS: readonly EncounterKind[] = ['jackal', 'tick', 'pup']
/** Percent chance a downed human also carries a Resin Salve. */
export const HUMAN_SALVE_PCT = 18

/** Its own bucket off the road seed, so the rest of the pocket does not shift. */
export function carriesSalve(state: GameState, kind: EncounterKind): boolean {
  if (!HUMAN_KINDS.includes(kind)) return false
  let h = (Math.imul(seed(state) + 0x27d4eb2f, 374761393) + 668265263) >>> 0
  for (const ch of kind) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 16
  return (h >>> 0) % 100 < HUMAN_SALVE_PCT
}

/** First extractor: 1 in 8. Already owned: 1 in 40. Only when a Seeker walked the husk. */
export const EXTRACTOR_DROP_IN = 8
export const EXTRACTOR_DUPE_IN = 40

export function extractorDrop(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  if (kind !== 'husk' || !state.flags.encounterController) return {}
  const owned = (state.items.seeker_extractor ?? 0) > 0
  const every = owned ? EXTRACTOR_DUPE_IN : EXTRACTOR_DROP_IN
  let h = (Math.imul(seed(state) + 0x51eed, 374761393) + 668265263) >>> 0
  for (const ch of `ex:${kind}:${state.ticks}`) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 3266489917) >>> 0
  if ((h >>> 0) % every !== 0) return {}
  return { seeker_extractor: 1 }
}

function lootFor(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  const add = { ...pocketLoot(state, kind), ...extractorDrop(state, kind) }
  if (carriesSalve(state, kind)) add.salve = (add.salve ?? 0) + 1
  return add
}

function pocketLoot(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  if (kind === 'jackal') return { scrap: 2 }
  if (kind === 'tick') return { vial_drop: 1 }
  if (kind === 'pup') return { glints: 1, scrap: 1 }
  if (kind === 'husk') {
    const roll = pocket(state)
    // Resin scrap from the plates; sometimes a Drop from the core. Never salve, never gear.
    if (roll <= 3) return { scrap: 2 }
    if (roll <= 6) return { scrap: 1, vial_drop: 1 }
    return { scrap: 1 }
  }
  const roll = pocket(state)
  if (kind === 'cutter') {
    if (roll === 0 || roll === 1) return { scrap: 1, shiv: 1 }
    if (roll === 2) return { glints: 1, scrap: 1, rusted_dagger: 1 }
    return { glints: 1, scrap: 1 }
  }
  if (roll <= 1) return { scrap: 1, shiv: 1 }
  if (roll === 2) return { scrap: 1, rusted_dagger: 1 }
  if (roll === 3) return { scrap: 1, scav_wrap: 1 }
  if (roll === 4) return { shiv: 1, dust_cloak: 1 }
  return { glints: 1, scrap: 1 }
}

function lootLine(add: Partial<Record<ItemId, number>>): string {
  const pockets: string[] = []
  const gear: string[] = []
  for (const id of Object.keys(add) as ItemId[]) {
    const n = add[id] ?? 0
    if (n <= 0) continue
    const item = ITEMS[id]
    const name = item?.name ?? id
    const bit = `${name} +${n}`
    if (item?.slot) gear.push(name)
    else pockets.push(bit)
  }
  const held = pockets.join(', ')
  const worn = gear.join(', ')
  if (held && worn) return `${held}. On the body: ${worn}`
  if (worn) return `On the body: ${worn}`
  return held
}

export const ENCOUNTER_FLAGS = [
  'encounterHere',
  'encounterKind',
  'encounterHp',
  'encounterClash',
  'encounterDone',
  'encounterFlash',
  'encounterRound',
  'encounterStall',
  'encounterTerrain',
  'encounterOpen',
  'encounterPair',
  'encounterController',
  'encounterControllerDown',
  'encounterHuskRevived',
  'encounterCoreTried',
  'encounterResinTried',
  'encounterLatched',
  'encounterFeint',
  'encounterStun',
  'encounterShocked',
  'encounterPinned',
  'encounterSnatch',
  'encounterSnatchTried',
  'encounterFleeing',
  'encounterFleeShown',
  'encounterOffer',
  'encounterOfferShown',
  'encounterTrickUsed',
  'encounterGrip',
] as const

export function isEncounterResult(state: Pick<GameState, 'flags'>): boolean {
  return !!state.flags.encounterHere && !!state.flags.encounterDone
}

export function dismissEncounter(state: GameState): Effect {
  const short = typeof state.flags.encounterFlash === 'string' ? state.flags.encounterFlash : undefined
  return {
    unsetFlag: [...ENCOUNTER_FLAGS],
    flag: { encounterAt: state.ticks, fightTaught: true },
    flash: short,
  }
}

function holdCard(state: GameState, spec: Spec, card: string, short: string, extra: Effect = {}): { fx: Effect; flash: string } {
  return {
    fx: {
      ...extra,
      flag: {
        ...(extra.flag ?? {}),
        encounterHere: true,
        encounterKind: spec.kind,
        encounterDone: true,
        encounterClash: card,
        encounterFlash: short,
        fightTaught: true,
        encounterAt: state.ticks,
      },
    },
    flash: '',
  }
}

export type FightMove = 'fight' | 'guard' | 'feint' | 'trick' | 'run' | 'pull' | 'deal' | 'core' | 'seeker' | 'resin'

/** 1 in 10 landed hits, both sides. The Shard-pup lands them twice as often. */
export const CRIT_IN_10 = 1

/** Seeded 0..n-1 roll for this round, so a save replays the same fight. */
function roll(state: GameState, salt: string, n: number): number {
  return hash(state, `${salt}:${state.flags.encounterKind ?? ''}`, Number(state.flags.encounterRound ?? 0) + 1) % n
}

/** Named people: no "the" in front. */
const PROPER_KINDS: EncounterKind[] = ['overseer', 'carapace']

function whoOf(spec: Spec): string {
  return PROPER_KINDS.includes(spec.kind) ? spec.name : `the ${spec.name}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** What a scavenger or jackal grabs. Jackals only take scrap. Worn gear is never grabbed. */
function grabbable(state: GameState, kind: EncounterKind): ItemId | null {
  const order: ItemId[] = kind === 'jackal' ? ['scrap'] : ['glints', 'vial_drop', 'salve', 'scrap']
  for (const id of order) if ((state.items[id] ?? 0) > 0) return id
  return null
}

/**
 * The one fight resolver for every door and every fight. `floor` exists for tests of the stall valve;
 * the game always plays with DAMAGE_FLOOR.
 */
export function resolveEncounter(
  state: GameState,
  how: FightMove | 'skip' | 'disguise',
  opts: { floor?: number } = {},
): { fx: Effect; flash: string } {
  const spec = encounterSpec(state)
  const f = state.flags
  const who = whoOf(spec)
  if (how === 'disguise') {
    if (roll(state, 'disguise', 4) > 0) {
      const line = `${cap(who)} sees the gold thread and steps aside for a Vessel. You walk past. No loot.`
      return holdCard(state, spec, line, line)
    }
    const line = `${cap(who)} looks at the cloth, then at your hands and your boots. "That is no Vessel." The cloth will not fool the Cartel again. Cartel Heat rises by 2.`
    return {
      fx: {
        heat: { cartel: 2 },
        flag: { encounterRound: 1, encounterAt: state.ticks, disguiseBlown: true, cartelNotice: true, encounterClash: `${line}\n\n${encounterCard({ ...state, flags: { ...f, encounterClash: '' } })}` },
      },
      flash: '',
    }
  }
  if (how === 'skip') {
    const line = `You give ${whoOf(spec)} the road. No loot. No bill.`
    return holdCard(state, spec, line, line)
  }
  const snatched = typeof f.encounterSnatch === 'string' && f.encounterSnatch ? (f.encounterSnatch as ItemId) : null
  if (how === 'deal' && f.encounterOffer) {
    if (spec.kind === 'collector') {
      const line = 'The collector puts the knife away. "Square," he says, and walks back down-slope. Stray Heat cools by 1. No loot.'
      return holdCard(state, spec, line, line, { heat: { strays: -1 } })
    }
    const line = `${cap(who)} drops a twist of scrap and backs away into the grit. Scrap +1. No more hits.`
    return holdCard(state, spec, line, line, { add: { scrap: 1 } })
  }
  const move: FightMove = how === 'deal' ? 'fight' : how

  const floor = opts.floor ?? DAMAGE_FLOOR
  const c = clashOf(state, floor)
  const ground = terrainOf(state)
  const round = Number(f.encounterRound ?? 0) + 1
  const max = state.healthMax ?? HEALTH_MAX
  const notes: string[] = []
  // Hide Gloves: pull the tick and strike in the same exchange. Aim for the core is an attack that can miss.
  const attacking =
    move === 'fight' ||
    move === 'core' ||
    (move === 'pull' && !!f.encounterLatched && state.equipped?.hands === 'hide_gloves')

  // Swings after ground, feint, and a numb arm. Named extras go in brackets on the hit lines (no maths).
  let swingOut = c.swingOut
  let swingIn = c.swingIn
  const outTags: string[] = []
  const inTags: string[] = []
  if (attacking && f.encounterShocked) {
    swingOut = 0
    outTags.push('numb arm')
  } else if (attacking && f.encounterFeint) {
    swingOut += 2
    outTags.push('feint +2')
  }
  const outRaw = swingOut
  const inRaw = swingIn
  swingOut = Math.max(0, swingOut + ground.you)
  swingIn = Math.max(0, swingIn + ground.them)
  if (attacking && swingOut > outRaw) outTags.push(`high ground +${swingOut - outRaw}`)
  if (attacking && swingOut < outRaw) outTags.push(`loose sand −${outRaw - swingOut}`)
  if (swingIn < inRaw) inTags.push(`sun in their eyes −${inRaw - swingIn}`)
  if (ground.cap != null) {
    const o = swingOut
    const i = swingIn
    swingOut = Math.min(ground.cap, swingOut)
    swingIn = Math.min(ground.cap, swingIn)
    if (attacking && swingOut < o) outTags.push('blowing sand')
    if (swingIn < i) inTags.push('blowing sand')
  }
  let theirStrike = Math.max(0, spec.strike + ground.strike)
  if (theirStrike < spec.strike) inTags.push(`steam vent −${spec.strike - theirStrike}`)
  let pinned = !!f.encounterPinned
  if (spec.kind === 'carapace' && round === 1) {
    theirStrike += 1
    pinned = true
    inTags.push('harpoon +1')
    notes.push('The harpoon line pins you. No running until you land a hit.')
  }

  let dmgOut = attacking ? exchangeDamage(c.strike, swingOut, spec.shell, floor) : 0
  let dmgIn = exchangeDamage(theirStrike, swingIn, c.shell, floor)

  let critOut = false
  if (attacking && dmgOut > 0 && roll(state, 'critYou', 10) < CRIT_IN_10) {
    dmgOut *= 2
    critOut = true
  }
  // dmgInPlain: the same hit without the crit, for the plain hit line above the crit line.
  let dmgInPlain = dmgIn
  let critIn = false
  const critOdds = spec.kind === 'pup' ? CRIT_IN_10 * 2 : CRIT_IN_10
  if (dmgIn > 0 && roll(state, 'critThem', 10) < critOdds) {
    dmgIn *= 2
    // A crit never takes you from full Health to Down in one exchange.
    if (c.yourHp >= max) dmgIn = Math.min(dmgIn, max - 1)
    critIn = true
  }
  const hitIn = (fn: (d: number) => number) => {
    dmgIn = fn(dmgIn)
    dmgInPlain = fn(dmgInPlain)
  }
  if (f.encounterPair && c.theirHp >= 2) {
    hitIn((d) => d + 1)
    inTags.push('second jackal +1')
  }
  let stunNext = false
  if (f.encounterStun) hitIn(() => 0)

  let feintNext = false
  let trickUsed = !!f.encounterTrickUsed
  let latched = !!f.encounterLatched
  let coreTried = !!f.encounterCoreTried
  let controllerDown = !!f.encounterControllerDown
  let huskRevived = !!f.encounterHuskRevived
  if (move === 'core') {
    coreTried = true
    if (roll(state, 'core', 10) < 5) {
      dmgOut *= 2
      outTags.push('cracked the core ×2')
    } else {
      dmgOut = 0
      critOut = false
      notes.push('You aim for the amber heart and miss. The plates turn the blow.')
    }
  }
  if (move === 'seeker') {
    dmgOut = 0
    if (roll(state, 'seeker', 10) < 6) {
      controllerDown = true
      notes.push('You cut the Seeker down. The extractor blade drops. The husk cannot be re-charged.')
    } else {
      notes.push('The Seeker slips behind the husk. The extractor stays live.')
    }
  }
  let resinTried = !!f.encounterResinTried
  let resinLoot: Partial<Record<ItemId, number>> | undefined
  let resinSap = 0
  if (move === 'resin') {
    resinTried = true
    dmgOut = 0
    if (f.encounterController && !controllerDown) {
      controllerDown = true
      notes.push('You slide the Seeker Extractor under a plate and cut the siphon filament. The Seeker loses the line. The husk cannot be re-charged.')
    } else {
      resinLoot = { scrap: 1 }
      resinSap = 1
      notes.push('You draw living heat under the plates. Resin liquefies without cracking the core. Scrap +1. Sap +1. The husk still stands.')
    }
  }
  if (move === 'guard') {
    const cut = spec.kind === 'overseer' || spec.kind === 'husk' ? 1 : 2
    hitIn((d) => Math.max(0, d - cut))
    inTags.push(`guard −${cut}`)
    notes.push('You guard.')
  } else if (move === 'feint') {
    hitIn((d) => Math.max(0, d - 1))
    feintNext = true
    inTags.push('feint −1')
    notes.push('You feint and slip back. Your next hit gets +2.')
  } else if (move === 'trick') {
    trickUsed = true
    const odds = spec.kind === 'husk' ? 1 : 4
    if (roll(state, 'trick', 10) < odds) {
      hitIn(() => 0)
      stunNext = true
      notes.push(
        spec.kind === 'husk'
          ? 'Your sand fouls a joint. The husk misses this round and the next.'
          : `You throw sand in ${who}'s eyes. They miss this round and the next.`,
      )
    } else {
      notes.push(spec.kind === 'husk' ? 'You throw sand. The husk has no eyes.' : `You throw sand. ${cap(who)} turns away.`)
    }
  } else if (move === 'pull' && latched) {
    latched = false
    notes.push('You tear the tick off your arm. The Sap drain stops.')
  } else if (move === 'run') {
    if (pinned || latched) {
      notes.push(pinned ? 'The harpoon line holds you. You cannot run.' : 'The tick holds on. You cannot run with it on you.')
    } else if (roll(state, 'run', 100) < runChance(state)) {
      const line = `You break away and run. ${cap(who)} does not follow. No loot.`
      return holdCard(state, spec, line, line)
    } else {
      notes.push(`You try to run. ${cap(who)} catches you.`)
      if (spec.kind === 'handler') {
        hitIn((d) => d + 1)
        inTags.push('hound bite +1')
      }
    }
  }

  // Outcast only, once a fight: when it is going badly, the sand takes the hit for him. Never explained.
  let grip = !!f.encounterGrip
  if (sandAnswers(state) && !grip && c.yourHp <= 2 && dmgIn > 0 && roll(state, 'grip', 10) < 6) {
    hitIn(() => 0)
    grip = true
    notes.push(sandGripLine(spec.name, BEAST_KINDS.includes(spec.kind), roll(state, 'gripForm', 2) ? 'mirage' : 'slide', PROPER_KINDS.includes(spec.kind)))
  }

  const sapLoss = latched && move !== 'pull' && f.encounterLatched ? 1 : 0
  if (sapLoss) notes.push('The tick drinks. Sap -1.')

  let theirHp = Math.max(0, c.theirHp - dmgOut)
  const yourHp = Math.max(0, c.yourHp - dmgIn)
  const healthDelta = yourHp - c.yourHp
  if (dmgOut > 0) pinned = false
  if (f.encounterPair && c.theirHp >= 2 && theirHp === 1) notes.push('One jackal drops. The other keeps coming.')
  // Seeker extractor: once per fight, re-charge the husk unless the Seeker is already down.
  if (
    theirHp <= 0 &&
    spec.kind === 'husk' &&
    f.encounterController &&
    !controllerDown &&
    !huskRevived
  ) {
    theirHp = 2
    huskRevived = true
    notes.push('The Seeker drives the extractor into a plate. Resin floods the core. The husk stands again, Health 2.')
  }

  // Plain result lines: who hit whom for how much. Named extras in brackets; a crit gets its own line.
  const tags = (t: string[]) => (t.length ? ` (${t.join(', ')})` : '')
  const critLine = (n: number) => `\n\nCritical Strike! ${n}`
  const youLine = !attacking
    ? 'You do not attack this round.'
    : dmgOut <= 0
      ? `You miss ${who}${tags(outTags)}.`
      : `You hit ${who} for ${critOut ? dmgOut / 2 : dmgOut}${tags(outTags)}.${critOut ? critLine(dmgOut) : ''}`
  const themLine = f.encounterStun
    ? `${cap(who)} misses (sand in the eyes).`
    : dmgIn <= 0
      ? `${cap(who)} misses you${tags(inTags)}.`
      : critIn && dmgIn > dmgInPlain
        ? `${cap(who)} hits you for ${dmgInPlain}${tags(inTags)}.${critLine(dmgIn)}`
        : `${cap(who)} hits you for ${dmgIn}${tags(inTags)}.`
  const hitCard = `${youLine}\n\n${themLine}${notes.length ? `\n\n${notes.join(' ')}` : ''}`
  const sap = sapLoss ? -sapLoss : undefined

  if (theirHp <= 0 && spec.kind === 'patrol') {
    const stagger = yourHp <= 0
    const outcome = stagger
      ? `The clerk drops. You drop with them. Scrap. Shock Baton. Health 0/${max}. The bolt is still yours.`
      : 'The clerk drops. Scrap. Shock Baton. The bolt is open.'
    const salve = carriesSalve(state, 'patrol')
    const said = salve ? `${outcome} A Resin Salve in his belt pouch.` : outcome
    return holdCard(state, spec, `${hitCard}\n\n${said}`, said, {
      health: stagger ? -c.yourHp : healthDelta,
      add: salve ? { scrap: 1, salve: 1 } : { scrap: 1 },
      heat: { cartel: 1 },
      pressure: 1,
      sap,
      flag: { guardDown: true, ventLoot: true, encounterGrip: grip },
    })
  }

  if (theirHp <= 0) {
    const add = lootFor(state, spec.kind)
    if (snatched) add[snatched] = (add[snatched] ?? 0) + 1
    const loot = lootLine(add)
    const back = snatched ? ` You take back your ${ITEMS[snatched]?.name ?? snatched}.` : ''
    const stagger = yourHp <= 0
    const huskWin = spec.kind === 'husk'
    const outcome = stagger
      ? huskWin
        ? `The amber heart shatters. You drop with it. ${loot}. Health 0/${max}.${back}`
        : `They drop. You drop with them. ${loot}. Health 0/${max}.${back}`
      : huskWin
        ? `The amber heart shatters. The husk falls still. ${loot}.${back}`
        : `They drop. ${loot}.${back}`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: stagger ? -c.yourHp : healthDelta,
      add,
      sap,
      pressure: dmgIn > 0 ? 1 : undefined,
      flag: { encounterGrip: grip },
    })
  }

  if (yourHp <= 0) {
    const outcome = `You drop. No loot. Health 0/${max}. Too hurt to fight.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: -c.yourHp,
      sap,
      pressure: 2,
    })
  }

  // A grab or a limp from last round: still standing means they got away.
  if (snatched) {
    const outcome = `${cap(who)} gets away with your ${ITEMS[snatched]?.name ?? snatched}. No loot.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, { health: healthDelta, sap })
  }
  if (f.encounterFleeing) {
    const outcome = `${cap(who)} gets back into the scrap-shade. No loot.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, { health: healthDelta, sap })
  }

  // Only plain exchanges count toward a stall, so guarding cannot wait an enemy out.
  const stall = attacking && dmgOut === 0 && dmgIn === 0 && !sapLoss ? Number(f.encounterStall ?? 0) + 1 : 0
  if (stall >= STALL_ROUNDS) {
    const outcome = `${cap(who)} backs off and leaves the road. No loot.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, { health: healthDelta, sap })
  }

  // New tricks for next round.
  const events: string[] = []
  const flag: FlagMap = {
    encounterHere: true,
    encounterKind: spec.kind,
    encounterHp: theirHp,
    encounterRound: round,
    encounterStall: stall,
    fightTaught: true,
    encounterAt: state.ticks,
    encounterFeint: feintNext,
    encounterStun: stunNext,
    encounterShocked: false,
    encounterPinned: pinned,
    encounterLatched: latched,
    encounterTrickUsed: trickUsed,
    encounterGrip: grip,
    encounterCoreTried: coreTried,
    encounterResinTried: resinTried,
    encounterControllerDown: controllerDown,
    encounterHuskRevived: huskRevived,
    encounterController: !!f.encounterController,
  }
  const remove: Partial<Record<ItemId, number>> = {}
  if (spec.kind === 'tick' && !latched && move !== 'pull' && dmgIn > 0) {
    flag.encounterLatched = true
    events.push('The tick latches onto your arm. It drinks 1 Sap every round until you pull it off or kill it.')
  }
  if ((spec.kind === 'scavenger' || spec.kind === 'jackal') && !f.encounterSnatchTried && dmgIn > 0) {
    const grab = grabbable(state, spec.kind)
    if (grab) {
      flag.encounterSnatch = grab
      flag.encounterSnatchTried = true
      remove[grab] = 1
      const name = ITEMS[grab]?.name ?? grab
      events.push(
        spec.kind === 'jackal'
          ? `The jackal snaps up a twist of your ${name} and turns to bolt. Kill it this round or the ${name} is gone.`
          : `${cap(who)} grabs your ${name} and backs off. Drop them this round or it is gone.`,
      )
    }
  }
  if (spec.kind === 'patrol' && dmgIn > 0 && roll(state, 'shock', 4) === 0) {
    flag.encounterShocked = true
    events.push('The baton shocks your arm numb. Your next swing is 0.')
  }
  if (theirHp === 1 && !flag.encounterSnatch) {
    if ((spec.kind === 'scavenger' || spec.kind === 'collector') && !f.encounterOfferShown) {
      flag.encounterOffer = true
      flag.encounterOfferShown = true
      events.push(
        spec.kind === 'collector'
          ? 'The collector lowers the knife. "Call it square," he says. "You walk, I walk, and the Spine forgets a little."'
          : 'The scavenger holds up a twist of scrap. It will drop it and go if you let it.',
      )
    }
    if (spec.kind === 'cutter' && !f.encounterFleeShown) {
      flag.encounterFleeing = true
      flag.encounterFleeShown = true
      events.push('The rim cutter limps back toward the scrap-shade. Hit it this round or it gets away.')
    }
  }

  const tail = events.length ? `\n\n${events.join(' ')}` : ''
  const standing = `${hitCard}${tail}\n\nThey still stand. Their Health ${theirHp}/${f.encounterPair ? 2 : Math.max(spec.hp, c.theirHp)}. Yours ${yourHp}/${max}. No loot yet.`
  flag.encounterClash = standing
  const sapTotal = (sap ?? 0) + resinSap
  return {
    fx: {
      health: healthDelta,
      sap: sapTotal || undefined,
      add: resinLoot,
      remove: Object.keys(remove).length ? remove : undefined,
      ticks: 0,
      flag,
    },
    flash: '',
  }
}

export function wantsEncounterFight(text: string): boolean {
  return /\b(fight|attack|bite|kill|stab|hit|punch|cut|strike|engage)\b/i.test(text)
}

export function wantsEncounterHide(text: string): boolean {
  return /\b(hide|cloak|crouch|duck|conceal)\b/i.test(text)
}

export function wantsEncounterGuard(text: string): boolean {
  return /\b(guard|block|parry|defend|brace)\b/i.test(text)
}

export function wantsEncounterFeint(text: string): boolean {
  return /\b(feint|fake|dodge)\b/i.test(text)
}

export function wantsEncounterTrick(text: string): boolean {
  return /\b(sand|dirt|dust in|throw|trick|blind)\b/i.test(text)
}

export function wantsEncounterPull(text: string): boolean {
  return /\b(pull|rip|tear|peel)\b/i.test(text)
}

export function wantsEncounterDeal(text: string): boolean {
  return /\b(deal|square|accept|let it go|let him go|take the scrap|bargain)\b/i.test(text)
}

export function wantsEncounterRun(text: string): boolean {
  return /\b(run|flee|escape|bolt)\b/i.test(text)
}

export function wantsEncounterSkip(text: string): boolean {
  return /\b(skip|leave|run|flee|walk|pass|ignore|back|go)\b/i.test(text)
}

export function roadPressureScene(sceneId: string): boolean {
  return ENCOUNTER_SCENES.has(sceneId) || sceneId.startsWith('maw:') || sceneId.startsWith('ch1:')
}

/** Per-fight state set when a fight opens: ground, opener, and a jackal pair. */
export function fightStartFlags(state: GameState, kind: EncounterKind): FlagMap {
  const pool = terrainPool(state)
  const terrain = pool[hash(state, `ground:${kind}`) % pool.length]
  const open = hash(state, `open:${kind}`) % 3
  const pair = kind === 'jackal' && hash(state, 'pair') % 10 < 4
  // Near Spire stone a husk often wakes alone. Elsewhere, or at higher Seeker Heat, a Seeker walks it.
  let controller = false
  if (kind === 'husk') {
    const roll = hash(state, 'huskCtrl') % 10
    if (huskGround(state) && state.heat.seekers < 5) controller = roll < 4
    else controller = roll < 7
  }
  return {
    encounterHere: true,
    encounterKind: kind,
    encounterHp: pair ? 2 : enemyHealth(kind),
    encounterAt: state.ticks,
    encounterTerrain: terrain,
    encounterOpen: open,
    encounterPair: pair,
    encounterController: controller,
  }
}

/** Every per-fight flag except the ones a new fight sets. */
export const FIGHT_RESET = ENCOUNTER_FLAGS.filter(
  (k) =>
    !['encounterHere', 'encounterKind', 'encounterHp', 'encounterTerrain', 'encounterOpen', 'encounterPair', 'encounterController'].includes(
      k,
    ),
)

/** Open a road fight on the current ground. Strike vs Shell stays in the encounter card. */
export function beginEncounter(state: GameState, kind?: EncounterKind, flash?: string): Effect {
  const k = kind ?? pickEncounterKind(state)
  return {
    unsetFlag: ['hunterHere', 'hunterFrom', ...FIGHT_RESET],
    flag: fightStartFlags(state, k),
    ticks: 1,
    flash: flash ?? 'The road answers.',
  }
}

export function healthLabel(n: number): string {
  if (n <= 0) return 'Down'
  if (n <= 2) return 'Hurt'
  if (n <= 4) return 'Holding'
  return 'Steady'
}
