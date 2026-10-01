import type { Faction } from './types'

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
    watch: 'Oil-Tooth, Silas, Kaelen the Sifter',
    body: 'Dune-Strays collect favors and shade. Oil-Tooth hotwires. Silas sells minutes. Kaelen sells rumors and funds a way out. Stray Heat is being known. Known is not safe.',
  },
}

export function heatRiseLine(faction: Faction, n: number): string {
  const f = HEAT_FACTIONS[faction]
  return `${f.name} Heat +${n} — someone is watching. ${f.watch}.`
}
