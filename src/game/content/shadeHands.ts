import type { Choice, Scene } from '../types'
import { HOLLOW_PULL } from '../sandSign'

/**
 * Walk-up Strays in Silas's shade, in the shape of bayHands.ts (Pike, Sarn, Vetch at Skiff Bay):
 * each hand gets a small scene off `spine:shade` with talk, trade or take, a back button, and typed
 * intents. Taking from a hand raises Stray Heat, which wakes the Spine hunt through markStrayNotice.
 *
 * Korvan Drell and Mira Thorn are live. The third slot is Jodi.
 * TODO(designer): Jodi's card (who she is, what she carries, what she trades). Until then the slot
 * stays `live: false` and never renders; scripts/smoke.ts checks that.
 */
export const SHADE_HANDS_LIVE = true

export type ShadeHand = {
  /** Scene id off the shade. */
  sceneId: string
  /** Button on spine:shade that walks up to this hand. */
  walkLabel: string
  walkSub?: string
  /** Flag set once the player has taken from this hand. */
  tookFlag: string
  live: boolean
}

export const SHADE_HANDS: ShadeHand[] = [
  {
    sceneId: 'spine:korvan',
    walkLabel: 'Sit with the man with amber on his face',
    walkSub: 'Korvan Drell. He trades leads for water and scrap. He will speak to you.',
    tookFlag: 'korvanTook',
    live: true,
  },
  {
    sceneId: 'spine:mira',
    walkLabel: 'Sit near the one-handed woman',
    walkSub: 'Mira Thorn. She does not talk. She watches the sand.',
    tookFlag: 'miraTook',
    live: true,
  },
  // Jodi. Not written yet.
  { sceneId: 'spine:shade-c', walkLabel: 'TODO_STRAY_C', tookFlag: 'shadeCTook', live: false },
]

function liveHands(): ShadeHand[] {
  if (!SHADE_HANDS_LIVE) return []
  return SHADE_HANDS.filter((h) => h.live)
}

/** Walk-up buttons for spine:shade. Only live hands. */
export function shadeHandChoices(): Choice[] {
  return liveHands().map((hand) => ({
    id: `walk-${hand.sceneId.split(':').pop()}`,
    label: hand.walkLabel,
    sub: hand.walkSub,
    effects: { goto: hand.sceneId, ticks: 1 },
  }))
}

const backToShade: Choice = {
  id: 'back',
  label: "Back to Silas's shade",
  tone: 'quiet',
  effects: { goto: 'spine:shade' },
}

const hungerFromShade = (flash: string): Choice => ({
  id: 'hunger',
  label: 'Walk the Hunger toward Red Maw',
  tone: 'hunger',
  show: { flag: 'hungerKnown' },
  effects: { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1, flash },
})

const KORVAN_LEAD =
  '"Red Maw, east-south. A man named Kallik buried Drops and Glints there and carved a nine-tooth gear on the second rib from the jaw. The cache is bait. A Seeker named Sybella rides a sand-skiff around it. She hunts people who carry sap and keep walking. Go if you are going."'

const leadFx = {
  add: { kallik_mark: 1, cache_map: 1 },
  flag: { hungerKnown: true, sybellaNamed: true, korvanHunger: true },
  ticks: 1,
} as const

