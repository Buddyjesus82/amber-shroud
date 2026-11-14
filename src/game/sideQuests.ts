/**
 * v245: Kaelen's three errands (K1-K3) and Varro the Bone-Stitcher's three (V1-V3). Jeramie approved the draft
 * (/workspace/side-quests-draft.md, t1261u). Every player-facing line is the draft's, word for word.
 *
 * Free to take. Taking one reveals its hidden spot's "Walk to <spot>" row on the host scene.
 * K1 and K2 pay when you hand the goods to Kaelen (stall or roaming pack). K3 and all of Varro's pay at the spot.
 * Like rumorJobs.ts: TYPES ONLY imports and string-literal item ids (bundle load order).
 */
import type { Choice, Cond, DoorId, Effect, GameState, ItemId, Scene } from './types'

const KNIFE_SUB = 'Needs the Needle Knife.'
const KNIFE_LOCKED = 'Needs: the Needle Knife'
const KNIFE: Cond = { item: 'needle_knife' }

/** Where Kaelen trades: his two stalls and the traveling pack. */
export const KAELEN_SCENES: ReadonlySet<string> = new Set(['camp:kaelen', 'thresh:kaelen', 'roam:kaelen'])
/** Varro the Bone-Stitcher, at his stall in the Bone Market. */
export const VARRO_SCENE = 'maw:zafir'

type Reward = { add: Partial<Record<ItemId, number>>; lines: string[] }
type Pin = { door?: DoorId; host: string; scene: string; hub: string; body: string; showAlso?: Cond }

export type SideQuest = {
  /** Flag stem: <id>Taken / <id>Got / <id>Done. */
  id: string
  giver: 'kaelen' | 'varro'
  title: string
  logTaken: string
  logDone: string
  handover: string | Record<DoorId, string>
  spot: string
  pins: Pin[]
  /** True: the goods go back to Kaelen for the reward. False: it pays at the spot. */
  turnIn: boolean
  turnInLine?: string
  reward: Reward
}

const K1_HAND = (where: string) =>
  `"A Stray courier dumped a crate of old packing by the ${where} before he bolted. Greased leather, tarred hemp. Dig it out and I'll trade you something useful."`

