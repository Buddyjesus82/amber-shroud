import type { GameState, IntentRule } from './types'
import { check } from './logic'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreRule(haystack: string, rule: IntentRule): number {
  let score = 0
  for (const tag of rule.tags) {
    const t = normalize(tag)
    if (!t) continue
    if (haystack.includes(t)) score += t.length + 2
  }
  return score
}

export function matchIntent(
  text: string,
  rules: IntentRule[],
  state: GameState,
): IntentRule | null {
  const hay = normalize(text)
  if (!hay) return null
  let best: IntentRule | null = null
  let bestScore = 0
  for (const rule of rules) {
    if (!check(rule.show, state)) continue
    const score = scoreRule(hay, rule)
    if (score > bestScore) {
      best = rule
      bestScore = score
    }
  }
  return best
}

export const GLOBAL_INTENTS: IntentRule[] = [
  {
    tags: ['drink', 'sip', 'swallow', 'drop', 'sap', 'vial'],
    show: { item: 'vial_drop' },
    reply:
      'The Drop hits like a nail of honey and heat. Your hands stop shaking. The vial is a dry throat again.',
    effects: {
      sap: 3,
      remove: { vial_drop: 1 },
      add: { vial_empty: 1 },
      ticks: 1,
    },
  },
  {
    tags: ['drink', 'sip', 'swallow', 'drop', 'sap'],
    show: { not: { item: 'vial_drop' } },
    reply: 'Nothing in the glass. Thirst is a fact, not a prayer.',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: ['wait', 'rest', 'sleep', 'sit', 'pause'],
    reply:
      'You wait. The amber light crawls. Somewhere a hunter uses the same hour better than you.',
    effects: { sap: -1, ticks: 1, pressure: 2 },
  },
  {
    tags: ['hide', 'cover', 'crouch', 'duck', 'conceal'],
    reply: 'You make yourself small. The desert is full of small things. It still finds them.',
    effects: { ticks: 1, pressure: 1 },
  },
  {
    tags: ['look', 'search', 'scan', 'watch', 'listen', 'look around'],
    reply: 'You already see what this place is willing to show. Scavenge if you want a hand in the grit — or try a door, a mouth, a pair of hands.',
    effects: {},
  },
  {
    tags: ['inventory', 'pack', 'pocket', 'items', 'gear', 'kit'],
    reply: 'You pat the pack. Whatever you have, it is listed in Gear — not across the screen. Equip a weapon or armor if it has a slot. Bite and Hide compare gear. No dice.',
    effects: {},
  },
  {
    tags: ['map', 'heading', 'where', 'road'],
    reply: 'Map is the charcoal scrap beside Heat. Connected roads only. Each hop costs Sap.',
    effects: {},
  },
  {
    tags: ['trade', 'buy', 'sell', 'shop', 'merchant', 'barter'],
    reply:
      'Kaelen the Sifter trades from Buy and Sell shelves — scrap for a Drop of Oasis Sap, Glints for intel. Zafir keeps a stall at the Bone Market — Hide, Drops, a pawned baton. Silas sells a Drop in the shade. Oil-Tooth is a different invoice.',
    effects: {},
  },
  {
    tags: ['ask'],
    reply: 'Ask who? Name them — who is Kaelen, who is Oil-Tooth — or ask a mouth that is here. The desert does not guess.',
    effects: {},
  },
  {
    tags: ['run', 'flee', 'leave', 'go', 'escape', 'walk'],
    reply: 'Running without a heading is how the Maw gets fed. Pick a place, or take the Hunger. Map if you need a road.',
    effects: { ticks: 1 },
  },
  {
    tags: ['attack', 'kill', 'stab', 'hit', 'fight', 'punch', 'cut'],
    reply:
      'Blood is expensive and loud. If you want a throat opened, choose it with your whole hand — a button, not a wish.',
    effects: { pressure: 1 },
  },
  {
    tags: ['bury', 'hollow', 'pray', 'magic', 'ritual'],
    reply:
      'Low magic is not a hobby. Bury a thing you value when the sand is listening — not here, not as a joke.',
    effects: { pressure: 1 },
  },
]
