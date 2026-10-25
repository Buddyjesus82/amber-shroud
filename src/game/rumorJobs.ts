/**
 * v163: Kaelen's nine side-trouble leads, three per door, in the relic-hoard shape (pitch row, walk row, Look / Take / Leave).
 *
 * Pure data and helpers. It imports TYPES ONLY and uses string-literal item ids: the production bundle loads modules in a
 * different order than tsx, and a content file that reads kit.ts or catalog.ts at load blanked the screen in v160.
 * The smoke script guards this file (and rumorSpots.ts) against that import.
 */
import type { Choice, Cond, DoorId, Effect, GameState } from './types'

export type JobTake = {
  /** Which Take row this is when a job has variants. Variants are mutually exclusive by their show conds. */
  id: string
  sub: string
  flash: string
  show?: Cond
  effects: Effect
  /** Fight on take (Vent patrol). The line is the take flash, because an ambush replaces the flash. */
  ambush?: { kind: string }
}

export type RumorJob = {
  /** Flag stem: <id>Rumor / <id>Looked / <id>Taken / <id>Seen. */
  id: string
  door: DoorId
  /** The door's home hub. The row sells only there. */
  hub: string
  /** The scene the spot is on (the walk row shows there once the rumor is bought). */
  host: string
  spotScene: string
  spot: string
  body: string
  cost: { item: 'scrap' | 'glints'; n: number }
  row: { label: string; sub: string; pitch: string }
  look: { label: string; flash: string }
  takeLabel: string
  takes: JobTake[]
  leave: { label: string; flash: string }
}

const NO_SHIV: Cond = { not: { item: 'shiv' } }
const HAS_SHIV: Cond = { item: 'shiv' }
const NOT_HELPED: Cond = { flagUnset: 'corvinHelped' }
const HELPED: Cond = { flag: 'corvinHelped' }
/** Head wraps (head_wrap, knotted_wrap, plated_head_wrap; not the Ossa token). The smoke script checks this list against the catalog. */
export const HEAD_GEAR = ['head_wrap', 'knotted_wrap', 'plated_head_wrap'] as const
const HAS_HEAD: Cond = { any: HEAD_GEAR.map((id) => ({ item: id })) } as Cond
const NO_HEAD: Cond = { not: HAS_HEAD }
const CORVIN_LINE = ' Corvin will know whose hands lifted it.'
const LESSON = 'Kaelen would call that a lesson. He would still charge for the next one.'