export const SIDE_QUESTS: SideQuest[] = [
  {
    id: 'sqBasin',
    giver: 'kaelen',
    title: 'Basin Packing',
    logTaken: 'A Stray courier dumped a crate of packing at a cracked basin. Kaelen will trade for it.',
    logDone: 'Kaelen took the packing. He paid in scrap and resin.',
    handover: { outcast: K1_HAND('Dry Well'), prisoner: K1_HAND('vent trough'), vessel: K1_HAND('drain conduits') },
    spot: 'Cracked Sluice',
    pins: [
      { door: 'outcast', host: 'spine:well', scene: 'spine:sq-sluice', hub: 'spine', body: "Behind the well's stones, a cracked sluice runs down to a catch-basin gone dry. Silt has baked over a wooden lid. One corner of a crate shows under it." },
      { door: 'prisoner', host: 'camp:vents', scene: 'camp:sq-sluice', hub: 'camp04', body: 'Under the pipe-run, a stone trough catches what the vents sweat. It cracked long ago and dried. A lid sits in it, caked with silt.' },
      { door: 'vessel', host: 'thresh:conduits', scene: 'thresh:sq-sluice', hub: 'threshold', body: 'Where the overflow pipes spill under the wall, a stone basin has cracked and drained. Sludge has dried to a crust over a lid.' },
    ],
    turnIn: true,
    turnInLine: `"Leather that still bends. Somebody's skiff runs another season." He counts it twice. "Here. Fair is fair."`,
    reward: { add: { scrap: 2, salve: 1 }, lines: ['Scrap +2.', 'Resin +1.'] },
  },
  {
    id: 'sqChute',
    giver: 'kaelen',
    title: 'Rib-Slide Chute',
    logTaken: 'Kaelen dropped a canvas sack down an iron chute in the ribs by the Wreck.',
    logDone: 'Kaelen has his sack back. He paid his cut.',
    handover: `"I dropped a canvas sack of Drops down the old chute in the ribs by the Wreck. My arm's too short and my pack won't fit. You might squeeze through."`,
    spot: 'Rib-Slide Chute',
    pins: [{ host: 'maw:tuner', scene: 'maw:sq-chute', hub: 'redmaw', body: 'A rusted iron drop-chute, wedged slantwise between two ribs above the drop. Slag and bone-dust choke the mouth. Something pale, canvas, sits a long reach down.' }],
    turnIn: true,
    turnInLine: `"All there. You didn't drink one. That's rarer than you'd think." He splits the bag. "Your cut."`,
    reward: { add: { scrap: 3, vial_drop: 1 }, lines: ['Scrap +3.', 'Drop +1.'] },
  },
  {
    id: 'sqCoils',
    giver: 'kaelen',
    title: 'Dead Signal Coils',
    logTaken: 'Cartel scavengers cached copper coils at a dead beacon post by Stilt Shade. Get there before the Seekers.',
    logDone: 'You cut the copper free before the Seekers swept it.',
    handover: `"Some Cartel scavengers cached a box of copper coils up by the dead beacon post past Stilt Shade. Cut it free before the Seeker patrols sweep it, and the stack is yours."`,
    spot: 'Dead Beacon Post',
    pins: [{ host: 'maw:stilt', scene: 'maw:sq-beacon', hub: 'redmaw', body: 'A beacon post, long dead, leaning out of the sand. A brass signal box hangs off it, salt-crusted shut. Charred copper coils spill from it in a tangle, baked dry and white with alkali.' }],
    turnIn: false,
    reward: { add: { scrap: 4, salve: 1 }, lines: ['Scrap +4.', 'Resin +1.'] },
  },
  {
    id: 'sqCulvert',
    giver: 'varro',
    title: 'Culvert Drop',
    logTaken: "A deserter's pouch is wedged in the culvert under the Siphon. Varro wants it found.",
    logDone: "You pulled the deserter's pouch out of the culvert.",
    handover: `"Men who leave the Seekers leave fast. One left a pouch in the culvert under the Siphon. He won't be back for it."`,
    spot: 'Culvert Drain-Pipe',
    pins: [{ host: 'ch3:siphon', scene: 'ch3:sq-culvert', hub: 'barrow', body: "A rust-caked pipe mouth under the Siphon's footing, wide enough for an arm. Runoff trickles out, slick with Sap. Something cloth-wrapped sits a reach inside." }],
    turnIn: false,
    reward: { add: { scrap: 3, salve: 1, vial_drop: 1 }, lines: ['Scrap +3.', 'Resin +1.', 'Drop +1.'] },
  },
  {
    id: 'sqSeam',
    giver: 'varro',
    title: 'Floor-Seam Stash',
    logTaken: "A stash is cut into a floor-seam outside Crosshaven's inner gates.",
    logDone: 'You pried the floor-seam stash outside Crosshaven.',
    handover: `"There's a stash cut into the old floor outside Crosshaven's inner gates. Pry the seam. Whatever's in it is yours. If there's cord, use it."`,
    spot: 'Foundry Floor-Seam',
    pins: [{ host: 'ch3:crosshaven', scene: 'ch3:sq-seam', hub: 'barrow', body: 'Past the shanties, an old foundry floor of cracked slag-stone. One seam runs too straight, packed with fresh grit. It rings hollow under your heel.' }],
    turnIn: false,
    reward: { add: { scrap: 4, sinew_cord: 1 }, lines: ['Scrap +4.', 'Sinew Cord +1.'] },
  },
  {
    id: 'sqDispatch',
    giver: 'varro',
    title: 'Dry-Well Dispatch',
    logTaken: 'A Seeker courier dropped a dispatch slate in a dry-well off the Citadel Approach. Varro wants it untouched.',
    logDone: 'Varro has the dispatch. The seal was still whole.',
    handover: `"A Seeker courier dropped a dispatch slate in the maintenance dry-well before he ran. Bring it back untouched, and I'll trade you something that keeps your throat wet."`,
    spot: 'Maintenance Dry-Well',
    // The collared wagon has no way out until you are free of it: the walk shows only after the escape.
    pins: [{ host: 'ch3:wagon', scene: 'ch3:sq-drywell', hub: 'barrow', body: 'A square shaft off the wagon road, iron rungs bolted down one wall. No water in it for a long time. Dust at the bottom, and something flat in an oilcloth wrap.', showAlso: { flag: 'ch3Out' } }],
    turnIn: false,
    reward: { add: { vial_drop: 1, scrap: 1 }, lines: ['Drop +1.', 'Scrap +1.'] },
  },
]

