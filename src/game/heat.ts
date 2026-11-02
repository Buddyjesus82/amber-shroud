import type { DoorId, Faction } from './types'

export const HEAT_TIP = {
  title: 'Heat is attention',
  body: `The three numbers under Sap are Heat: attention from three factions. They do not make you stronger. They make you visible.

Tap a Heat number anytime to hear who is watching.`,
}

const CARTEL_BODY = 'Overseer Valerius hunts Sap thieves and unpermitted relic hoarders. Shard-Hounds follow the chip. Cartel Heat is patrol, paper, and a muzzle.'
const SEEKERS_BODY = 'Seekers want a cup that holds. Sybella hunts what the sand should not have let walk — for the faith, not for you. Seeker Heat is hymns and a skiff. She does not aid Cartel. She does not aid Dune-Strays.'
const STRAYS_BODY = 'Dune-Strays collect favors and shade. Stray Heat is being known. Known is not safe.'

/** v202: watch lists name only who actually hunts you (heatNow.ts has the live answer). Road hunters stay unnamed. Prisoner is the default. */
export const HEAT_FACTIONS: Record<
  Faction,
  { name: string; watch: string; body: string }
> = {
  cartel: { name: 'Cartel', watch: 'Valerius, the Hound-handler, a paid ambusher on the roads', body: CARTEL_BODY },
  seekers: { name: 'Seekers', watch: 'Sybella, Seeker runners on the roads', body: SEEKERS_BODY },
  strays: { name: 'Strays', watch: 'the Stray Hunter, Stray collectors on the roads', body: STRAYS_BODY },
}

type HeatCard = { name: string; watch: string; body: string }

/** Camp-04 is the Prisoner's ground, the Spine the Outcast's, the Threshold the Vessel's. Red Maw and the roads are everyone's. */
const BY_DOOR: Partial<Record<DoorId, Partial<Record<Faction, HeatCard>>>> = {
  outcast: {
    cartel: { name: 'Cartel', watch: 'a paid ambusher on the roads', body: CARTEL_BODY },
    strays: {
      name: 'Strays',
      watch: 'Nim, a Stray collector, the Stray Hunter',
      body: 'Dune-Strays collect favors and shade. At Stray Heat 4, Nim the Carapace hunter takes the hunt on the Spine. Stray Heat is being known. Known is not safe.',
    },
  },
  vessel: {
    cartel: { name: 'Cartel', watch: 'a paid ambusher on the roads', body: CARTEL_BODY },
    seekers: { name: 'Seekers', watch: 'Sybella, Valerius at Seeker Command, a Court Guard, Seeker runners on the roads', body: SEEKERS_BODY },
  },
}

export function heatFactions(door?: DoorId): Record<Faction, HeatCard> {
  const over = (door && BY_DOOR[door]) || {}
  return { ...HEAT_FACTIONS, ...over }
}

export function heatRiseLine(faction: Faction, n: number, door?: DoorId): string {
  const f = heatFactions(door)[faction]
  return `${f.name} Heat +${n} — someone is watching. ${f.watch}.`
}
