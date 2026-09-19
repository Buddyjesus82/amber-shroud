import type { Faction } from './types'

export const HEAT_TIP = {
  title: 'Heat is not XP',
  body: `The three numbers under Sap are Heat: attention from three factions. They are not levels. They do not make you stronger. They make you visible.

Tap a Heat number anytime to hear who is watching.`,
}

export const HEAT_FACTIONS: Record<
  Faction,
  { name: string; watch: string; body: string }
> = {
  cartel: {
    name: 'Cartel',
    watch: 'Ironwood, Valerius, Hounds',
    body: 'Ironwood Break writes names in ledgers. Overseer Valerius hunts Sap thieves and unpermitted relic hoarders. Shard-Hounds follow the chip. Cartel Heat is patrol, paper, and a muzzle that is not for dogs. It is not a reward.',
  },
  seekers: {
    name: 'Seekers',
    watch: 'cloth, vessels, Sybella',
    body: 'Seekers want a cup that holds. Thalia loves a Vessel. Sybella hunts a walking amber battery — for her church, not yours. Seeker Heat is hymns, runners, and a skiff that treats you as inventory. She does not help Cartel. She does not help Dune-Strays.',
  },
  strays: {
    name: 'Strays',
    watch: 'Oil-Tooth, Silas, Kaelen the Sifter',
    body: 'Dune-Strays collect favors, shade, and invoices. Oil-Tooth hotwires. Silas sells minutes. Kaelen sells rumors. Stray Heat is being known by people who charge. Known is not safe.',
  },
}

export function heatRiseLine(faction: Faction, n: number): string {
  const f = HEAT_FACTIONS[faction]
  return `${f.name} Heat +${n} — attention, not XP. ${f.watch}.`
}