/** K3's turn-in line: flavor on Kaelen's next pass after the coils are cut free. */
export const COILS_HEARD = `"Heard the Seekers found an empty box. Good. I like them disappointed."`

const flag = (q: SideQuest, s: 'Taken' | 'Got' | 'Done' | 'Cleared') => `${q.id}${s}`
const statFlash = (line: string, lines: string[]) => `${line}\n\n${lines.join('\n')}`

export const SIDE_QUEST_SPOTS: readonly string[] = SIDE_QUESTS.flatMap((q) => q.pins.map((p) => p.scene))
export function isSideQuestSpot(sceneId: string): boolean {
  return SIDE_QUEST_SPOTS.includes(sceneId)
}

function handoverOf(q: SideQuest, door: DoorId): string {
  return typeof q.handover === 'string' ? q.handover : q.handover[door]
}

/** Kaelen's stall or pack, Varro's stall: the free take rows, and Kaelen's turn-ins. */
export function sideQuestGiverRows(state: GameState): Choice[] {
  const giver = KAELEN_SCENES.has(state.sceneId) ? 'kaelen' : state.sceneId === VARRO_SCENE ? 'varro' : null
  if (!giver) return []
  const rows: Choice[] = []
  for (const q of SIDE_QUESTS) {
    if (q.giver !== giver) continue
    if (!state.flags[flag(q, 'Taken')]) {
      rows.push({
        id: `sq-take-${q.id}`,
        label: q.title,
        effects: { flag: { [flag(q, 'Taken')]: true, ...(giver === 'kaelen' ? { kaelenKnown: true } : {}) }, ticks: 1, flash: handoverOf(q, state.door) },
      })
    } else if (q.turnIn && state.flags[flag(q, 'Got')] && !state.flags[flag(q, 'Done')]) {
      rows.push({
        id: `sq-turnin-${q.id}`,
        label: q.title,
        sub: q.reward.lines.join(' '),
        effects: { add: q.reward.add, flag: { [flag(q, 'Done')]: true }, ticks: 1, flash: statFlash(q.turnInLine ?? '', q.reward.lines) },
      })
    }
  }
  return rows
}

/** Host-scene rows: a taken errand's spot is one walk on, until the goods are in hand. */
export function sideQuestWalkRows(state: GameState): Choice[] {
  const rows: Choice[] = []
  for (const q of SIDE_QUESTS) {
    if (!state.flags[flag(q, 'Taken')] || state.flags[flag(q, 'Got')] || state.flags[flag(q, 'Done')]) continue
    for (const p of q.pins) {
      if (p.host !== state.sceneId || (p.door && p.door !== state.door)) continue
      if (p.showAlso && !state.flags[(p.showAlso as { flag: string }).flag]) continue
      rows.push({ id: `sq-walk-${q.id}`, label: `Walk to ${q.spot}`, effects: { goto: p.scene, ticks: 1 } })
    }
  }
  return rows
}