export const KORVAN_SCENE: Scene = {
  id: 'spine:korvan',
  hubId: 'spine',
  kind: 'talk',
  title: 'Korvan Drell',
  speaker: 'Korvan Drell',
  body: `At the back of Silas's shade, where the canvas runs out, a man sits with his knees drawn up. Hardened amber covers his mouth and runs up over both eyes in a smooth, wax-yellow seal. He breathes through a gap at one corner of it. His words come out of the gap slowly.

He cannot see through the amber. He heard the shade go quiet when you walked in, and he knows what that quiet means. He moves over to make room.

"They turn away from you," he says. "They turned away from me too. I am Korvan. I trade what I know for water and scrap. I will not tell you what that mark is for. Ask me anything else."`,
  variants: [
    {
      if: { sapMax: 2 },
      mode: 'append',
      body: `He hears how dry your breathing is. "Drink before you buy anything from me. A lead is no use to the dead."`,
    },
    {
      if: { flag: 'korvanTook' },
      mode: 'replace',
      body: `Korvan sits with his back to you now. He made room for you once. He does not make it again.`,
    },
  ],
  choices: [
    {
      id: 'hunger-drop',
      label: 'Trade a Drop for the Hunger lead',
      sub: 'Costs 1 Drop. He names Red Maw, the cache, and the woman on the skiff.',
      group: 'intel',
      show: { all: [{ flagUnset: 'korvanHunger' }, { flagUnset: 'korvanTook' }] },
      enable: { item: 'vial_drop' },
      locked: 'Need 1 Drop',
      effects: {
        ...leadFx,
        remove: { vial_drop: 1 },
        add: { ...leadFx.add, vial_empty: 1 },
        flash: `He drinks half the Drop through the gap in the amber and caps the rest. ${KORVAN_LEAD}`,
      },
    },
    {
      id: 'hunger-scrap',
      label: 'Trade 2 scrap for the Hunger lead',
      sub: 'Costs 2 scrap. Same lead. He buys water with it later.',
      group: 'intel',
      show: { all: [{ flagUnset: 'korvanHunger' }, { flagUnset: 'korvanTook' }] },
      enable: { itemMin: ['scrap', 2] },
      locked: 'Need 2 scrap',
      effects: {
        ...leadFx,
        remove: { scrap: 2 },
        flash: `He weighs the scrap in his palm and puts it away. ${KORVAN_LEAD}`,
      },
    },
    {
      id: 'hound',
      label: 'Trade 1 scrap for a lead on the east wash',
      sub: 'Costs 1 scrap. Who walks behind the Hound prints.',
      group: 'side',
      show: { all: [{ flagUnset: 'korvanHoundRumor' }, { flagUnset: 'korvanTook' }] },
      enable: { item: 'scrap' },
      locked: 'Need 1 scrap',
      effects: {
        remove: { scrap: 1 },
        flag: { korvanHoundRumor: true },
        ticks: 1,
        flash:
          '"Hound prints on the east wash. Valerius walks behind them. Out here the Cartel calls him the Shard-Hound. He hunts sap thieves. He also hunts a deserter who hides in that wash, a boy named Corvin. If you find Corvin first, be kind to him. He is kinder than the rest of us."',
      },
    },
    {
      id: 'hound-walk',
      label: 'Walk the east wash',
      sub: 'Hound Sign. The deserter hides behind the rock there.',
      show: { flag: 'korvanHoundRumor' },
      effects: { travel: 'spine:hound' },
    },
    {
      id: 'amber',
      label: 'Ask about the amber on his face',
      show: { all: [{ flagUnset: 'korvanStory' }, { flagUnset: 'korvanTook' }] },
      effects: {
        flag: { korvanStory: true },
        ticks: 1,
        flash:
          '"I kept records for the Seekers. In the First Spires I found a memory-fragment that said the doctrine was wrong, and I said so. They named me heretic. The Cartel did the rest. They call it amber-waxing: molten sap poured over the mouth and the eyes. A Dune-Stray cut me out of a holding cart and carried me here. The amber talks. Voices, all day, low, from inside it. I trade pieces of the history the Seekers buried for water and a place to sit."',
      },
    },
    {
      id: 'brand',
      label: 'Ask what your brand means',
      show: { flagUnset: 'korvanTook' },
      effects: {
        flag: { korvanBrandAsked: true },
        ticks: 1,
        flash:
          '"I know what it means. I will not say it. You don\'t remember. They do. Live long enough and someone will say it to your face."',
      },
    },
    {
      id: 'take',
      label: 'Take his water-skin while he talks',
      sub: 'Sap comes back. Stray Heat rises, and the Strays notice.',
      tone: 'danger',
      show: { flagUnset: 'korvanTook' },
      effects: {
        sap: 2,
        heat: { strays: 1 },
        flag: { korvanTook: true },
        ticks: 1,
        flash: 'He lets you take it. He does not reach for it. "Everyone takes from me," he says. Stray Heat rises.',
      },
    },
    backToShade,
    hungerFromShade('Korvan turns his sealed face toward the road you take.'),
  ],
  intents: [
    {
      tags: ['rumor', 'rumors', 'news', 'lead', 'intel', 'kallik', 'cache', 'hunger', 'maw', 'heading'],
      show: { flagUnset: 'korvanTook' },
      reply: '"A Drop or two scrap for the Hunger lead. One scrap for the east wash."',
      effects: { ticks: 1 },
    },
    {
      tags: ['voices', 'amber', 'face', 'seekers', 'heretic', 'spires'],
      show: { flagUnset: 'korvanTook' },
      reply: '"The amber talks. I listen so it does not have to shout."',
      effects: { ticks: 1 },
    },
    {
      tags: ['talk', 'hello', 'ask', 'speak', 'say'],
      show: { flag: 'korvanTook' },
      reply: 'He keeps his back to you.',
      effects: { ticks: 1 },
    },
  ],
}