export const RUMOR_JOBS: RumorJob[] = [
  {
    id: 'scrip',
    door: 'prisoner',
    hub: 'camp04',
    host: 'camp:cages',
    spotScene: 'camp:rumor-scrip',
    spot: 'Third Pen Board',
    body: 'The Pens, a floor of worn boards. The third one from the wall sits a hair high, like it has been lifted and set back more than once.',
    cost: { item: 'scrap', n: 1 },
    row: {
      label: 'Buy a side-trouble lead: scrip under the boards',
      sub: '1 scrap. A heading. The Pens are still a walk.',
      pitch: '"A clerk hid his own pay under the third pen board. He died before payday. Scrip does not care who spends it."',
    },
    look: {
      label: 'Press the third board',
      flash: 'It gives under your thumb. Something flat under it, wrapped in cloth. A hide-place, not a shelf.',
    },
    takeLabel: 'Lift the board. Take the pay.',
    takes: [
      {
        id: 'take',
        sub: 'Cartel scrip and a Glint.',
        show: { not: { heatMin: ['cartel', 4] } },
        flash: "The board lifts. Scrip, a Glint, and a dead clerk's honesty.",
        effects: { add: { scrip: 1, glints: 1 } },
      },
      {
        id: 'take-risk',
        sub: 'Cartel scrip and a Glint. Cartel Heat +1.',
        show: { heatMin: ['cartel', 4] },
        flash: "Scrip, a Glint. A clerk's pay does not stay quiet in a hand the Cartel is already counting. Cartel Heat +1.",
        effects: { add: { scrip: 1, glints: 1 }, heat: { cartel: 1 } },
      },
    ],
    leave: {
      label: 'Leave the board. Keep the rumor.',
      flash: `You paid for a board you did not lift. The Pens go on creaking. ${LESSON}`,
    },
  },
  {
    id: 'valve',
    door: 'prisoner',
    hub: 'camp04',
    host: 'camp:vents',
    spotScene: 'camp:rumor-valve',
    spot: 'Brass Valve',
    body: 'Pipe-run along the vent wall, one brass valve with a patrol\'s scratch-marks around it. The steam does not care who reads it.',
    cost: { item: 'glints', n: 1 },
    row: {
      label: 'Buy a side-trouble lead: the brass valve',
      sub: '1 Glint. A heading. The Vents are still a walk.',
      pitch: '"The patrol logs its rounds on a brass valve. Turn it twice and the log forgets you."',
    },
    look: {
      label: 'Read the scratches',
      flash: 'A tally of rounds in a patient hand. Two tight turns would reset the count. A patrol that checked would see.',
    },
    takeLabel: 'Turn it twice.',
    takes: [
      {
        id: 'take',
        sub: 'A Drop. Cartel Heat cools.',
        flash: 'Two turns. The valve sighs. Somewhere a ledger loses a line.',
        effects: { add: { vial_drop: 1 }, heat: { cartel: -1 } },
      },
    ],
    leave: {
      label: 'Leave the valve. Keep the rumor.',
      flash: 'You paid for a valve you did not turn. The vents hiss on. The log keeps your name.',
    },
  },
  {
    id: 'crate',
    door: 'prisoner',
    hub: 'camp04',
    host: 'camp:bay',
    spotScene: 'camp:rumor-crate',
    spot: "Vetch's Crate",
    body: "Under the hull's shadow, a crate with a fresh weld-bead along the lid. It is not on any tally, and Vetch's welds are clean enough to notice a cheap one.",
    cost: { item: 'scrap', n: 2 },
    row: {
      label: 'Buy a side-trouble lead: a crate in the bay',
      sub: '2 scrap. A heading. The Bay is still a walk.',
      pitch: '"Vetch welds over a crate he did not log. Medicine, by the smell."',
    },
    look: {
      label: 'Smell the weld',
      flash: 'Antiseptic and hot metal. Resin Salve, by the smell, and a lot of it. The weld is a seal, not a lock.',
    },
    takeLabel: 'Crack the weld. Take the salve.',
    takes: [
      {
        id: 'take',
        sub: 'Resin Salve x2.',
        show: { not: { heatMin: ['cartel', 5] } },
        flash: 'The seal breaks with a pop. Resin Salve, two tins, and a cut that will talk about them tomorrow.',
        effects: { add: { salve: 2 } },
      },
      {
        id: 'take-risk',
        sub: 'Resin Salve x2. Vetch may notice. That means a Vent patrol.',
        show: { heatMin: ['cartel', 5] },
        flash: 'Resin Salve, two tins. A shape turns in the hull-shade. Vetch. A Vent patrol is already coming.',
        effects: { add: { salve: 2 } },
        ambush: { kind: 'patrol' },
      },
    ],
    leave: {
      label: 'Leave the crate. Keep the rumor.',
      flash: `You paid for medicine you did not carry off. Vetch keeps welding. ${LESSON}`,
    },
  },
  {
    id: 'well',
    door: 'outcast',
    hub: 'spine',
    host: 'spine:well',
    spotScene: 'spine:rumor-well',
    spot: 'Well Marker',
    body: 'The stones of the dry well, a mark scratched low where only someone kneeling would see. Newer than the brick. Older than the letters above it.',
    cost: { item: 'scrap', n: 1 },
    row: {
      label: 'Buy a side-trouble lead: a marker in the well',
      sub: '1 scrap. A heading. The Well is still a walk.',
      pitch: '"Strays cut a marker in the well wall. Water under it, for their own. You are their own, if you are quiet."',
    },
    look: {
      label: 'Kneel at the mark',
      flash: 'A cut like a closed hand. The stone behind it sounds hollow. A hide-place in a place that has been an argument for thirty years.',
    },
    takeLabel: 'Pry the stone. Take the water.',
    takes: [
      {
        id: 'take',
        sub: 'Two Drops. Strays Heat cools.',
        flash: 'The stone lifts. Two Drops, wrapped and cold. Strays Heat cools. They will have seen who knelt.',
        effects: { add: { vial_drop: 2 }, heat: { strays: -1 } },
      },
    ],
    leave: {
      label: 'Leave the marker. Keep the rumor.',
      flash: `You paid for a well you did not drain. The dust settles over the mark. ${LESSON}`,
    },
  },
  {
    id: 'corvin',
    door: 'outcast',
    hub: 'spine',
    host: 'spine:hound',
    spotScene: 'spine:rumor-corvin',
    spot: 'Buried Cache',
    body: 'The boot-prints stop at a slab of rock with one stone set a shade neater than the rest. Short stride. A man trying not to run.',
    cost: { item: 'glints', n: 1 },
    row: {
      label: "Buy a side-trouble lead: the deserter's stash",
      sub: '1 Glint. A heading. The boot-prints are still a walk.',
      pitch: '"The deserter buried what he stole from Ironwood. He would rather you have it than the Hound."',
    },
    look: {
      label: 'Lift the neat stone',
      flash: 'Disturbed sand under it. Something wrapped, buried with care, by someone who meant to come back and did not want to be followed.',
    },
    takeLabel: 'Dig it out. Take the haul.',
    takes: [
      {
        id: 'take-shiv',
        sub: 'A shiv, or scrap if you already carry one. Corvin hears of it.',
        show: { all: [NO_SHIV, NOT_HELPED] },
        flash: `A Cartel shiv, still oiled. Whoever buried it did not think he would be the one to need it.${CORVIN_LINE}`,
        effects: { add: { shiv: 1 }, flag: { corvinHelped: true } },
      },
      {
        id: 'take-shiv-known',
        sub: 'A shiv, or scrap if you already carry one. Corvin hears of it.',
        show: { all: [NO_SHIV, HELPED] },
        flash: 'A Cartel shiv, still oiled. Whoever buried it did not think he would be the one to need it.',
        effects: { add: { shiv: 1 } },
      },
      {
        id: 'take-scrap',
        sub: 'A shiv, or scrap if you already carry one. Corvin hears of it.',
        show: { all: [HAS_SHIV, NOT_HELPED] },
        flash: `Scrap, three pieces, and the wrapping. Whoever buried it did not think he would be the one to need it.${CORVIN_LINE}`,
        effects: { add: { scrap: 3 }, flag: { corvinHelped: true } },
      },
      {
        id: 'take-scrap-known',
        sub: 'A shiv, or scrap if you already carry one. Corvin hears of it.',
        show: { all: [HAS_SHIV, HELPED] },
        flash: 'Scrap, three pieces, and the wrapping. Whoever buried it did not think he would be the one to need it.',
        effects: { add: { scrap: 3 } },
      },
    ],
    leave: {
      label: 'Leave the cache. Keep the rumor.',
      flash: `You paid for a hole you did not dig. The slab keeps its secret. ${LESSON}`,
    },
  },
  {
    id: 'tally',
    door: 'outcast',
    hub: 'spine',
    host: 'spine:ridge',
    spotScene: 'spine:rumor-tally',
    spot: 'Notched Bone',
    body: "A long bone planted in the rock at the ridge's edge, pale as the rest. Notches along one side, cut with a patient blade.",
    cost: { item: 'scrap', n: 2 },
    row: {
      label: 'Buy a side-trouble lead: a bone with notches',
      sub: '2 scrap. A heading. The Ridge is still a walk.',
      pitch: '"The collector notches a bone for every Stray he sells. Break the bone, sell the notches."',
    },
    look: {
      label: 'Count the notches',
      flash: 'Too many to be a tally of anything kind. Fresh cuts at the top. Someone is still adding.',
    },
    takeLabel: 'Break the bone. Sell the notches.',
    takes: [
      {
        id: 'take',
        sub: 'Two Glints. The collector hunts you next: Strays Heat +1.',
        flash: 'It cracks across the notches. Two Glints from the right buyer. The collector will count the missing bone before he counts anything else. Strays Heat +1.',
        effects: { add: { glints: 2 }, heat: { strays: 1 } },
      },
    ],
    leave: {
      label: 'Leave the bone. Keep the rumor.',
      flash: `You paid for a bone you did not break. The notches go on. ${LESSON}`,
    },
  },
  {
    id: 'reliquary',
    door: 'vessel',
    hub: 'threshold',
    host: 'thresh:court',
    spotScene: 'thresh:rumor-reliquary',
    spot: 'Shrine Bowl',
    body: "At the Court's edge, a shallow bowl under a stone spout. Resin drips in slow beats. A faded cloth is tied about it, the way you would tie a wound.",
    cost: { item: 'glints', n: 1 },
    row: {
      label: 'Buy a side-trouble lead: the shrine bowl',
      sub: '1 Glint. A heading. The Court is still a walk.',
      pitch: '"The shrine bowl catches resin the Court says is holy. Holy drips the same as any other."',
    },
    look: {
      label: 'Watch the drip',
      flash: 'One drop, a long breath, another. Thick and gold. It drips the same as any resin.',
    },
    takeLabel: "Catch the drip. Take the bowl's share.",
    takes: [
      {
        id: 'take',
        sub: 'A Drop and Resin Salve. Seeker Heat +1.',
        flash: "The vial fills in a long breath. A Drop, and a smear of Resin Salve on your fingers. Somebody's chant misses a beat. Seeker Heat +1.",
        effects: { add: { vial_drop: 1, salve: 1 }, heat: { seekers: 1 } },
      },
    ],
    leave: {
      label: 'Leave the bowl. Keep the rumor.',
      flash: `You paid for a bowl you did not drain. The drip does not mind. ${LESSON}`,
    },
  },
  {
    id: 'tack',
    door: 'vessel',
    hub: 'threshold',
    host: 'thresh:paddock',
    spotScene: 'thresh:rumor-tack',
    spot: 'Spare Tack',
    body: 'The paddock rail, with straps and bridles hung where the animals cannot reach and the handlers do not glance. One bundle is tied tighter than the rest.',
    cost: { item: 'scrap', n: 1 },
    row: {
      label: 'Buy a side-trouble lead: spare tack',
      sub: '1 scrap. A heading. The Paddock is still a walk.',
      pitch: `"Oram hangs spare tack where the runners don't look. Some of it is not rope."`,
    },
    look: {
      label: 'Check the tight bundle',
      flash: 'Straps, a buckle, and under them something soft, folded small. Cloth knotted a certain way.',
    },
    takeLabel: 'Untie it. Take what is not rope.',
    takes: [
      {
        id: 'take-wrap',
        sub: 'A knotted wrap for your head, or 2 scrap if you already have one.',
        show: NO_HEAD,
        flash: 'A knotted wrap, headgear, dry and clean. Straps and a buckle stay on the rail.',
        effects: { add: { knotted_wrap: 1 } },
      },
      {
        id: 'take-scrap',
        sub: 'A knotted wrap for your head, or 2 scrap if you already have one.',
        show: HAS_HEAD,
        flash: 'Two scrap, and a strap you leave on the rail. You already wear what the cloth was for.',
        effects: { add: { scrap: 2 } },
      },
    ],
    leave: {
      label: 'Leave the tack. Keep the rumor.',
      flash: `You paid for a bundle you did not untie. The rail creaks. ${LESSON}`,
    },
  },
  {
    id: 'ledger',
    door: 'vessel',
    hub: 'threshold',
    host: 'thresh:court',
    spotScene: 'thresh:rumor-ledger',
    spot: 'The Page',
    body: 'Behind the dais, a ledger bound in plain cloth. The binding gives a little where one page has been handled often.',
    cost: { item: 'scrap', n: 2 },
    row: {
      label: 'Buy a side-trouble lead: a page of the doubters',
      sub: '2 scrap. A heading. The Court is still a walk.',
      pitch: '"Thalia keeps a page of the faithful who doubted. Your name is on it. Paper burns."',
    },
    look: {
      label: 'Find the page',
      flash: 'A column of names in one careful hand. Yours is on it, with a mark beside it that is not a blessing.',
    },
    takeLabel: 'Tear it out. Burn the page.',
    takes: [
      {
        id: 'take',
        sub: 'Seeker Heat \u22122. Once.',
        flash: 'The page curls and goes. Seeker Heat \u22122. Somewhere a ledger has a gap in it, and nobody will remember why.',
        effects: { heat: { seekers: -2 } },
      },
    ],
    leave: {
      label: 'Leave the page. Keep the rumor.',
      flash: `You paid for a page you did not burn. The ledger keeps its place. ${LESSON}`,
    },
  },
]

