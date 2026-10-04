import type { EncounterKind } from './encounter'
import type { GameState } from './types'

/**
 * Road and Heat fights: per-fight ground, varied openers, and what each enemy does besides trade hits.
 * encounter.ts reads these. Every trick changes a number or ends the fight; none is flavor only.
 *
 * Enemy tricks (see resolveEncounter):
 *  - Amber-tick: a landed bite latches on. It drains 1 Sap a round until you pull it off or kill it.
 *  - Dust-jackal: sometimes two come (flank bite +1 while both stand). A jackal that bites you can snap
 *    up a scrap and bolt; kill it that round or the scrap is gone.
 *  - Waste scavenger: snatches a carried item after a landed hit and tries to run with it. Hurt to 1
 *    Health, it offers a twist of scrap to be let go.
 *  - Rim cutter: hurt to 1 Health, it limps for the scrap-shade; hit it that round or it gets away.
 *  - Shard-pup: crits twice as often.
 *  - Vent patrol: the shock baton can numb your arm; your next swing is 0.
 *  - Hound-handler: running is harder, and a failed run lets the hound bite (+1).
 *  - Overseer Valerius: Guard blunts only 1 of his baton.
 *  - Stray collector: hurt to 1 Health, he offers to call the debt square (Stray Heat -1, no loot).
 *  - Nim, the Carapace hunter: his first shot is the harpoon (+1) and it pins you; no Run until you land a hit.
 *
 * TODO(seekers): No Seekers of the Shroud encounter kind exists yet (Seeker turf rolls cutters,
 * jackals, ticks, and scavengers). When one is added, build it from this lore (Oct 2, 2026):
 *  - Cloth wrappings, hooked blades. They come in threes and fan out: one feints to test you,
 *    one circles wide, one hangs back with a pale hand raised and hums.
 *  - The hum shivers salt crystals and glass loose. Make it a real mechanic: it builds over rounds
 *    to rattle you or crack gear, unless you hit the hummer or break line of sight.
 *  - Throw sand or Feint can make them hesitate.
 *  - The mirage is the Outcast's own doing (never explained). It is already one form of the
 *    Outcast sand grip in resolveEncounter. Against Seekers it should also cut off the hum.
 * Dune-Strays have no powers. Only the Outcast player's sand answers him (sandSign.ts).
 */

export type TerrainId = 'slope' | 'loose' | 'wind' | 'vent' | 'shade' | 'open'

export type Terrain = {
  id: TerrainId
  line: string
  /** Added to your swing (floor 0). */
  you: number
  /** Added to their swing (floor 0). */
  them: number
  /** Added to their Strike (floor 0). */
  strike: number
  /** Both swings top out here. */
  cap?: number
  /** Added to the Run chance, in percent. */
  run: number
}

export const TERRAINS: Record<TerrainId, Terrain> = {
  slope: { id: 'slope', line: 'Ground: a slope, and you have the high side. Your swing +1. Running is easier.', you: 1, them: 0, strike: 0, run: 10 },
  loose: { id: 'loose', line: 'Ground: loose sand under your boots. Your swing -1. Running is harder.', you: -1, them: 0, strike: 0, run: -10 },
  wind: { id: 'wind', line: 'Ground: blowing sand. Neither of you can see well. Both swings top out at 1.', you: 0, them: 0, strike: 0, cap: 1, run: 0 },
  vent: { id: 'vent', line: 'Ground: a steam vent hisses between you, into their face. Their Strike -1.', you: 0, them: 0, strike: -1, run: 0 },
  shade: { id: 'shade', line: 'Ground: rock shade at your back and the sun in their eyes. Their swing -1.', you: 0, them: -1, strike: 0, run: 0 },
  open: { id: 'open', line: 'Ground: flat and open. It helps neither of you.', you: 0, them: 0, strike: 0, run: 0 },
}

export function terrainPool(state: Pick<GameState, 'hubId' | 'sceneId'>): TerrainId[] {
  const id = state.sceneId
  if (state.hubId === 'camp04' || id.startsWith('camp:') || id === 'ch1:p-pipe') return ['vent', 'slope', 'open', 'loose', 'vent']
  if (state.hubId === 'spine' || id.startsWith('spine:') || id.startsWith('ch1:o-')) return ['slope', 'loose', 'wind', 'shade', 'open']
  return ['wind', 'loose', 'slope', 'open', 'shade']
}