const MIRA_HOLLOW_DRAWING =
  'After a while she draws in the sand with one finger: a ring with a hole in the middle. She points east-south, toward Red Maw, taps the ring twice, and shakes her head. A Gilded Hollow. Do not step in one. She brushes the drawing away.'

/** Outcast, first time: he feels the Hollow pull while the drawing is in the sand. See sandSign.ts. */
const MIRA_HOLLOW_DRAWING_PULL = `After a while she draws in the sand with one finger: a ring with a hole in the middle. She points east-south, toward Red Maw, taps the ring twice, and shakes her head. A Gilded Hollow. Do not step in one.

${HOLLOW_PULL}

She brushes the drawing away.`

export const MIRA_SCENE: Scene = {
  id: 'spine:mira',
  hubId: 'spine',
  kind: 'talk',
  title: 'Mira Thorn',
  speaker: 'Mira Thorn',
  body: `A woman sits against the tent pole with her left sleeve tied off at the wrist. There is no hand in it. With her right hand she sifts amber sand through her fingers and watches what it leaves on her palm.

She sees the brand. She does not turn away, and she does not speak. She goes back to the sand.`,
  variants: [
    {
      if: { flag: 'miraTook' },
      mode: 'replace',
      body: `Mira sifts sand with her back to you. She does not look up again.`,
    },
  ],
  choices: [
    {
      id: 'sit',
      label: 'Sit beside her and wait',
      show: { all: [{ not: { all: [{ door: 'outcast' }, { flagUnset: 'hollowPullSeen' }] } }, { flagUnset: 'miraWarned' }, { flagUnset: 'miraTook' }] },
      effects: {
        flag: { miraWarned: true },
        ticks: 1,
        flash: MIRA_HOLLOW_DRAWING,
      },
    },
    {
      id: 'sit',
      label: 'Sit beside her and wait',
      show: { all: [{ door: 'outcast' }, { flagUnset: 'hollowPullSeen' }, { flagUnset: 'miraWarned' }, { flagUnset: 'miraTook' }] },
      effects: {
        flag: { miraWarned: true, hollowPullSeen: true },
        ticks: 1,
        flash: MIRA_HOLLOW_DRAWING_PULL,
      },
    },
    {
      id: 'ruins',
      label: 'Ask her about the old ruins',
      show: { all: [{ flag: 'miraWarned' }, { flagUnset: 'miraRuins' }, { flagUnset: 'miraTook' }] },
      effects: {
        flag: { miraRuins: true },
        ticks: 1,
        flash:
          'She draws a rib of rock with nine marks along it, and a stair under the rib. She points at you, then at the stair, then holds up one finger: go down alone, and only if you want the truth. When you reach for a Glint to pay her, she pushes your hand away.',
      },
    },
    {
      id: 'take',
      label: 'Take the Glint she sifted',
      sub: 'A Glint. Stray Heat rises, and the Strays notice.',
      tone: 'danger',
      show: { flagUnset: 'miraTook' },
      effects: {
        add: { glints: 1 },
        heat: { strays: 1 },
        flag: { miraTook: true },
        ticks: 1,
        flash: 'She opens her hand and lets you take the Glint. She does not look at you again. Stray Heat rises.',
      },
    },
    backToShade,
    hungerFromShade('Mira does not watch you leave. She watches the sand.'),
  ],
  intents: [
    {
      tags: ['talk', 'hello', 'ask', 'speak', 'say', 'help', 'name'],
      reply: 'She does not answer. She keeps sifting.',
      effects: { ticks: 1 },
    },
    {
      tags: ['hand', 'arm', 'wrist'],
      reply: 'She lifts the tied-off sleeve an inch, then sets it back down on her knee.',
      effects: { ticks: 1 },
    },
  ],
}

/** Scenes for each live hand. */
export function shadeHandScenes(): Scene[] {
  if (!SHADE_HANDS_LIVE) return []
  const byId: Record<string, Scene> = { 'spine:korvan': KORVAN_SCENE, 'spine:mira': MIRA_SCENE }
  return liveHands().map((h) => byId[h.sceneId]).filter(Boolean)
}
