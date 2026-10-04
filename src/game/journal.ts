import type { GameState } from './types'

export type Rumor = {
  id: string
  title: string
  flag: string
  body: string
}

export const RUMORS: Rumor[] = [
  {
    id: 'walking',
    title: 'The Walking Amber',
    flag: 'heardWalkingAmber',
    body: 'Heard once, under her breath, then never again. Seeker talk for something that walks out of the sand and should not. Street mouths will only give you the rumor. She will not repeat it.',
  },
  {
    id: 'kallik',
    title: "Kallik's second rib",
    flag: 'heardKallik',
    body: 'Kallik buried a haul in the Red Maw and never came back up. He carved a nine-tooth gear on the second rib from the jaw so he would not lose the place. Blind picks waste sap. The mark, the map-scar, and the scratch narrow it.',
  },
  {
    id: 'sybella',
    title: 'The woman on the skiff',
    flag: 'heardSybellaRumor',
    body: 'A Seeker on a sand-skiff. Cold of faith. She follows sap the way old roads follow light. Cartel mouths call her an enemy. Strays call her a reason to run.',
  },
  {
    id: 'opposed',
    title: 'Two hunters',
    flag: 'heardOpposed',
    body: 'Valerius wants a diagram and your feet. Sybella wants the sand to keep what the First Spire seals. They press from opposite sides. A lever, later, if you live long enough to use it.',
  },
  {
    id: 'draven',
    title: 'Caius Draven',
    flag: 'heardDraven',
    body: 'Valerius says the Carapace hunter was Caius Draven, a Cartel mercenary leader cast out after an expedition went wrong. Draven went over to the Dune-Strays and took the name Nim. He tracks people for pay and does not stop.',
  },
  {
    id: 'hoard',
    title: 'Unpermitted Hoard',
    flag: 'relicRumor',
    body: "Jaxson's stash and a clerk-mark crate in the Yard's vat-shadow. Better than a scavenge, if the latch opens. Valerius hunts the people who touch it.",
  },
]

export function knownRumors(state: GameState): Rumor[] {
  return RUMORS.filter((r) => !!state.flags[r.flag])
}
