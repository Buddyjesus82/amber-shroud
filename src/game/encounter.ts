import { STRAY_HUNTER_ENCOUNTERS } from './strayLines'
import { MASKED_BLOCK_LINE, MASKED_ROUNDS, MASKED_STRIKE_LINE, MASKED_WALKS_OFF_LINE } from './maskedLines'
import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { disguiseActive, equippedShell, equippedStrike, wearsCloth } from './kit'
import { CARAPACE_HUNTER, SPINE_HUNTER } from './content/spineHunter'
import type { Choice, Effect, FlagMap, GameState, ItemId } from './types'
import { hash, OPENERS, sandAnswers, PAIR_LINE, HUSK_CONTROLLER_LINE, sandGripLine, TERRAINS, terrainPool, type Terrain, type TerrainId } from './fightTricks'

export type EncounterKind = 'jackal' | 'cutter' | 'courtguard' | 'tick' | 'pup' | 'scavenger' | 'patrol' | 'handler' | 'hound' | 'overseer' | 'collector' | 'carapace' | 'husk' | 'runner' | 'strayhunter' | 'strayhound' | 'masked' | 'ribworm' | 'greg' | 'dragoon' | 'seekerpatrol' | 'drilllead' | 'leech' | 'moth'

export const RIBWORM_LINE = 'The dune breathes. A rib-worm noses up through the sand, ringed like an old spine, mouth all grit and grinding plates.'
export const RIBWORM_WIN = 'It sinks and does not come back up. The sand settles over it.'
/** v160: round 1, your first swing hits half as hard: it is still under the sand. */
export const RIBWORM_BURROW_LINE = 'Burrowed: your first hit does half damage.'
/** Stray ground: odds in 7 that a stray-pool fight is a rib-worm (weight 1 beside the six others). */
export const RIBWORM_IN_7 = 1
// v172: Jodi's drafts A and C (approved).
export const LEECH_LINE = 'Something slick uncoils from the vat rim. A vat-leech, fat on resin and the blood that drips with it. It wants what is in your veins.'
export const LEECH_WIN = "It bursts like a blister. Resin and someone's blood."
export const MOTH_LINE = 'Resin wings open on the stone, gold and thin as a hymn sheet. A hymn-moth. The air hums the chant you were trying to forget.'
export const MOTH_WIN = 'The wings crack like old varnish. The humming stops.'
/** Blood Yard and Vat Seam: the leech's weight beside the five Cartel-ground kinds. */
export const LEECH_WEIGHT = 2
export const LEECH_GROUND: readonly string[] = ['camp:yard', 'camp:vats']
/** Seeker ground: the moth's weight beside the Seeker pool. */
export const MOTH_WEIGHT = 1

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
  // The masked figure: he cannot be killed. A fight with him always ends with him walking off.
  { kind: 'masked', name: 'Masked Figure', strike: 1, shell: 3, hp: 3, line: MASKED_BLOCK_LINE },
  // v160: the rib-worm. Spine and Cache Run stray ground. A mini-boss: it burrows (your first swing is halved) and always leaves its mouth-plate.
  { kind: 'ribworm', name: 'Rib-worm', strike: 4, shell: 2, hp: 5, line: RIBWORM_LINE },
  // v172: Drinks: each hit it lands also takes 1 Sap.
  { kind: 'leech', name: 'Vat-leech', strike: 2, shell: 1, hp: 3, line: LEECH_LINE },
  // v172: Lull: its hits take Sap, not Health. The cloth halves it.
  { kind: 'moth', name: 'Hymn-moth', strike: 2, shell: 0, hp: 3, line: MOTH_LINE },
  { kind: 'strayhunter', ...STRAY_HUNTER_ENCOUNTERS.strayhunter },
  { kind: 'strayhound', ...STRAY_HUNTER_ENCOUNTERS.strayhound },
  {
    kind: 'jackal',
    name: 'Dust-jackal',
    strike: 3,
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
    // The Vessel's Court Guard hunt. Same weight as a rim cutter, his own name.
    kind: 'courtguard',
    name: 'Court Guard',
    strike: 3,
    shell: 2,
    hp: 3,
    line: 'The court guard raises his curved falchion. Sunburn and belief. He was told to keep Vessels inside.',
  },
  {
    // Vessel Cache Run: a hymn-road runner who caught you. Early weight, his own name.
    kind: 'runner',
    name: 'Seeker runner',
    strike: 3,
    shell: 0,
    hp: 2,
    line: 'A Seeker runner cuts across the rib, hymn on his breath. He means to walk the Vessel back on a leash.',
  },
  {
    kind: 'tick',
    name: 'Amber-tick',
    strike: 2,
    shell: 3,
    hp: 1,
    line: "An amber-tick clings to a rib of rock, fat with somebody else's Drop. You can crack it or leave it humming.",
  },
  {
    kind: 'pup',
    name: 'Shard-pup',
    strike: 2,
    shell: 1,
    hp: 2,
    line: 'A Shard-pup, already a jaw. Cartel leftovers. Fight or give the road.',
  },
  {
    kind: 'scavenger',
    name: 'Waste scavenger',
    strike: 3,
    shell: 1,
    hp: 2,
    line: 'A waste scavenger blocks the grit. A person who robs travelers who look alone. Stolen knife. Empty pockets. Optional throat.',
  },
  {
    kind: 'patrol',
    name: 'Vent patrol',
    strike: 3,
    shell: 0,
    hp: 1,
    line: 'Vent patrol. One clerk, shock baton, standing on the bolt. A short scrap. Then the vent, or not.',
  },
  {
    kind: 'handler',
    name: 'Hound-handler',
    strike: 3,
    shell: 1,
    hp: 2,
    line: 'The Hound-handler. Lean kit, shock-leash, an amber-eyed shard-hound at his heel with its eyes open. He is the fight. The hound stays on the leash.',
  },
  {
    kind: 'hound',
    name: 'Shard-Hound',
    strike: 3,
    shell: 2,
    hp: 3,
    line: 'A Shard-Hound off the lead. Cartel-bred, resin-jawed, amber eyes open. The handler lets it come.',
  },
  // v166: Chapter Two.
  { kind: 'greg', name: 'Greg Ambergrin', strike: 3, shell: 2, hp: 4, line: "Greg Ambergrin. Grease-stained coat, Miller's iron brand on the lapel, a skiff crew at his back." },
  { kind: 'dragoon', name: 'Seeker Dragoons', strike: 3, shell: 1, hp: 3, line: 'Seeker dragoons. Gold trim, resin-shod mounts, lances down.' },
  { kind: 'seekerpatrol', name: 'Seeker Patrol', strike: 2, shell: 1, hp: 2, line: 'A Seeker patrol. Two lamps, two batons.' },
  { kind: 'drilllead', name: 'Drill Team Lead', strike: 3, shell: 2, hp: 3, line: "Sybella's drill team lead. Goggles down, a hand-drill on a strap." },
  {
    kind: 'overseer',
    name: 'Overseer Valerius',
    strike: 4,
    shell: 3,
    // v145: Health 6. He is beatable, never killed: at 0 he escapes.
    hp: 6,
    line: 'Overseer Valerius. Bald, scarred, steam baton in the fist. He came himself.',
  },
  // Spine hunter fight. Copy and stats live in content/spineHunter.ts.
  { kind: 'collector', ...SPINE_HUNTER.encounter },
  { kind: 'carapace', ...CARAPACE_HUNTER.encounter },
  {
    kind: 'husk',
    name: 'Amber Husk',
    strike: 3,
    shell: 3,
    hp: 3,
    line: 'An Amber Husk. Calcified resin and bone, man-height and hunched, amber core under the rib cage. It keeps coming until the heart is shattered.',
  },
]

