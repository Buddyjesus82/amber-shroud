import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { equippedShell, equippedStrike } from './kit'
import { SPINE_HUNTER } from './content/spineHunter'
import type { Choice, Effect, GameState, ItemId } from './types'

export type EncounterKind = 'jackal' | 'cutter' | 'tick' | 'pup' | 'scavenger' | 'patrol' | 'handler' | 'overseer' | 'collector'

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
  if (turf === 'cartel') {
    const pool: EncounterKind[] = ['pup', 'pup', 'cutter', 'jackal', 'tick']
    return pool[n % pool.length]
  }
  if (turf === 'seekers') {
    const pool: EncounterKind[] = ['cutter', 'cutter', 'jackal', 'tick', 'scavenger']
    return pool[n % pool.length]
  }
  const pool: EncounterKind[] = ['scavenger', 'scavenger', 'jackal', 'jackal', 'tick']
  return pool[n % pool.length]
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

function compareHit(c: Clash): string {
  return `You Strike ${c.strike}+${c.swingOut} vs their Shell ${c.spec.shell} → ${c.dmgOut}\n\nTheir Strike ${c.spec.strike}+${c.swingIn} vs your Shell ${c.shell} → ${c.dmgIn}`
}

/** Encounter interrupt body only — never the place underneath. */
export function encounterCard(state: GameState): string {
  const clashText = state.flags.encounterClash
  if (typeof clashText === 'string' && clashText) return clashText
  const c = clashOf(state)
  const compares = compareLines(c)
  if (!state.flags.fightTaught) {
    return `${c.spec.line}\n\n${compares}\n\n${TEACH}`
  }
  return `${c.spec.line}\n\n${compares}`
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
              flash: 'The clerk is down. The vent screams. Shock Baton · Strike 4. Equip it. Oil-Tooth is under a hull.',
            }
          : base,
      },
    ]
  }
  const spec = encounterSpec(state)
  const rows: Choice[] = [
    {
      id: 'enc-fight',
      label: `Fight the ${spec.name}`,
      sub: 'Strike vs Shell. Health takes the hits.',
      tone: 'danger',
      enable: { healthMin: 1 },
      locked: 'Too hurt to fight.',
      effects: { resolveEncounter: 'fight', ticks: 1 },
    },
    {
      id: 'enc-skip',
      label: 'Give the road. No loot.',
      tone: 'quiet',
      effects: { resolveEncounter: 'skip' },
    },
    {
      id: 'enc-cloak',
      label: 'Let the cloak eat the glance. Skip.',
      show: { slot: 'armor' },
      effects: { resolveEncounter: 'skip' },
    },
  ]
  return rows.filter((c) => check(c.show, state))
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
function lootFor(state: GameState, kind: EncounterKind): Partial<Record<ItemId, number>> {
  if (kind === 'jackal') return { scrap: 2 }
  if (kind === 'tick') return { vial_drop: 1 }
  if (kind === 'pup') return { glints: 1, scrap: 1 }
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
    if (item?.slot === 'weapon' || item?.slot === 'armor' || item?.slot === 'garment' || item?.slot === 'head') gear.push(name)
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

/**
 * The one fight resolver for every door and every fight. `floor` exists for tests of the stall valve;
 * the game always plays with DAMAGE_FLOOR.
 */
export function resolveEncounter(
  state: GameState,
  how: 'fight' | 'skip',
  opts: { floor?: number } = {},
): { fx: Effect; flash: string } {
  const spec = encounterSpec(state)
  if (how === 'skip') {
    const line = `You give the ${spec.name} the road. No loot. No bill.`
    return holdCard(state, spec, line, line)
  }

  const c = clashOf(state, opts.floor ?? DAMAGE_FLOOR)
  const round = Number(state.flags.encounterRound ?? 0) + 1
  const stall = c.dmgOut === 0 && c.dmgIn === 0 ? Number(state.flags.encounterStall ?? 0) + 1 : 0
  const theirHp = Math.max(0, c.theirHp - c.dmgOut)
  const yourHp = Math.max(0, c.yourHp - c.dmgIn)
  const max = state.healthMax ?? HEALTH_MAX
  const healthDelta = yourHp - c.yourHp
  const hitCard = compareHit(c)

  if (theirHp <= 0 && spec.kind === 'patrol') {
    const stagger = yourHp <= 0
    const outcome = stagger
      ? `The clerk drops. You drop with them. Scrap. Shock Baton. Health 0/${max}. The bolt is still yours.`
      : 'The clerk drops. Scrap. Shock Baton. The bolt is open.'
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: stagger ? -c.yourHp : healthDelta,
      add: { scrap: 1 },
      heat: { cartel: 1 },
      pressure: 1,
      flag: { guardDown: true, ventLoot: true },
    })
  }

  if (theirHp <= 0) {
    const add = lootFor(state, spec.kind)
    const loot = lootLine(add)
    const stagger = yourHp <= 0
    const outcome = stagger
      ? `They drop. You drop with them. ${loot}. Health 0/${max}.`
      : `They drop. ${loot}.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: stagger ? -c.yourHp : healthDelta,
      add,
      pressure: c.dmgIn > 0 ? 1 : undefined,
    })
  }

  if (yourHp <= 0) {
    const outcome = `You drop. No loot. Health 0/${max}. Too hurt to fight.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: -c.yourHp,
      pressure: 2,
    })
  }

  if (stall >= STALL_ROUNDS) {
    const who = spec.kind === 'overseer' ? spec.name : `The ${spec.name}`
    const outcome = `${who} backs off and leaves the road. No loot.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, { health: healthDelta })
  }

  const standing = `${hitCard}\n\nThey still stand. Their Health ${theirHp}/${spec.hp}. Yours ${yourHp}/${max}. No loot yet.`
  return {
    fx: {
      health: healthDelta,
      ticks: 0,
      flag: {
        encounterHere: true,
        encounterKind: spec.kind,
        encounterHp: theirHp,
        encounterRound: round,
        encounterStall: stall,
        encounterClash: standing,
        fightTaught: true,
        encounterAt: state.ticks,
      },
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

export function wantsEncounterSkip(text: string): boolean {
  return /\b(skip|leave|run|flee|walk|pass|ignore|back|go)\b/i.test(text)
}

export function roadPressureScene(sceneId: string): boolean {
  return ENCOUNTER_SCENES.has(sceneId) || sceneId.startsWith('maw:') || sceneId.startsWith('ch1:')
}

/** Open a road fight on the current ground. Strike vs Shell stays in the encounter card. */
export function beginEncounter(state: GameState, kind?: EncounterKind, flash?: string): Effect {
  const k = kind ?? pickEncounterKind(state)
  return {
    unsetFlag: ['hunterHere', 'hunterFrom', 'encounterDone', 'encounterClash', 'encounterFlash', 'encounterRound', 'encounterStall'],
    flag: {
      encounterHere: true,
      encounterKind: k,
      encounterHp: enemyHealth(k),
      encounterAt: state.ticks,
    },
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
