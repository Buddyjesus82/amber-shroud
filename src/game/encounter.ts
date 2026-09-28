import { ITEMS } from './content/catalog'
import { getScene } from './content'
import { check } from './logic'
import { equippedShell, equippedStrike } from './kit'
import type { Choice, Effect, GameState, ItemId } from './types'

export type EncounterKind = 'jackal' | 'cutter' | 'tick' | 'pup' | 'scavenger' | 'patrol'

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
    line: 'A Shard-pup — not a Hound yet, already a jaw. Cartel leftovers. Fight or give the road.',
  },
  {
    kind: 'scavenger',
    name: 'Waste scavenger',
    strike: 2,
    shell: 1,
    hp: 2,
    line: 'A waste scavenger blocks the grit. Not fauna — a person who robs travelers who look alone. Stolen knife. Empty pockets. Optional throat.',
  },
  {
    kind: 'patrol',
    name: 'Vent patrol',
    strike: 2,
    shell: 0,
    hp: 1,
    line: 'Vent patrol. One clerk, shock baton, standing on the bolt. A short scrap. Then the vent, or not.',
  },
]

const ROAD_KINDS: EncounterKind[] = ['jackal', 'cutter', 'tick', 'pup', 'scavenger']

const TEACH =
  'Strike has to beat Shell to wound. Health takes the hits — not Sap. Fight or skip. Skip is free and pays nothing. Loot only if they drop.'

function seed(state: GameState): number {
  let n = state.ticks * 11 + state.pressure * 5 + state.sap * 3
  for (const ch of state.sceneId) n += ch.charCodeAt(0)
  n += (state.items.scrap ?? 0) + (state.items.glints ?? 0) * 2
  return Math.abs(n)
}

export function encounterSpec(state: GameState): Spec {
  const kind = state.flags.encounterKind
  const named = SPECS.find((s) => s.kind === kind)
  if (named) return named
  return SPECS[seed(state) % SPECS.length]
}

export function pickEncounterKind(state: GameState): EncounterKind {
  return ROAD_KINDS[seed(state) % ROAD_KINDS.length]
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

export function canEncounter(state: GameState): boolean {
  if (state.flags.hunterHere || state.flags.encounterHere) return false
  if (!ENCOUNTER_SCENES.has(state.sceneId)) return false
  if (state.sceneId.startsWith('open:') || state.sceneId.startsWith('crisis:')) return false
  const last = Number(state.flags.encounterAt ?? -99)
  if (last >= 0 && state.ticks - last < 6) return false
  if (state.ticks < 3) return false
  const scene = getScene(state.sceneId)
  if (scene.kind === 'talk' || scene.kind === 'crisis' || scene.kind === 'ending') return false
  const n = seed(state) % 5
  return n === 1 || n === 2
}

export type Clash = {
  spec: Spec
  strike: number
  shell: number
  dmgOut: number
  dmgIn: number
  theirHp: number
  yourHp: number
}

export function clashOf(state: GameState): Clash {
  const spec = encounterSpec(state)
  const strike = equippedStrike(state)
  const shell = equippedShell(state)
  const dmgOut = Math.max(0, strike - spec.shell)
  const dmgIn = Math.max(0, spec.strike - shell)
  const theirNow = Number(state.flags.encounterHp ?? spec.hp)
  const healthMax = state.healthMax ?? HEALTH_MAX
  const yours = state.health ?? healthMax
  return {
    spec,
    strike,
    shell,
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
  return `You Strike ${c.strike} vs their Shell ${c.spec.shell} → ${c.dmgOut}\n\nTheir Strike ${c.spec.strike} vs your Shell ${c.shell} → ${c.dmgIn}`
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
      sub: 'Strike vs Shell. Health takes hits. No dice.',
      tone: 'danger',
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
    const bit = n > 1 ? `${name} ×${n}` : name
    if (item?.slot === 'weapon' || item?.slot === 'armor' || item?.slot === 'garment') gear.push(bit)
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

export function resolveEncounter(state: GameState, how: 'fight' | 'skip'): { fx: Effect; flash: string } {
  const spec = encounterSpec(state)
  if (how === 'skip') {
    const line = `You give the ${spec.name} the road. No loot. No bill.`
    return holdCard(state, spec, line, line)
  }

  const c = clashOf(state)
  const theirHp = Math.max(0, c.theirHp - c.dmgOut)
  const yourHp = Math.max(0, c.yourHp - c.dmgIn)
  const max = state.healthMax ?? HEALTH_MAX
  const healthDelta = yourHp - c.yourHp
  const hitCard = compareHit(c)

  if (theirHp <= 0 && spec.kind === 'patrol') {
    const stagger = yourHp <= 0
    const outcome = stagger
      ? `The clerk drops. You drop with them. Scrap. Shock Baton. Health 1/${max}. The bolt is still yours.`
      : 'The clerk drops. Scrap. Shock Baton. The bolt is open.'
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: stagger ? 1 - c.yourHp : healthDelta,
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
      ? `They drop. You drop with them. ${loot}. Health 1/${max}. You crawl.`
      : `They drop. ${loot}.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: stagger ? 1 - c.yourHp : healthDelta,
      add,
      pressure: c.dmgIn > 0 ? 1 : undefined,
    })
  }

  if (yourHp <= 0) {
    const outcome = `You drop. No loot. Health 1/${max}. The road is theirs.`
    return holdCard(state, spec, `${hitCard}\n\n${outcome}`, outcome, {
      health: 1 - c.yourHp,
      sap: state.sap > 0 ? -1 : undefined,
      pressure: 2,
    })
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
  return ENCOUNTER_SCENES.has(sceneId)
}

/** Open a road fight on the current ground. Strike vs Shell stays in the encounter card. */
export function beginEncounter(state: GameState, kind?: EncounterKind, flash?: string): Effect {
  const k = kind ?? pickEncounterKind(state)
  return {
    unsetFlag: ['hunterHere', 'hunterFrom', 'encounterDone', 'encounterClash', 'encounterFlash'],
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