const TEACH = 'Fight or give the road. The rules: help fight.'
/** An ambush: there is no road to give. */
const TEACH_NO_SKIP = 'Fight, or try to run. The rules: help fight.'

/** Every exchange that lands deals at least this much, both ways. */
export const DAMAGE_FLOOR = 1
/** Your swing is 0..SWING_MAX added to your Strike, per exchange. Enemy hits are rolled 1..their Strike instead (see enemyHit). */
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

/**
 * v142: an enemy hit is a uniform roll from 1 up to its own Strike, less your Shell, never under the floor.
 * (Your own hit still adds your 0..SWING_MAX swing.) Seeded like the swing, so a save replays the same fight.
 */
export function enemyHit(state: GameState, strike: number, shell: number, floor = DAMAGE_FLOOR, ground = 0): number {
  const round = Number(state.flags.encounterRound ?? 0)
  let h = (seed(state) * 2654435761 + round * 40503 + 91) >>> 0
  for (const ch of String(state.flags.encounterKind ?? '')) h = (Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0)
  h ^= h >>> 15
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 13
  const rolled = 1 + ((h >>> 0) % Math.max(1, strike))
  return Math.max(floor, rolled + ground - shell)
}

/** Damage one side deals in an exchange. A landed exchange never rounds down to nothing. */
export function exchangeDamage(strike: number, swing: number, shell: number, floor = DAMAGE_FLOOR): number {
  return Math.max(floor, strike + swing - shell)
}

const KEY_HUNTERS: readonly EncounterKind[] = ['seekerpatrol', 'dragoon', 'drilllead']
export function encounterSpec(state: GameState): Spec {
  const kind = state.flags.encounterKind
  const named = SPECS.find((s) => s.kind === kind)
  // v180: carrying the Spire Key, the Maw's Seekers and drill crews come harder.
  if (named && state.flags.spireKey && state.chapterId === 'into-the-maw' && KEY_HUNTERS.includes(named.kind)) return { ...named, strike: named.strike + 1 }
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
  if (id.startsWith('camp:bay') || id === 'thresh:court' || id === 'thresh:cell') return 0
  if (id === 'spine:shade') return 1
  // Seeker ground at the Threshold: the Paddock, the guard post and Cup-Shadow field Seeker-pool fights.
  if (id === 'thresh:paddock' || id === 'thresh:guard' || id === 'thresh:sift') return 2
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
  if (HOME.has(state.sceneId) && !(state.sceneId === 'spine:ridge' && Number(state.flags.ridgeVisits ?? 0) >= 2)) return false
  const scene = getScene(state.sceneId)
  if (scene.kind === 'talk' || scene.kind === 'crisis' || scene.kind === 'ending') return false
  if (scene.kind === 'place') return true
  return ROAD_BEATS.has(state.sceneId)
}

function ribwormRoll(state: GameState, salt = 'ribworm', mod = 7): number {
  let h = (Math.imul(seed(state) + 0x1b3d, 374761393) + 668265263) >>> 0
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  h ^= h >>> 15
  return (h >>> 0) % mod
}

