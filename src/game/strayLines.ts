/** Stray Hunter copy and fight stats. No imports: encounter.ts reads this too. */
export const STRAY_HUNTER_NAME = 'Stray Hunter'
export const STRAY_ARRIVAL_LINE = 'Someone is reading your trail. A stake stands in the sand ahead, and the cord on it is fresh.'
export const STRAY_HOUND_LINE = "A Stray steps off the ridge with a shard-hound at heel. The hound's spine glitters. It already has your scent."
export const STRAY_OUTCAST_LINE = '"Your kind let you walk out. They never said you could walk far."'
// Pending approval: result lines for the three buttons.
export const STRAY_CUT_SUB = 'Costs 1 Sap. A chance to lose them.'
export const STRAY_CUT_LINE = 'You cut your trail across hard grit. When you look back, the stake is alone.'
export const STRAY_CUT_FAIL_LINE = 'The cord on the stake twitches. They are still on your trail.'
export const STRAY_FEED_SUB = 'Costs a Drop. The hound loses interest.'
export const STRAY_FEED_LINE = 'The hound takes the Drop and sits. Without it, the Stray will not follow.'
export const STRAY_FIGHT_SUB = 'A real fight. Health takes the hits.'
export const STRAY_KILL_LINE = 'Stray Heat +1.'

export const STRAY_HUNTER_ENCOUNTERS = {
  strayhunter: { name: STRAY_HUNTER_NAME, strike: 3, shell: 1, hp: 2, line: STRAY_ARRIVAL_LINE },
  strayhound: { name: STRAY_HUNTER_NAME, strike: 3, shell: 2, hp: 4, line: STRAY_HOUND_LINE },
} as const