export const RUMOR_SPOT_IDS: readonly string[] = RUMOR_JOBS.map((j) => j.spotScene)
export const WALK_SUB = 'Connected roads. Kaelen does not dump you there.'

const f = (j: RumorJob, suffix: 'Rumor' | 'Looked' | 'Taken' | 'Seen') => `${j.id}${suffix}`

export function isRumorSpot(sceneId: string): boolean {
  return RUMOR_SPOT_IDS.includes(sceneId)
}

/** The hub the player stands in. The traveling pack remembers the hub it last passed through. */
export function rumorHub(state: GameState): string | null | undefined {
  if (state.sceneId.startsWith('roam:kaelen')) {
    const remembered = state.flags.kaelenHub
    if (typeof remembered === 'string' && remembered) return remembered
  }
  return state.hubId
}

/** Jobs this door sells at its home hub. */
export function jobsHere(state: GameState): RumorJob[] {
  const hub = rumorHub(state)
  return RUMOR_JOBS.filter((j) => j.door === state.door && j.hub === hub)
}

/** Shelf rows (Side trouble): the unbought leads of this door, at its home hub only. */
export function jobBuyRows(state: GameState): Choice[] {
  return jobsHere(state)
    .filter((j) => !state.flags[f(j, 'Rumor')])
    .map((j) => ({
      id: `rumor-${j.id}`,
      label: j.row.label,
      sub: j.row.sub,
      group: 'side' as const,
      enable: j.cost.item === 'glints' ? { item: 'glints' as const } : { itemMin: ['scrap', j.cost.n] as [string, number] },
      locked: j.cost.item === 'glints' ? 'Need 1 Glint' : `Need ${j.cost.n} scrap`,
      effects: {
        remove: { [j.cost.item]: j.cost.n },
        flag: { [f(j, 'Rumor')]: true, kaelenKnown: true },
        ticks: 1,
        flash: j.row.pitch,
      },
    })) as Choice[]
}

