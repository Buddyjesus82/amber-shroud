/**
 * The Spine's hunter. One swappable spot.
 *
 * Stray Heat drives this hunt on Spine ground. Today the face is an unnamed Stray collector
 * so the Outcast door is not borrowing Overseer Valerius from Camp-04.
 *
 * TODO(designer): replace this block with the Spine's own hunter. Swap `face`, the copy,
 * and (optionally) the fight stats. Nothing else in the engine needs to change: hunter.ts,
 * art.ts, look.ts, and encounter.ts all read from here.
 */
export const SPINE_HUNTER = {
  /** Speaker name on the pressure card. */
  face: 'Stray collector',
  /** Appended to the scene while the hunt is on this ground. */
  append: `A Stray collector walks up onto this ground and says your name. Two more wait down-slope in the shade.

"You took from the Spine. Pay it back, or pay it here." You stay on this ground. Pay, fight, hide, or pick a road.`,
  /** `look` while the hunt is on this ground. */
  look: 'A Stray collector has your name. Two more wait down-slope. Pay, fight, or hide.',
  fightLabel: 'Fight the collector',
  fightSub: 'The one who said your name. You stay.',
  fightOpen: 'You go for the collector. The two down-slope stay where they are. This ground is the fight.',
  /** Encounter card for the fight. */
  encounter: {
    name: 'Stray collector',
    strike: 3,
    shell: 1,
    hp: 2,
    line: 'A Stray collector. Resin under the nails, a short knife, two friends down-slope who stay out of it.',
  },
  /** Scene art key while the hunt is on this ground. */
  art: 'hunger',
} as const
