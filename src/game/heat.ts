import type { DoorId, Faction } from './types'

export const HEAT_TIP = {
  title: 'Heat is attention',
  body: `The three numbers under Sap are Heat: attention from three factions. They do not make you stronger. They make you visible.

Tap a Heat number anytime to hear who is watching.`,
}

export const HEAT_FACTIONS: Record<
  Faction,
  { name: string; watch: string; body: string }
> = {
  cartel: {
    name: 'Cartel',
    watch: 'Ironwood, Valerius, Hounds',
    body: 'Ironwood Break writes names in ledgers. Overseer Valerius hunts Sap thieves and unpermitted relic hoarders. Shard-Hounds follow the chip. Cartel Heat is patrol, paper, and a muzzle.',
  },
  seekers: {
    name: 'Seekers',
    watch: 'cloth, vessels, Sybella',
    body: 'Seekers want a cup that holds. Thalia loves a Vessel. Sybella hunts what the sand should not have let walk — for the faith, not for you. Seeker Heat is hymns, runners, and a skiff. She does not aid Cartel. She does not aid Dune-Strays.',
  },
  strays: {
    name: 'Strays',
    watch: 'Jaxson, Silas, Kaelen the Sifter',
    body: 'Dune-Strays collect favors and shade. Jaxson hotwires. Silas sells minutes. Kaelen sells rumors and funds a way out. Stray Heat is being known. Known is not safe.',
  },
}

type HeatCard = { name: string; watch: string; body: string }

/** Who is watching depends on the door: Jaxson and Kaelen are the Prisoner's people. */
const BY_DOOR: Partial<Record<DoorId, Partial<Record<Faction, HeatCard>>>> = {
  outcast: {
    seekers: {
      name: 'Seekers',
      watch: 'runners, skiffs, Sybella',
      body: 'Seekers want a cup that holds. Sybella hunts what the sand should not have let walk — for the faith, not for you. Seeker Heat is hymns, runners, and a skiff. She does not aid Cartel. She does not aid Dune-Strays.',
    },
    strays: {
      name: 'Strays',
      watch: 'Silas, Nim, Ossa',
      body: 'Dune-Strays collect favors and shade. Silas sells minutes. Nim collects the shade-road fee. Stray Heat is being known. Known is not safe.',
    },
  },
  vessel: {
    strays: {
      name: 'Strays',
      watch: 'Dune-Strays, Ossa',
      body: 'Dune-Strays collect favors and shade. Ossa keeps her stilts near Red Maw. Stray Heat is being known. Known is not safe.',
    },
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
