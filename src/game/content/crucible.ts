import type { Scene } from '../types'

/** The Vessel's new opening: the Crucible Chambers under the Threshold Court. */
export const CRUCIBLE_SCENES = ['open:vessel', 'thresh:crucible-rig', 'thresh:crucible-stairs', 'thresh:court-guard'] as const

/** Only after the release-clamps alarm: the Court Guard waits at the dais steps. */
export const COURT_GUARD = 'thresh:court-guard'

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
        sub: 'Take his memories and a way out. He lives, with less of himself. The drum is hot: Health -2.',
        effects: {
          goto: NEXT,
          health: -2,
          add: { crucible_map: 1 },
          flag: { crucibleChoice: 'plate', crucibleMemory: true },
          flash: 'You pry the ledger plate out of the drum. His memories are on it now, and so is a scratched map of a way out. He sits in the frame, half-emptied, but alive. The drum\'s resin heat burns your hands. Health -2.',
        },
      },
      {
        id: 'slip',
        label: 'Slip past',
        sub: 'He stays. A Watcher on the stair sees you: Seeker Heat +1.',
        tone: 'quiet',
        effects: {
          goto: NEXT,
          heat: { seekers: 1 },
          flag: { crucibleChoice: 'slip' },
          flash: 'You keep to the wall and slip past. Behind you, resin pours over the frame. He joins the statues on the wall. Up on the stair, a Watcher saw you go. Seeker Heat rises.',
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
        show: { flagUnset: 'crucibleAlarm' },
        effects: {
          enterHub: 'threshold',
          goto: 'thresh:court',
          ticks: 1,
          heat: { seekers: 1 },
          flash: 'Heads bow a half-inch. Belief is a muscle. You flex it.',
        },
      },
      {
        id: 'keep',
        label: 'Keep the cloth on. Walk the Court.',
        sub: 'Gear: Drop, dagger, Oram\'s map, cloth. Thalia is already watching.',
        show: { flag: 'crucibleAlarm' },
        effects: {
          enterHub: 'threshold',
          goto: COURT_GUARD,
          ticks: 1,
          heat: { seekers: 1 },
        },
      },
    ],
  },
  {
    id: COURT_GUARD,
    hubId: 'threshold',
    kind: 'story',
    title: 'Dais Steps',
    body: `The Court Guard blocks the dais steps, falchion drawn.

"Vessels don't climb the stairs on their own."`,
    choices: [
      {
        id: 'fight',
        label: 'Fight him',
        sub: 'A real fight. Health takes the hits.',
        tone: 'danger',
        enable: { healthMin: 1 },
        locked: 'Too hurt to fight.',
        effects: {
          unsetFlag: ['encounterDone', 'encounterClash', 'encounterFlash', 'encounterRound', 'encounterStall', 'hunterHere', 'hunterFrom'],
          flag: { encounterHere: true, encounterKind: 'courtguard', encounterHp: 3 },
          ticks: 1,
          flash: 'The falchion comes up. This ground is the fight.',
        },
      },
      {
        id: 'lie',
        label: "Hand him the scavenger's lie",
        sub: '"He broke loose. I was chasing him."',
        enable: { item: 'crucible_map' },
        locked: 'Needs: Ledger-Plate Map',
        effects: {
          goto: 'thresh:court',
          ticks: 1,
          flag: { crucibleGuardFooled: true },
          flash: 'You show him the plate\'s map and point down the wrong corridor. He takes the stairs down at a run.',
        },
      },
      {
        id: 'thalia',
        label: 'Let Thalia call him off',
        sub: 'No fight. Seeker Heat +1. Thalia will remember.',
        tone: 'quiet',
        effects: {
          goto: 'thresh:court',
          ticks: 1,
          heat: { seekers: 1 },
          flag: { thaliaCalledOff: true },
          flash: 'Thalia says one word from the dais. He steps aside. She does not stop looking at you.',
        },
      },
    ],
  },
]
