import type { Scene } from '../types'

/** The Vessel's new opening: the Crucible Chambers under the Threshold Court. */
export const CRUCIBLE_SCENES = ['open:vessel', 'thresh:crucible-rig', 'thresh:crucible-stairs'] as const

const NEXT = 'thresh:crucible-stairs'

export const crucibleScenes: Scene[] = [
  {
    id: 'thresh:crucible-rig',
    kind: 'story',
    title: 'The Extraction Rig',
    body: `At the far end, a scavenger is clamped into a brass frame that's humming, with straps at his wrists, chest, and ankles and a brace locking his head. Tubes run from his temples into a ledger-drum, and every time it turns, he forgets a little more.

"Please. What's my name? I had it a second ago."`,
    choices: [
      {
        id: 'release',
        label: 'Release the clamps',
        sub: 'Seeker Heat goes up. The Guard will come.',
        tone: 'danger',
        effects: {
          goto: NEXT,
          heat: { seekers: 1 },
          flag: { crucibleChoice: 'release', crucibleAlarm: true },
          flash: 'You yank the rig\'s release lever. The frame unlocks, and he drops free. The drum starts to howl, and boots start down the stairs. The Guard is coming.',
        },
      },
      {
        id: 'plate',
        label: 'Pull the ledger plate',
        sub: 'Take his memories and a way out. He lives, with less of himself.',
        effects: {
          goto: NEXT,
          add: { crucible_map: 1 },
          flag: { crucibleChoice: 'plate', crucibleMemory: true },
          flash: 'You pry the ledger plate out of the drum. His memories are on it now, and so is a scratched map of a way out. He sits in the frame, half-emptied, but alive.',
        },
      },
      {
        id: 'slip',
        label: 'Slip past',
        sub: 'No Heat. He stays.',
        tone: 'quiet',
        effects: {
          goto: NEXT,
          flag: { crucibleChoice: 'slip' },
          flash: 'You keep to the wall and slip past. Behind you, resin pours over the frame. He joins the statues on the wall.',
        },
      },
    ],
  },
  {
    id: NEXT,
    kind: 'story',
    title: 'The Stairs',
    speaker: 'Thalia',
    body: `Thalia waits at the top of the stairs.

"You think we're killing them. We're the only ones keeping them. The sand would take everything."

They put the cloth on you because a Vessel is a walking cup and you have a spine that can still hold liquid. A rusted dagger sits against your ribs under the gold thread — kitchen steel, dishonest, yours.

The Seekers camp in a fallen spire to the southeast. The sealed Spire lies beyond Red Maw, and they cannot open it. What opens it is at Red Maw, so they are sending their Vessel down the road to bring it back. That is you.`,
    choices: [
      {
        id: 'keep',
        label: 'Keep the cloth on. Walk the Court.',
        sub: 'Gear: Drop, dagger, Oram\'s map, cloth. Thalia is already watching.',
        effects: {
          enterHub: 'threshold',
          goto: 'thresh:court',
          ticks: 1,
          heat: { seekers: 1 },
          flash: 'Heads bow a half-inch. Belief is a muscle. You flex it.',
        },
      },
    ],
  },
]