export function pickEncounterKind(state: GameState): EncounterKind {
  const n = seed(state)
  const turf = turfFaction(state)
  // High Seeker Heat can field a husk on any road: Seekers walk husks beyond Spire ground.
  if (state.heat.seekers >= 5 && n % 5 === 0) return 'husk'
  if (turf === 'cartel') {
    const pool: EncounterKind[] = ['pup', 'pup', 'cutter', 'jackal', 'tick']
    if (LEECH_GROUND.includes(state.sceneId) && ribwormRoll(state, 'leech', pool.length + LEECH_WEIGHT) < LEECH_WEIGHT) return 'leech'
    return pool[n % pool.length]
  }
  // v152: the Shard-pup also wanders Seeker and Stray ground.
  if (turf === 'seekers') {
    const pool: EncounterKind[] =
      state.heat.seekers >= 2
        ? ['husk', 'husk', 'cutter', 'jackal', 'tick', 'scavenger', 'pup']
        : ['cutter', 'cutter', 'jackal', 'tick', 'scavenger', 'pup']
    if (ribwormRoll(state, 'moth', pool.length + MOTH_WEIGHT) < MOTH_WEIGHT) return 'moth'
    return pool[n % pool.length]
  }
  const pool: EncounterKind[] = ['scavenger', 'scavenger', 'jackal', 'jackal', 'tick', 'pup']
  // v160: weight 1 in 7 on stray ground (Spine and the Outcast Cache Run). Its own bucket so the rest of the pool does not shift.
  if (ribwormRoll(state) < RIBWORM_IN_7) return 'ribworm'
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

/** Odds in plain words for buttons and help. Never a number on screen. */
export function oddsWord(percent: number): string {
  if (percent >= 70) return 'Good odds'
  if (percent >= 50) return 'Even odds'
  if (percent >= 30) return 'Risky'
  return 'Long odds'
}

/** v141: the line added to a win that also took you to 0 Health. */
export const MUTUAL_WIN_LINE = ' You are at 1 Health.'

/** v145: Valerius at 0 Health gets away. No body, no loot. */
export const VALERIUS_ESCAPES = 'He staggers back and is gone.'
export const HANDLER_BEATEN = 'He goes down hard, then limps off toward the yard. Valerius will hear about this.'

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

/** Fight-free danger scenes before the ground's faction is sure to send someone. Null: no guarantee. */
export const HEAT_OWED = [
  { heatMin: 3, heatMax: 3, scenes: 8 },
  { heatMin: 4, heatMax: 5, scenes: 6 },
  { heatMin: 6, heatMax: 7, scenes: 4 },
  { heatMin: 8, heatMax: 8, scenes: 3 },
] as const

export const ROAD_HEAT_SURE = 3

export function heatOwed(heat: number): number | null {
  const h = Math.max(0, Math.min(8, Math.floor(heat)))
  return HEAT_OWED.find((r) => h >= r.heatMin && h <= r.heatMax)?.scenes ?? null
}

/** Skips cost Sap. The cloak hides you once per area. */
export const CLOAK_SKIP_LINE = 'The cloak eats the glance. You slip away. No loot.'
export const SKIP_COST_SUB = 'Costs 1 Sap.'
export const CLOAK_SKIP_SUB = 'Costs 1 Sap. Once per place.'
export const CLOAK_USED_LOCK = 'The cloak already hid you here. They know the shape now.'
/** An area is one scene: a skip in one place never locks the cloak somewhere else. */
export function areaKey(state: Pick<GameState, 'sceneId' | 'flags'>): string {
  // A hunter's own screen counts as the ground it interrupted.
  const from = state.flags?.hunterFrom
  return state.flags?.hunterHere && typeof from === 'string' && from ? from : state.sceneId
}

export function canEncounter(state: GameState, opts?: { traveled?: boolean; firstWalk?: boolean }): boolean {
  if (state.flags.hunterHere || state.flags.encounterHere || state.flags.downed) return false
  if ((state.health ?? 1) <= 0) return false
  if (!encounterGround(state)) return false
  const last = Number(state.flags.encounterAt ?? -99)
  const heat = state.heat[turfFaction(state)]
  const gap = heat >= 7 ? 2 : heat >= 4 ? 3 : 5
  // Heat comes due: on danger ground, enough fight-free scenes at this Heat and a fight is certain.
  // The road out answers Heat: at the ground's Heat 3+, the road beat always fields a fight.
  if (ROAD_BEATS.has(state.sceneId) && heat >= ROAD_HEAT_SURE && !state.flags.roadHuntDone) return true
  if (last >= 0 && state.ticks - last < gap && !opts?.firstWalk) return false
  const owed = heatOwed(heat)
  if (owed != null && hubDanger(state) >= 1 && Number(state.flags.fightQuiet ?? 0) >= owed) return true
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
  // The most an enemy hit can be before crits; the real hit is rolled in resolveEncounter.
  const dmgIn = Math.max(floor, spec.strike - shell)
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

/** Short stat label: the last word of the name, in caps (CUTTER, SHARD-HOUND, VALERIUS). */
export function statName(spec: Pick<Spec, 'name'>): string {
  if (spec.name === 'Masked Figure') return 'MASKED'
  const words = spec.name.trim().split(/\s+/)
  return (words[words.length - 1] ?? spec.name).toUpperCase()
}

/** One clean stat row. No maths: Health, Strike, Shell. */
export function statRow(label: string, hp: number, strike: number, shell: number): string {
  return `${label} ♥ ${Math.max(0, hp)} ⚔ Strike ${strike} 🛡 Shell ${shell}`
}

/** The two stat rows at the top of every fight card: you, then them. */
function statRows(yourHp: number, strike: number, shell: number, spec: Spec, theirHp: number, theirStrike = spec.strike): string {
  return `${statRow('YOU', yourHp, strike, shell)}\n\n${statRow(statName(spec), theirHp, theirStrike, spec.shell)}`
}

/** Gear that sets your numbers gets its own short line. */
function gearLines(state: GameState): string[] {
  const out: string[] = []
  const eq = state.equipped ?? {}
  for (const id of Object.values(eq) as (ItemId | undefined)[]) {
    const it = id ? ITEMS[id] : undefined
    if (!it) continue
    if (it.strike != null) out.push(`${it.name}: Strike ${it.strike}.`)
    if (it.shell != null) out.push(`${it.name}: Shell ${it.shell}.`)
  }
  return out
}

function compareLines(state: GameState, c: Clash): string {
  const gear = gearLines(state)
  return [statRows(c.yourHp, c.strike, c.shell, c.spec, c.theirHp), ...gear].join('\n\n')
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
  const compares = compareLines(state, c)
  const head = `${openerOf(state, c.spec)}\n\n${terrainOf(state).line}`
  // Stat rows sit at the top of the card.
  if (!state.flags.fightTaught) {
    return `${compares}\n\n${head}\n\n${state.flags.encounterNoSkip ? TEACH_NO_SKIP : TEACH}`
  }
  return `${compares}\n\n${head}`
}

export function encounterAppend(state: GameState): string {
  return encounterCard(state)
}

export function encounterChoices(state: GameState): Choice[] {
  if (isEncounterResult(state)) {
    const ventWon = state.sceneId === 'camp:sabotage' && state.flags.encounterKind === 'patrol' && !!state.flags.guardDown
    // Beating the Court Guard at the dais steps opens the Court.
    if (state.sceneId === 'thresh:court-guard' && state.flags.crucibleGuardBeaten) {
      return [{ id: 'enc-continue', label: 'Into the Court.', tone: 'quiet', effects: { ...dismissEncounter(state), goto: 'thresh:court' } }]
    }
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
  const cloakUsed = state.flags.cloakSkipArea === areaKey(state)
  const rows: Choice[] = [
    {
      id: 'enc-fight',
      label: `Fight ${whoOf(spec)}`,
      sub: f.encounterFeint ? 'Strike. Your feint is set: next hit +2.' : 'Swing at them. Health takes the hits.',
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
      sub: 'No attack. You slip their swing: their hit is 1 lighter, and your next Strike gets +2.',
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
          : 'Once a fight. No attack. Risky: if it works, they miss this round and the next.',
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
          { any: [{ equipped: 'seeker_extractor' }, { item: 'memory_siphon' }] },
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
      sub: `${oddsWord(runChance(state))} to get away, no loot. If not, they hit you.`,
      enable: runLock ? { flag: '__never__' } : { healthMin: 1 },
      locked: runLock || 'Too hurt to fight.',
      effects: { resolveEncounter: 'run', ticks: 1 },
    },
    {
      id: 'enc-skip',
      label: 'Give the road. No loot.',
      sub: SKIP_COST_SUB,
      tone: 'quiet',
      show: { all: [{ flagUnset: 'encounterRound' }, { flagUnset: 'encounterNoSkip' }] },
      enable: { sapMin: 2 },
      locked: 'Needs: 2 Sap',
      effects: { resolveEncounter: 'skip', sap: -1 },
    },
    {
      id: 'enc-cloak',
      label: 'Let the cloak eat the glance. Skip.',
      sub: cloakUsed ? undefined : CLOAK_SKIP_SUB,
      show: { all: [{ any: [{ slot: 'armor' }, { slot: 'cloak' }] }, { flagUnset: 'encounterRound' }] },
      enable: cloakUsed ? { flag: '__never__' } : { sapMin: 2 },
      locked: cloakUsed ? CLOAK_USED_LOCK : 'Needs: 2 Sap',
      effects: { resolveEncounter: 'skip', sap: -1, flag: { cloakSkipArea: areaKey(state) } },
    },
  ]
  if (disguiseCheck(state, spec.kind)) {
    rows.push({
      id: 'enc-disguise',
      label: 'Walk past in the Vessel cloth',
      sub: 'Good odds they read a cup and let you by. No loot. If they look closely, the cloth is seen through and Cartel Heat rises by 2.',
      effects: { resolveEncounter: 'disguise', ticks: 1 },
    })
  }
  // He is fought plainly: Strike, Guard, Run.
  const shown = spec.kind === 'masked' ? rows.filter((c) => ['enc-fight', 'enc-guard', 'enc-run'].includes(c.id)) : rows
  return shown
    .filter((c) => check(c.show, state))
    .map((c) => ({ ...c, label: pronounText(spec.kind, c.label), sub: c.sub ? pronounText(spec.kind, c.sub) : c.sub }))
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
  if ((state.equipped?.legs === 'shin_wraps' || state.equipped?.legs === 'plated_shin_wraps')) p += 10
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
export const HUMAN_KINDS: readonly EncounterKind[] = ['cutter', 'courtguard', 'scavenger', 'patrol', 'handler', 'overseer', 'collector', 'carapace', 'strayhunter', 'strayhound', 'greg', 'dragoon', 'seekerpatrol', 'drilllead']
export const BEAST_KINDS: readonly EncounterKind[] = ['jackal', 'tick', 'pup', 'hound', 'ribworm', 'leech', 'moth']
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

/** v187: road gear drops land once per run each; a repeat roll gives scrap instead (no Blood Shiv farm). */
export const ONCE_GEAR: ItemId[] = ['shiv', 'rusted_dagger', 'scav_wrap', 'dust_cloak']
export const gearDropFlag = (id: ItemId) => `gearDrop_${id}`
function lootFor(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  const add: Partial<Record<ItemId, number>> = { ...pocketLoot(state, kind), ...extractorDrop(state, kind) }
  for (const id of ONCE_GEAR) {
    if (add[id] && state.flags[gearDropFlag(id)]) {
      delete add[id]
      if (!add.scrap) add.scrap = 1
    }
  }
  if (carriesSalve(state, kind)) add.salve = (add.salve ?? 0) + 1
  return add
}

function pocketLoot(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  if (kind === 'jackal') return { scrap: 2 }
  // v188: the tick's Drop comes once per run; a repeat tick is just a scrap.
  if (kind === 'tick') return state.flags.tickDropped ? { scrap: 1 } : { vial_drop: 1 }
  if (kind === 'pup') return { glints: 1, scrap: 1 }
  // Grown Shard-Hound: the pup's pocket, plus the resin off its jaw.
  if (kind === 'hound') return { glints: 1, scrap: 2 }
  // v160: the rib-worm always leaves its mouth-plate.
  if (kind === 'ribworm') return { glints: 1, scrap: 2, maw_plate: 1 }
  // v172: scrap 1, plus a Drop 1 time in 3. Hymn-moth: Resin Salve 1 time in 2, otherwise scrap 1.
  if (kind === 'leech') return ribwormRoll(state, 'leechLoot', 3) === 0 ? { scrap: 1, vial_drop: 1 } : { scrap: 1 }
  if (kind === 'moth') return ribwormRoll(state, 'mothLoot', 2) === 0 ? { salve: 1 } : { scrap: 1 }
  if (kind === 'husk') {
    const roll = pocket(state)
    // Resin scrap from the plates; sometimes a Drop from the core. Never salve, never gear.
    if (roll <= 3) return { scrap: 2 }
    if (roll <= 6) return { scrap: 1, vial_drop: 1 }
    return { scrap: 1 }
  }
  const roll = pocket(state)
  if (kind === 'cutter' || kind === 'courtguard') {
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

/** "a Rusted Dagger", "an Ironwood Baton", or no article for plural or mass names ("Hide Gloves"). */
export function dropNoun(name: string): string {
  if (/s$/i.test(name.trim())) return name
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`
}

function lootLine(add: Partial<Record<ItemId, number>>, dropped = false): string {
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
  // The Hound-handler walks away, so his gear is dropped, not taken off a body.
  const gearText = dropped ? `He drops ${gear.map(dropNoun).join(' and ')}` : `On the body: ${worn}`
  if (held && worn) return `${held}. ${gearText}`
  if (worn) return gearText
  return held
}

export const ENCOUNTER_FLAGS = [
  'encounterHere',
  'encounterNoSkip',
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
  // The fight card already showed the outcome and loot. "On." clears it, so it does not sit under the next ground.
  return {
    unsetFlag: [...ENCOUNTER_FLAGS],
    flag: { encounterAt: state.ticks, fightTaught: true },
  }
}

/** He/him for named men on the fight card. Everyone else stays they/them. */
const HE_KINDS: readonly EncounterKind[] = ['courtguard', 'runner', 'masked', 'greg', 'drilllead']
const HE_SWAPS: [RegExp, string][] = [
  [/\bThey still stand\b/g, 'He still stands'],
  [/\bThey drop\b/g, 'He drops'],
  [/\bThey miss\b/g, 'He misses'],
  [/\bthey miss\b/g, 'he misses'],
  [/\bthey hit\b/g, 'he hits'],
  [/\bthey read\b/g, 'he reads'],
  [/\bthey look\b/g, 'he looks'],
  [/\bthey let\b/g, 'he lets'],
  [/\bwith them\b/g, 'with him'],
  [/\bat them\b/g, 'at him'],
  [/\bTheir\b/g, 'His'],
  [/\btheir\b/g, 'his'],
  [/\bthem\b/g, 'him'],
  [/\bthemselves\b/g, 'himself'],
]
export function pronounText(kind: EncounterKind | undefined, text: string): string {
  if (!kind || !HE_KINDS.includes(kind)) return text
  return HE_SWAPS.reduce((t, [re, to]) => t.replace(re, to), text)
}

function holdCard(state: GameState, spec: Spec, card: string, short: string, extra: Effect = {}): { fx: Effect; flash: string } {
  card = pronounText(spec.kind, card)
  short = pronounText(spec.kind, short)
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
        // v158: the fight just ended here: the next quick-tap rush (or stall) notice in this scene is spent, so a win's Heat cut is not undone at once.
        timingNoticeAt: state.sceneId,
      },
    },
    flash: '',
  }
}

export type FightMove = 'fight' | 'guard' | 'feint' | 'trick' | 'run' | 'pull' | 'deal' | 'core' | 'seeker' | 'resin'

/** 1 in 10 landed hits, both sides. The Shard-pup lands them twice as often. */
export const CRIT_IN_10 = 1

/** First-hub enemies. Their crits are softened. */
export const EARLY_KINDS: readonly EncounterKind[] = ['cutter', 'pup', 'patrol', 'courtguard', 'jackal', 'tick', 'scavenger', 'handler', 'runner']
/** Fights whose single hits cap at EARLY_CRIT_CAP: the early ones, plus a hound off its lead. */
export const HIT_CAP_KINDS: readonly EncounterKind[] = [...EARLY_KINDS, 'hound']
export const EARLY_CRIT_CAP = 3

/** Seeded 0..n-1 roll for this round, so a save replays the same fight. */
function roll(state: GameState, salt: string, n: number): number {
  return hash(state, `${salt}:${state.flags.encounterKind ?? ''}`, Number(state.flags.encounterRound ?? 0) + 1) % n
}

/** Named people: no "the" in front. */
const PROPER_KINDS: EncounterKind[] = ['overseer', 'carapace']

function whoOf(spec: Spec): string {
  if (spec.kind === 'masked') return 'the masked figure'
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
  opts: { floor?: number; cloak?: boolean } = {},
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
  if (how === 'skip' && opts.cloak) {
    const line = CLOAK_SKIP_LINE
    return holdCard(state, spec, line, line, { flag: { encounterFled: true } })
  }
  if (how === 'skip' && f.encounterNoSkip) {
    return { fx: { flash: NO_SKIP_LINE }, flash: NO_SKIP_LINE }
  }
  if (how === 'skip') {
    const line = `You give ${whoOf(spec)} the road. No loot.`
    return holdCard(state, spec, line, line, { flag: { encounterFled: true } })
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

  // Your swing after ground, feint, and a numb arm. Their hit is a roll from 1 to their Strike (v142): no swing.
  let swingOut = c.swingOut
  const outTags: string[] = []
  const inTags: string[] = []
  if (attacking && f.encounterShocked) {
    swingOut = 0
    outTags.push('Numb arm: no extra force on your hit.')
  } else if (attacking && f.encounterFeint) {
    swingOut += 2
  }
  const feintAdd = attacking && !f.encounterShocked && f.encounterFeint ? 2 : 0
  const outRaw = swingOut
  swingOut = Math.max(0, swingOut + ground.you)
  // v144: a ground line names what it did to the hit you see, not to a swing the damage floor swallowed.
  const groundDelta = exchangeDamage(c.strike, swingOut, spec.shell, floor) - exchangeDamage(c.strike, outRaw, spec.shell, floor)
  if (attacking && groundDelta > 0) outTags.push(`High ground: +${groundDelta} to your hit.`)
  if (attacking && groundDelta < 0) outTags.push(`Loose sand: −${-groundDelta} to your hit.`)
  if (ground.cap != null) {
    const o = swingOut
    swingOut = Math.min(ground.cap, swingOut)
    if (attacking && swingOut < o) outTags.push('Blowing sand: your big swing falls short.')
  }
  let theirStrike = Math.max(0, spec.strike + ground.strike)
  if (theirStrike < spec.strike) inTags.push(`Steam vent: you take ${spec.strike - theirStrike} less damage.`)
  let pinned = !!f.encounterPinned
  let harpoon = 0
  if (spec.kind === 'carapace' && round === 1) {
    harpoon = 1
    pinned = true
    inTags.push('Harpoon: they hit for 1 more.')
    notes.push('The harpoon line pins you. No running until you land a hit.')
  }

  let dmgOut = attacking ? exchangeDamage(c.strike, swingOut, spec.shell, floor) : 0
  // v144: your own 0-2 swing is a bonus like any other, so it gets its own line when it adds to the hit.
  // Each bonus claims the points it adds, in order (swing, feint, ground), so the lines add up to the hit you see.
  if (attacking) {
    const own = f.encounterShocked ? 0 : c.swingOut
    const base0 = exchangeDamage(c.strike, 0, spec.shell, floor)
    const withSwing = exchangeDamage(c.strike, own, spec.shell, floor)
    const withFeint = exchangeDamage(c.strike, own + feintAdd, spec.shell, floor)
    const lead: string[] = []
    if (withSwing > base0) lead.push(`Extra force: +${withSwing - base0} to your hit.`)
    if (feintAdd) lead.push(withFeint > withSwing ? `Feint: +${withFeint - withSwing} to your hit.` : 'Feint: no extra on this hit.')
    outTags.unshift(...lead)
  }
  const hitBare = enemyHit(state, theirStrike, c.shell, floor, harpoon)
  let dmgIn = enemyHit(state, theirStrike, c.shell, floor, harpoon + ground.them)
  if (dmgIn < hitBare) inTags.push(`Sun in their eyes: you take ${hitBare - dmgIn} less damage.`)

  // v160: the rib-worm is still under the sand in round 1. Your first swing does half damage (never below 1).
  if (spec.kind === 'ribworm' && round === 1 && attacking && dmgOut > 1) {
    dmgOut = Math.max(1, Math.floor(dmgOut / 2))
    outTags.push(RIBWORM_BURROW_LINE)
  }
  let critOut = false
  if (attacking && dmgOut > 0 && roll(state, 'critYou', 10) < CRIT_IN_10) {
    dmgOut *= 2
    critOut = true
  }
  // dmgInPlain: the same hit without the crit, for the plain hit line above the crit line.
  let dmgInPlain = dmgIn
  let critIn = false
  const critOdds = spec.kind === 'pup' ? CRIT_IN_10 * 2 : CRIT_IN_10
  // Guard and Feint are defensive rounds: no crit lands on you, so the stated lighter hit holds.
  const defending = move === 'guard' || move === 'feint'
  if (dmgIn > 0 && !defending && roll(state, 'critThem', 10) < critOdds) {
    dmgIn *= 2
    // A crit never takes you from full Health to Down in one exchange.
    if (c.yourHp >= max) dmgIn = Math.min(dmgIn, max - 1)
    // Early fights: an enemy crit takes at most EARLY_CRIT_CAP Health.
    // If the plain hit is already at the cap, it is just a hit, not a crit.
    if (HIT_CAP_KINDS.includes(spec.kind)) dmgIn = Math.min(dmgIn, EARLY_CRIT_CAP)
    critIn = dmgIn > dmgInPlain
    if (!critIn) dmgIn = dmgInPlain
  }
  // Blowing sand: both hits top out at the stated cap, crits included.
  if (ground.cap != null) {
    if (attacking && dmgOut > ground.cap) {
      // v144: the cap is what you see, so it is the only line about your hit: no "+N" that the sand took back.
      for (let i = outTags.length - 1; i >= 0; i--) if (/ to your hit\.$|^Feint: no extra/.test(outTags[i]) || /^Blowing sand: your/.test(outTags[i])) outTags.splice(i, 1)
      outTags.push('Blowing sand: your big swing falls short.')
      critOut = critOut && ground.cap > 1
    }
    dmgOut = Math.min(ground.cap, dmgOut)
    if (dmgIn > ground.cap) inTags.push('Blowing sand: their big swing falls short.')
    dmgIn = Math.min(ground.cap, dmgIn)
    dmgInPlain = Math.min(ground.cap, dmgInPlain)
    critIn = critIn && dmgIn > dmgInPlain
  }
  // The masked figure: your swings never land, his hit is 1 and never puts you on the ground.
  if (spec.kind === 'masked') {
    const room = Math.min(1, Math.max(0, c.yourHp - 1))
    dmgOut = 0
    critOut = false
    dmgIn = Math.min(dmgIn, room)
    dmgInPlain = Math.min(dmgInPlain, room)
    critIn = false
  }
  const hitIn = (fn: (d: number) => number) => {
    dmgIn = fn(dmgIn)
    dmgInPlain = fn(dmgInPlain)
  }
  if (f.encounterPair && c.theirHp >= 2) {
    hitIn((d) => d + 1)
    inTags.push('Second jackal: they hit for 1 more.')
  }
  // Early fights: no single hit takes more than EARLY_CRIT_CAP Health, crit or not.
  if (HIT_CAP_KINDS.includes(spec.kind) && dmgIn > EARLY_CRIT_CAP) {
    hitIn((d) => Math.min(d, EARLY_CRIT_CAP))
    critIn = critIn && dmgIn > dmgInPlain
    inTags.push(spec.kind === 'hound' ? `Off the lead: a hit takes at most ${EARLY_CRIT_CAP} Health.` : `Early fight: a hit takes at most ${EARLY_CRIT_CAP} Health.`)
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
      outTags.push('Cracked the core: double damage.')
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
    // v179: Guard blunts a landed hit but never erases it (a Strike 2 hit still lands for 1).
    const before = dmgIn
    hitIn((d) => (d > 0 ? Math.max(DAMAGE_FLOOR, d - cut) : 0))
    const took = before - dmgIn
    if (took > 0) inTags.push(`Guard: you take ${took} less damage.`)
    notes.push('You guard.')
  } else if (move === 'feint') {
    // Feint: you slip the swing. Their hit is 1 lighter.
    hitIn((d) => Math.max(0, d - 1))
    feintNext = true
    inTags.push('Feint: you take 1 less damage.')
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
      return holdCard(state, spec, line, line, { flag: { encounterFled: true } })
    } else {
      notes.push(`You try to run. ${cap(who)} catches you.`)
      if (spec.kind === 'handler') {
        hitIn((d) => d + 1)
        inTags.push('Hound bite: they hit for 1 more.')
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

  let sapLoss = latched && move !== 'pull' && f.encounterLatched ? 1 : 0
  if (sapLoss) notes.push('The tick drinks. Sap -1.')
  // v172: the vat-leech drinks: a hit it lands also takes 1 Sap.
  if (spec.kind === 'leech' && dmgIn > 0 && !f.encounterStun) {
    sapLoss += 1
    notes.push('The vat-leech drinks. Sap -1.')
  }
  // v172: the hymn-moth's lull takes Sap, not Health. The cloth halves it (every other lull).
  let lulled = false
  if (spec.kind === 'moth' && dmgIn > 0 && !f.encounterStun) {
    dmgIn = 0
    lulled = true
    const cloth = wearsCloth(state)
    if (!cloth || round % 2 === 1) {
      sapLoss += 1
      notes.push('The hymn-moth lulls you. Sap -1.')
    } else notes.push('The cloth dulls the hum. No Sap lost.')
  }

  let theirHp = Math.max(0, c.theirHp - dmgOut)
  let yourHp = Math.max(0, c.yourHp - dmgIn)
  let healthDelta = yourHp - c.yourHp
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
  // Stat rows on top, then plain result lines. Every bonus gets its own short line; a crit gets its own line.
  // A crit is part of its own hit line, with the final damage. No separate base-hit line.
  const youLine = !attacking
    ? 'You do not attack this round.'
    : dmgOut <= 0
      ? `You miss ${who}.`
      : critOut
        ? `Critical Strike! You hit ${who} for ${dmgOut}.`
        : `You hit ${who} for ${dmgOut}.`
  const themLine = f.encounterStun
    ? `${cap(who)} misses. Sand in the eyes.`
    : lulled
      ? `${cap(who)} goes for your Sap.`
      : dmgIn <= 0
      ? `${cap(who)} misses you.`
      : critIn && dmgIn > dmgInPlain
        ? `Critical Strike! ${cap(who)} hits you for ${dmgIn}.`
        : `${cap(who)} hits back for ${dmgIn}.`
  const bonusLines = [...(attacking ? outTags : outTags.filter((t) => !/your hit/.test(t))), ...inTags]
  // v141: you kill them and drop to 0 in the same exchange: a win, not a Down. You stand at 1 Health, loot kept.
  // (The masked figure never dies, so his own rule, a hit that cannot take you below 1, is untouched.)
  const mutualWin = theirHp <= 0 && yourHp <= 0 && spec.kind !== 'masked'
  if (mutualWin) {
    yourHp = 1
    healthDelta = 1 - c.yourHp
  }
  const top = statRows(yourHp, c.strike, c.shell, spec, theirHp)
  // v182: the hit that would have dropped you lands after they fall. The line says so.
  const themSaid = mutualWin && dmgIn > 0 ? themLine.replace(/\.$/, `, but you drop ${who} first.`) : themLine
  const hitCard = [top, youLine, themSaid, ...bonusLines, ...(notes.length ? [notes.join(' ')] : [])].join('\n\n')
  const sap = sapLoss ? -sapLoss : undefined

  // He cannot be killed. A strike ends it, and so does the third round: he walks off. No loot, no Heat.
  if (spec.kind === 'masked' && (attacking || round >= MASKED_ROUNDS)) {
    const outcome = attacking ? MASKED_STRIKE_LINE : MASKED_WALKS_OFF_LINE
    const card = attacking ? `${top}\n\n${outcome}` : `${hitCard}\n\n${outcome}`
    return holdCard(state, spec, card, outcome, { health: attacking ? 0 : healthDelta, sap, flag: { maskedFought: true } })
  }

  if (theirHp <= 0 && spec.kind === 'patrol') {
    const outcome = `The clerk drops. Scrap. Shock Baton. The bolt is open.${mutualWin ? MUTUAL_WIN_LINE : ''}`
    const salve = carriesSalve(state, 'patrol')
    const said = salve ? `${outcome} A Resin Salve in his belt pouch.` : outcome
    return holdCard(state, spec, `${hitCard}\n\n${said}`, said, {
      health: healthDelta,
      add: salve ? { scrap: 1, salve: 1 } : { scrap: 1 },
      heat: { cartel: 1 },
      pressure: 1,
      sap,
      flag: { guardDown: true, ventLoot: true, encounterGrip: grip },
    })
  }

  if (theirHp <= 0 && spec.kind === 'overseer') {
    const outcome = `${VALERIUS_ESCAPES} Cartel Heat -1.${mutualWin ? MUTUAL_WIN_LINE : ''}`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: healthDelta,
      sap,
      // v152: beating him is a reward. Cartel -1 (was +2 in v145).
      heat: { cartel: -1 },
      pressure: dmgIn > 0 ? 1 : undefined,
      flag: { encounterGrip: grip, valeriusBeaten: true, valeriusCool: true, huntQuiet: 0 },
    })
  }

  if (theirHp <= 0) {
    const add = lootFor(state, spec.kind)
    if (snatched) add[snatched] = (add[snatched] ?? 0) + 1
    // v160: the rib-worm's Maw Plate is a guaranteed drop with its own plain line under the pocket loot.
    const plateAdd: Partial<Record<ItemId, number>> = {}
    if (spec.kind === 'ribworm' && add.maw_plate) plateAdd.maw_plate = add.maw_plate
    const lootAdd = { ...add }
    if (plateAdd.maw_plate) delete lootAdd.maw_plate
    const loot = lootLine(lootAdd, spec.kind === 'handler')
    const back = snatched ? ` You take back your ${ITEMS[snatched]?.name ?? snatched}.` : ''
    const huskWin = spec.kind === 'husk'
    const wormWin = spec.kind === 'ribworm'
    const creatureWin = spec.kind === 'leech' ? LEECH_WIN : spec.kind === 'moth' ? MOTH_WIN : ''
    // The Hound-handler is never killed: he is beaten and limps off.
    const handlerWin = spec.kind === 'handler'
    const won = mutualWin ? MUTUAL_WIN_LINE : ''
    const outcome = handlerWin
      ? `${HANDLER_BEATEN} ${loot}.${back}${won}`
      : wormWin
        ? `${RIBWORM_WIN}\n\n${loot}.${back}${won}\n\n${lootLine(plateAdd)}.`
        : creatureWin
        ? `${creatureWin} ${loot}.${back}${won}`
        : huskWin
        ? `The amber heart shatters. The husk falls still. ${loot}.${back}${won}`
        : `They drop. ${loot}.${back}${won}`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: healthDelta,
      add,
      sap,
      // Cartel property: killing the hound is on the ledger.
      // Beating the handler: Cartel +2.
      heat: spec.kind === 'hound' ? { cartel: 1 } : handlerWin ? { cartel: 2 } : undefined,
      pressure: dmgIn > 0 ? 1 : undefined,
      // v153: beating the hound or the handler keeps Valerius himself away for 10 quiet scenes (hunts still come).
      flag: { encounterGrip: grip, ...(spec.kind === 'tick' && add.vial_drop ? { tickDropped: true } : {}), ...Object.fromEntries(ONCE_GEAR.filter((id) => add[id]).map((id) => [gearDropFlag(id), true])), ...(handlerWin ? { handlerInjured: true } : {}), ...(handlerWin || spec.kind === 'hound' ? { valeriusRest: true, valeriusQuiet: 0 } : {}), ...(state.sceneId === 'thresh:court-guard' && spec.kind === 'courtguard' ? { crucibleGuardBeaten: true } : {}) },
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
  const standing = pronounText(spec.kind, `${hitCard}${tail}\n\nThey still stand. No loot yet.`)
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
export const NO_SKIP_LINE = 'No giving the road this time. He is already on you. Fight, or try to run.'

/** A sneak roll: true means you were spotted. Same seed the road fights use, so a run plays the same way twice. */
/** Seeker Heat 6+: odds in 10 that a Threshold lie is seen through (Heat 6 = 2, 7 = 3, 8 = 4). */
export function ruseOdds(seekers: number): number {
  return seekers < 6 ? 0 : Math.min(6, seekers - 4)
}
export function ruseSeen(state: GameState): boolean {
  return hash(state, 'ruse', 1) % 10 < ruseOdds(state.heat.seekers ?? 0)
}
export const RUSE_HEAT_LINE = 'Someone in the crowd looks too long at the cloth. Seeker Heat +1.'
export const RUSE_FIGHT_LINE = 'The Court Guard has seen through it. The falchion comes up.'

export function sneakSpotted(state: GameState, odds: number): boolean {
  return hash(state, 'sneak', 1) % 10 < odds
}

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

/** Display name of a foe kind, for lines spoken after its fight card is gone. */
/** "The Rim cutter" / "Overseer Valerius": a named foe takes no article. */
export function foeWho(kind: unknown): string | undefined {
  const spec = SPECS.find((x) => x.kind === kind)
  if (!spec) return undefined
  return PROPER_KINDS.includes(spec.kind) ? pronounText(spec.kind, spec.name) : `The ${pronounText(spec.kind, spec.name)}`
}

export function foeName(kind: unknown): string | undefined {
  const spec = SPECS.find((x) => x.kind === kind)
  return spec ? pronounText(spec.kind, spec.name) : undefined
}
