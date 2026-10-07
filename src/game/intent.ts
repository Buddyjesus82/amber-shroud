import type { Choice, GameState, IntentRule } from './types'
import { AIMLESS_RUN } from './hunger'
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

/** Visible-button Do match. Exact label/id, or a phrase from label/sub. */
export function matchChoiceText(text: string, choices: Choice[]): Choice | null {
  return scoreChoiceText(text, choices)?.choice ?? null
}

/** Score at or above this means the typed line names a visible button, not a fuzzy guess. */
export const STRONG_BUTTON = 350

export function scoreChoiceText(text: string, choices: Choice[]): { choice: Choice; score: number } | null {
  const hay = normalize(text)
  if (!hay) return null
  let best: Choice | null = null
  let bestScore = 0
  for (const choice of choices) {
    const label = normalize(choice.label)
    const sub = normalize(choice.sub ?? '')
    const id = normalize(choice.id.replace(/-/g, ' '))
    const words = hay.split(' ').filter(Boolean)
    let score = 0
    if (hay === label || hay === id) score = 1000 + hay.length
    else if (label.includes(hay) && (words.length >= 2 || hay.length >= 6)) score = 400 + hay.length
    else if (hay.includes(label) && label.length >= 6) score = 350 + label.length
    else if (sub && sub.includes(hay) && (words.length >= 2 || hay.length >= 8)) score = 200 + hay.length
    else {
      const asked = words.filter((w) => w.length >= 3)
      const have = new Set(label.split(' ').filter(Boolean))
      const hits = asked.filter((w) => have.has(w))
      if (hits.length >= 2 && hits.length >= Math.ceil(asked.length * 0.6)) {
        score = 100 + hits.join('').length
      }
    }
    if (score > bestScore) {
      best = choice
      bestScore = score
    }
  }
  return best ? { choice: best, score: bestScore } : null
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
    reply: 'Everything you carry is in Gear, in four tabs: Worn, Consumables, Scrap & trade, and Key items. Tap a piece to equip it. Your bag has a set number of slots: a stack of small goods is one slot, each spare weapon or wearable is one; key items, coin, and worn gear ride free. Type look at my gear for a quick count.',
    effects: {},
  },
  {
    tags: ['map', 'heading', 'where', 'road'],
    reply: 'Map is the charcoal scrap beside Heat. Connected roads only. Each hop costs Sap.',
    effects: {},
  },
  {
    tags: ['trade', 'buy', 'sell', 'shop', 'merchant', 'barter'],
    show: { door: 'prisoner' },
    reply:
      'Kaelen the Sifter trades from Buy and Sell shelves — scrap for a Drop of Oasis Sap, Glints for intel. Zafir keeps a stall at the Bone Market — Hound Hide, Drops, a pawned baton. Jaxson is a different job. He hotwires. He does not sell.',
    effects: {},
  },
  {
    tags: ['trade', 'buy', 'sell', 'shop', 'merchant', 'barter'],
    show: { door: 'outcast' },
    reply:
      'Silas Vane trades from Buy and Sell shelves in his shade — Drops, salve, a wrap, a cloak, a needle knife, for Glints or scrap. Korvan trades leads for water and scrap. Zafir keeps a stall at the Bone Market in Red Maw.',
    effects: {},
  },
  {
    tags: ['trade', 'buy', 'sell', 'shop', 'merchant', 'barter'],
    show: { door: 'vessel' },
    reply:
      'Kaelen the Sifter trades from Buy and Sell shelves off the paddock — scrap for a Drop of Oasis Sap, Glints for intel. Zafir keeps a stall at the Bone Market — Hound Hide, Drops, a pawned baton.',
    effects: {},
  },
  {
    tags: ['ask'],
    show: { door: 'prisoner' },
    reply: 'Ask who? Name them — who is Kaelen, who is Jaxson — or ask a mouth that is here. The desert does not guess.',
    effects: {},
  },
  {
    tags: ['ask'],
    show: { door: 'outcast' },
    reply: 'Ask who? Name them — who is Silas, who is Korvan — or ask a mouth that is here. The desert does not guess.',
    effects: {},
  },
  {
    tags: ['ask'],
    show: { door: 'vessel' },
    reply: 'Ask who? Name them — who is Thalia, who is Oram — or ask a mouth that is here. The desert does not guess.',
    effects: {},
  },
  {
    tags: ['run', 'flee', 'leave', 'go', 'escape', 'walk'],
    reply: AIMLESS_RUN,
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
