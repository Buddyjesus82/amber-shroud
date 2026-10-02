import type { Scene } from '../types'

export const openingScenes: Scene[] = [
  {
    id: 'open:prisoner',
    kind: 'story',
    art: 'world',
    title: 'Ironwood Break',
    body: `You wake face-down in the holding pens muck. The back of your head is wet and you do not know the name of the wet. Cold, resin-slick, already in your mouth. Ironwood Camp-04 is loud: razor-wire, screaming steam-vents, harvesters on the petrified groves. You are a Bleed-Cut. Captive labor. Amnesiac. Your kit matches no faction.

Jaxson "Oil-Tooth" Vance is hollering from the next bunk — burly, grease-stained, a fused brass jaw. He sees the blood before he sees you. "Back of the head. Don't lie down again."

Overseer Valerius is the shadow in the tower. Getting out from under him is the first job.`,
    choices: [
      {
        id: 'pens',
        label: 'Sit up. Acknowledge Oil-Tooth.',
        sub: 'Gear: Cartel Scrip only. The jaw in the next bunk will not shut up. Kaelen the Sifter is a rumor at the Wire.',
        effects: {
          enterHub: 'camp04',
          goto: 'camp:cages',
          ticks: 1,
          flash:
            'You sit up out of the muck. A brass jaw is still talking in the next bunk. Cartel Scrip is a lullaby that does not buy Oasis Sap.',
        },
      },
    ],
  },
  {
    id: 'open:outcast',
    kind: 'story',
    art: 'world',
    title: 'First Drop',
    body: `You wake on the Bleached Spine with no memory. You do not know your name or the road that brought you here.

The left side of your face hurts. Your fingers find a brand there, burned into the skin, still raw at the edges. Every Dune-Stray knows that mark. It tells them not to speak to you, and when they see it, they turn away. Nobody will tell you what you did. You only know that you did something.

Someone scratched a shade-cut into your palm while you were out. It is Silas Vane's mark. Silas sells shade by the minute on this ridge, and he trades with anyone who pays. The vial on your belt is empty. Noon on the Spine is a bill: your tongue sits like cloth, and two walks will empty you.`,
    choices: [
      {
        id: 'stand',
        label: 'Stand up into the noon',
        sub: 'Gear: empty vial, Silas\'s tip. Sap is already thin.',
        effects: {
          enterHub: 'spine',
          goto: 'spine:ridge',
          ticks: 1,
          flash: 'Heat lays a hand on the back of your neck and leaves it there.',
        },
      },
    ],
  },
  {
    id: 'open:vessel',
    kind: 'story',
    art: 'world',
    title: 'Vessel',
    body: `They put the cloth on you because a Vessel is a walking cup and you have a spine that can still hold liquid.

You wear their Vessel and nod like one. Outer Threshold is a church built out of dunes and bad memory. Thalia weeps gold. Oram counted Striders, then counted you, then tore a heading from his ledger because cups crack and thieves reach Red Maw. A rusted dagger sits against your ribs under the gold thread — kitchen steel, dishonest, yours.

The sacrament on your tongue is a real Drop. The rest is theater. Seeker Heat is already a hymn.`,
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
