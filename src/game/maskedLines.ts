/** The masked figure's numbers and lines. No imports, so the fight code can use them without a cycle. */
/** Where he walks. 'later-maps': Chapter One finished, the Maw on. 'whole-run': every hub and road scene too (not built into the ship; one word to flip). */
export const MASKED_WALKS: 'later-maps' | 'whole-run' = 'whole-run'
export const MASKED_ODDS = 2 // a sighting is 1 in this many arrivals
export const MASKED_GAP = 2 // scene steps between sightings: never two scenes in a row
export const MASKED_INTERRUPT_ODDS = 4 // when a hunt or ambush fires, 1 in this many he steps in
export const MASKED_ROUNDS = 3 // a fight with him ends by this round, whatever you do

// Approved lines.
export const MASKED_GLIMPSE_LINE = 'A masked figure stands on the ridge. By the time you look back, the ridge is empty.'
export const MASKED_BOOTS_LINE = 'Someone has been standing here. The sand still holds the shape of his boots.'
export const MASKED_FLAKE_LINE = 'A rust-colored flake lies on the stone, the size of a thumbnail. Metal, not rock.'
export const MASKED_BLOCK_LINE = "Across the wash, the hood turns toward you. The mask doesn't move."
export const MASKED_INTERRUPT_LINE = 'Whatever was hunting you stopped. Up the slope, a hooded shape stands where it was.'
export const MASKED_TOLL_LINE = 'The masked figure takes one scrap from your pack and leaves a Drop in its place. You never felt it.'
export const MASKED_STRIKE_LINE = "You swing. He catches your wrist, looks at you through the eyeholes, and lets go. Then he's gone."
export const MASKED_WALKS_OFF_LINE = 'He steps back into the storm. Not a scratch on him.'
// New lines (flagged for approval).
export const MASKED_GLIMPSE_LINES_EXTRA = [
  'A hooded shape stands in the heat-shimmer, facing you. Then only the shimmer.',
  'On the far rise, a mask catches the light once. Nothing is standing there when you look again.',
]
export const MASKED_DROP_LINE = 'A Drop stands upright on the stone, the stopper sealed. Whoever left it did not stay.'
export const MASKED_TAKE_DROP_LINE = 'You take the Drop.'
export const MASKED_CHASE_LINE = 'You go after him. He turns, hits you once, and is gone.'
export const MASKED_WAIT_LINE = 'You wait. When you look again the road is clear.'