/** Host-scene rows: once the lead is bought, the spot is one connected road on. */
export function jobWalkRows(state: GameState): Choice[] {
  return RUMOR_JOBS.filter((j) => j.host === state.sceneId && state.flags[f(j, 'Rumor')] && !state.flags[f(j, 'Taken')] && !state.flags[f(j, 'Seen')]).map((j) => ({
    id: `rumor-walk-${j.id}`,
    label: `Walk to ${j.spot}`,
    sub: WALK_SUB,
    effects: { goto: j.spotScene, ticks: 1 },
  }))
}

/** The nine spot scenes' choices: Look, Take (variants), Leave. */
export function spotChoices(j: RumorJob): Choice[] {
  return [
    {
      id: 'look',
      label: j.look.label,
      show: { flagUnset: f(j, 'Looked') },
      effects: { flag: { [f(j, 'Looked')]: true }, ticks: 1, flash: j.look.flash },
    },
    ...j.takes.map((t): Choice => ({
      id: t.id,
      label: j.takeLabel,
      sub: t.sub,
      tone: 'danger',
      show: { all: [{ flag: f(j, 'Looked') }, { flagUnset: f(j, 'Taken') }, ...(t.show ? [t.show] : [])] },
      effects: {
        ...t.effects,
        flag: { ...(t.effects.flag ?? {}), [f(j, 'Taken')]: true },
        ticks: 1,
        goto: j.host,
        ...(t.ambush ? { ambush: { kind: t.ambush.kind, line: t.flash } } : { flash: t.flash }),
      } as Effect,
    })),
    {
      id: 'leave',
      label: j.leave.label,
      tone: 'quiet',
      effects: { flag: { [f(j, 'Seen')]: true }, goto: j.host, ticks: 1, flash: j.leave.flash },
    },
  ]
}
