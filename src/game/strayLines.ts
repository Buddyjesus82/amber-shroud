/** Stray Hunter copy and fight stats. No imports: encounter.ts reads this too. */
export const STRAY_HUNTER_NAME = 'Stray Hunter'
export const STRAY_ARRIVAL_LINE = 'Someone is reading your trail. A stake stands in the sand ahead, and the cord on it is fresh.'
export const STRAY_HOUND_LINE = "A Stray steps off the ridge with a shard-hound at heel. The hound's spine glitters. It already has your scent."
export const STRAY_OUTCAST_LINE = '"Your kind let you walk out. They never said you could walk far."'
// Pending approval: result lines for the three buttons.
export const STRAY_CUT_SUB = 'Costs 1 Sap. You lose them.'
export const STRAY_CUT_LINE = 'You cut your trail across hard grit. When you look back, the stake is alone.'
export const STRAY_CUT_FAIL_LINE = 'The cord on the stake twitches. They are still on your trail.'
export const STRAY_FEED_SUB = 'Costs a Drop. The hound loses interest.'
export const STRAY_FEED_LINE = 'The hound takes the Drop and sits. Without it, the Stray will not follow.'
export const STRAY_FIGHT_SUB = 'A real fight. Health takes the hits.'
export const STRAY_KILL_LINE = 'Stray Heat +1.'

/** v224: the Bone Wash Stray. Unnamed. A type, met once on this road as an individual. */
export const BONE_WASH_HOT =
  'A stake in the sand. Fresh cord. A Stray on the ridge, chitin stitched over leather, a long rifle across the knees. Shard-hounds pace the wash below. "Trail\'s loud. Stake\'s set."'
export const BONE_WASH_TRADE = 'Same figure, rifle down. "You brought something that keeps. I trade. I don\'t guide."'
export const BONE_WASH_WIN = 'The cord goes slack. Another stake will come.'
export const BONE_WASH_SCRAP = 'Scrap +2.'
export const BONE_SLIP_SUB = 'Needs the Dust Cloak.'
export const BONE_SLIP_LINE = 'Cloak down, wind up. The hounds take the wrong scent.'
export const BONE_PAY_SUB = 'Costs 3 scrap.'
export const BONE_PAY_LINE = 'The hunter counts it. Doesn\'t nod. Cord comes up.'
export const BONE_SIGN_SUB = 'Costs 2 scrap.'
export const BONE_SIGN_LINE = 'Prints. East wash. Don\'t follow them twice.'
export const BONE_HIDE_SUB = 'Costs the Hound Hide.'
export const BONE_HIDE_LINE = 'That hide walks quieter than you do. Keep to stone.'
export const BONE_FEED_LABEL = 'Feed the hounds a Drop'

export const STRAY_HUNTER_ENCOUNTERS = {
  strayhunter: { name: STRAY_HUNTER_NAME, strike: 3, shell: 1, hp: 2, line: STRAY_ARRIVAL_LINE },
  strayhound: { name: STRAY_HUNTER_NAME, strike: 3, shell: 2, hp: 4, line: STRAY_HOUND_LINE },
} as const

