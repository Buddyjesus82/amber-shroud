/**
 * The six skippable lore cards shown at New Game, before the door choice. Also replayable from the title.
 *
 * Lore lock: the Spire is sealed. The Seekers are camped at the Outer Threshold outside it and cannot open it.
 * What opens it is at Red Maw, so the Seekers send the Vessel out to fetch it. All three doors funnel into
 * Red Maw before the Spire. Do not name what opens the Spire here.
 */
export type IntroCard = {
  id: 'world' | 'sap' | 'cartel' | 'seekers' | 'strays' | 'doors'
  title: string
  /** File under public/intro/. The full image is always shown; the text sits below it. */
  img: string
  alt: string
  text: string
}

export const INTRO_CARDS: IntroCard[] = [
  {
    id: 'world',
    title: 'The Amber Shroud',
    img: 'world.jpg',
    alt: 'Parchment map: Camp-04 far west, Bleached Spine north, Outer Threshold beside the sealed Spire in the east, roads meeting at Red Maw',
    text: 'The Great Bleed tore the dunes open and uncovered the Spire in the east. It is sealed. Camp-04 sits far to the west, the Bleached Spine to the north, and the Outer Threshold right against the Spire. All three roads run to Red Maw.',
  },
  {
    id: 'sap',
    title: 'Sap',
    img: 'sap.jpg',
    alt: 'A cracked hand holding a vial of amber Sap labeled Drop',
    text: 'Sap is your thirst and your legs. Walking costs Sap, and it tops out at 8. A Drop is one vial of Oasis Sap: drink it for +3. Drops are also what people trade in. At 0 Sap, you dry out.',
  },
  {
    id: 'cartel',
    title: 'The Cartel',
    img: 'cartel.jpg',
    alt: 'A Cartel strip mine at sunset, carts and crates full of glowing amber shards',
    text: 'The Cartel owns Ironwood and its labor camps. Prisoners strip-mine the amber for memory shards, and the Cartel sells the cut. Camp-04 is their far west wire.',
  },
  {
    id: 'seekers',
    title: 'The Seekers',
    img: 'seekers.jpg',
    alt: 'Wrapped Seekers with Damascus falchions ring a burning amber shard on an altar while an Amber Husk stands behind them',
    text: 'The Seekers worship the shards and walk Amber Husks to guard what they claim. They are camped at the Outer Threshold, outside the Spire, and they cannot open its door. The way in lies at Red Maw.',
  },
  {
    id: 'strays',
    title: 'The Dune-Strays',
    img: 'strays.jpg',
    alt: 'A Dune-Stray camp of tents on sledges in the dunes, a Stray walking in',
    text: 'The Dune-Strays keep mobile camps on the Bleached Spine and run the cache roads the Cartel and the Seekers fight over. They answer to neither. They remember who paid and who did not.',
  },
  {
    id: 'doors',
    title: 'Three doors',
    img: 'doors.jpg',
    alt: 'Three doors: a Cartel wire camp, a Seeker cloth threshold, and a branded Stray outpost',
    text: 'Pick where you wake. Prisoner: Camp-04, the longest road. Outcast: the Bleached Spine, north. Vessel: the Outer Threshold, where the Seekers send you to Red Maw to bring back what opens the Spire. All three roads meet at Red Maw before the Spire.',
  },
]

/** Crossfade between scenes, ms. */
export const INTRO_FADE_MS = 1400

/**
 * How long a scene plays before it crossfades to the next, ms. About 8.5-13 s:
 * enough to read the card comfortably, longer for longer text.
 */
export function introCardMs(card: IntroCard): number {
  return Math.round(Math.min(13000, Math.max(8500, 4000 + card.text.length * 34)))
}