function pinChoices(q: SideQuest, p: Pin): Choice[] {
  const back = (flash: string, extra: Effect = {}): Effect => ({ ...extra, goto: p.host, ticks: 1, flash })
  const pay = (line: string): Effect => (q.turnIn ? back(line, { flag: { [flag(q, 'Got')]: true } }) : back(statFlash(line, q.reward.lines), { add: q.reward.add, flag: { [flag(q, 'Got')]: true, [flag(q, 'Done')]: true } }))
  switch (q.id) {
    case 'sqBasin':
      return [
        { id: 'clear', label: 'Clear the silt', show: { flagUnset: flag(q, 'Cleared') }, effects: { flag: { [flag(q, 'Cleared')]: true }, ticks: 1, flash: 'You scrape the lid clean with your fingers. A crate, Stray-marked. The latch is rust all through.' } },
        { id: 'pry', label: 'Pry the rusted latch', sub: KNIFE_SUB, tone: 'danger', show: { flag: flag(q, 'Cleared') }, enable: KNIFE, locked: KNIFE_LOCKED, effects: pay('The latch gives with a crack. Greased leather packing, tarred hemp rings, cured-hide seals. Old, but they still hold their shape.') },
        { id: 'leave', label: 'Leave the crate', tone: 'quiet', effects: back('You leave it to the silt. Kaelen will call that a lesson.') },
      ]
    case 'sqChute':
      return [
        { id: 'squeeze', label: 'Squeeze into the chute', sub: 'Health −1.', tone: 'danger', effects: { ...back(statFlash('You go in shoulder first. Jagged iron bites through your sleeve. Your fingers close on canvas.', ['Health −1.']), { flag: { [flag(q, 'Got')]: true } }), health: -1 } },
        { id: 'leave', label: 'Leave the chute', tone: 'quiet', effects: back('The slag settles. The sack stays where Kaelen lost it.') },
      ]
    case 'sqCoils':
      return [
        { id: 'cut', label: 'Cut the tangle free', sub: KNIFE_SUB, tone: 'danger', enable: KNIFE, locked: KNIFE_LOCKED, effects: pay('The crust cracks under the blade. You cut the tangle away, wire by wire. The core underneath is clean copper.') },
        { id: 'leave', label: 'Leave the post', tone: 'quiet', effects: back('The coils stay in the crust. The Seekers will find them first.') },
      ]
    case 'sqCulvert':
      return [
        { id: 'reach', label: 'Reach into the pipe', effects: pay('Cold sludge to the shoulder. Your fingers close on wet cloth. A pouch, knotted shut.') },
        { id: 'leave', label: 'Leave the pipe', tone: 'quiet', effects: back('The runoff keeps what it has.') },
      ]
    case 'sqSeam':
      return [
        { id: 'pry', label: 'Pry the seam', sub: KNIFE_SUB, tone: 'danger', enable: KNIFE, locked: KNIFE_LOCKED, effects: pay('The grit lifts out in a wedge. Under it, a bundle of scrap and a coil of sinew, oiled against the damp.') },
        { id: 'leave', label: 'Leave the seam', tone: 'quiet', effects: back('The grit stays packed. Someone else will find it.') },
      ]
    case 'sqDispatch':
      return [
        { id: 'climb', label: 'Climb down the rungs', effects: pay('The rungs hold. At the bottom, a slate in Seeker oilcloth. The seal is unbroken.') },
        { id: 'leave', label: 'Leave the shaft', tone: 'quiet', effects: back('The slate stays in the dust.') },
      ]
    default:
      return []
  }
}

/** The eight spot scenes (K1 has one per door). */
export const sideQuestScenes: Scene[] = SIDE_QUESTS.flatMap((q) =>
  q.pins.map((p) => ({ id: p.scene, hubId: p.hub, kind: 'story' as const, title: q.spot, body: p.body, choices: pinChoices(q, p) })),
)

/** Journal (Rumors log) entries: the taken line, replaced by the done line once it is settled. */
export function sideQuestLog(state: GameState): { id: string; title: string; body: string }[] {
  return SIDE_QUESTS.filter((q) => state.flags[flag(q, 'Taken')]).map((q) => ({ id: q.id, title: q.title, body: state.flags[flag(q, 'Done')] ? q.logDone : q.logTaken }))
}

/** K3: the first arrival at Kaelen after the coils are cut gets his line once. */
export function coilsHeard(before: GameState, next: GameState): GameState {
  if (!KAELEN_SCENES.has(next.sceneId) || before.sceneId === next.sceneId) return next
  if (!next.flags.sqCoilsDone || next.flags.sqCoilsHeard) return next
  return { ...next, flash: next.flash ? `${next.flash}\n\n${COILS_HEARD}` : COILS_HEARD, flags: { ...next.flags, sqCoilsHeard: true } }
}