/** Three ways each enemy can show up. The first is the catalog line. */
export const OPENERS: Record<EncounterKind, string[]> = {
  jackal: [
    'A dust-jackal blocks the grit — ribs like wire, eyes like spent Glints. It will take a hand or a skip.',
    'A dust-jackal comes out of the grit low and fast, ears flat. It wants whatever you are carrying.',
    'Something thin and grey trots beside you, then cuts in front. A dust-jackal, ribs showing, teeth out.',
  ],
  cutter: [
    'A rim-cutter stands up out of scrap-shade. Half a person, half a stolen knife. Knife-smile. Saleable pockets. Optional throat.',
    'A rim cutter steps out from behind a slab with a stolen knife held low. "Pockets," he says.',
    'Someone was waiting in the scrap-shade. A rim cutter, knife out, standing between you and the road.',
  ],
  tick: [
    "An amber-tick clings to a rib of rock, fat with somebody else's Drop. You can crack it or leave it humming.",
    'An amber-tick drops off a ledge onto the path in front of you, swollen and humming.',
    'The rock beside you moves. An amber-tick, fat with sap, turns toward the warmest thing near it, which is you.',
  ],
  pup: [
    'A Shard-pup, already a jaw. Cartel leftovers. Fight or give the road.',
    'A Shard-pup climbs out of a ditch with resin on its jaw. No handler. No leash.',
    'Claws on stone behind you. A Shard-pup, half-grown, Cartel-bred, and hungry.',
  ],
  scavenger: [
    'A waste scavenger blocks the grit. A person who robs travelers who look alone. Stolen knife. Empty pockets. Optional throat.',
    'A waste scavenger in patched rags falls into step beside you, then stops in front. Knife out, eyes on your belt.',
    'A waste scavenger gets up from behind a dune, where it was waiting for someone alone. It looks at your pack before your face.',
  ],
  patrol: [
    'Vent patrol. One clerk, shock baton, standing on the bolt. A short scrap. Then the vent, or not.',
    'A vent clerk turns around with the shock baton already humming. "You are not on the roster."',
    'The vent patrol clerk plants his feet on the bolt and thumbs the baton on.',
  ],
  handler: [
    'The Hound-handler. Lean kit, shock-leash, an amber-eyed shard-hound at his heel with its eyes open. He is the fight. The hound stays on the leash.',
    "The Hound-handler lets the hound's lead out a hand's width and steps in with the shock-leash.",
    'Boots and a chain. The Hound-handler walks up with the hound on a short lead, the shock-leash in his free hand.',
  ],
  overseer: [
    'Overseer Valerius. Bald, scarred, steam baton in the fist. He came himself.',
    'Overseer Valerius sets his feet and lets the steam baton hiss. "Useful or broken. Choose."',
    'Valerius rolls his shoulders under the iron plating. The baton hisses. He does not call for help.',
  ],
  collector: [
    '',
    'The Stray collector draws a short knife and waves his two friends back down-slope. "Just you and me."',
    'The collector says your name again and steps in with the knife held low.',
  ],
  carapace: [
    '',
    'Nim levels the harpoon rifle from range. The barbed head points at your chest.',
    'He fires first and says nothing. The harpoon line is already in the air.',
  ],
}

export const PAIR_LINE = 'A second dust-jackal circles behind you. While both stand, one bites at your flank.'

export function hash(state: Pick<GameState, 'ticks' | 'sceneId'>, salt: string, extra = 0): number {
  let h = (Math.imul(state.ticks + 0x9e37 + extra * 977, 2654435761) + 40503) >>> 0
  for (const ch of state.sceneId + salt) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 13
  return h >>> 0
}

/** Outcast only, once a fight, when it is going badly. Never explained. */
export type GripForm = 'slide' | 'mirage'

/**
 * Outcast only, at most once a fight. The sand either slides out from under the enemy, or a mirage of
 * him draws the swing (the hero casts it; the game never says so). Either way the hit misses.
 */
export function sandGripLine(name: string, beast: boolean, form: GripForm = 'slide', proper = false): string {
  const the = proper ? name : `the ${name}`
  if (form === 'mirage') {
    return beast
      ? `The air shimmers. For a moment there are two of you, and ${the} lunges at the one that is not there. Its bite closes on nothing.`
      : `The air shimmers. For a moment there are two of you, and ${the} swings at the one that is not there. The blow cuts through heat.`
  }
  return beast
    ? `The sand under ${the} slides out from under its feet, all at once. Its bite goes wide.`
    : `The sand under ${the}'s boots slides out from under them, all at once. The swing goes wide.`
}

/** Only the Outcast player. Enemies and the rest of the fight are the same on every door. */
export function sandAnswers(state: Pick<GameState, 'door'>): boolean {
  return state.door === 'outcast'
}
