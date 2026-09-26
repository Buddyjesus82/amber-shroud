import { ITEMS } from './content/catalog'
import { beginEncounter, roadPressureScene } from './encounter'
import { personAtScene, type Person } from './people'
import { talkIntentsFor } from './talk'
import { vendorFor } from './trade'
import type { Effect, GameState, ItemId, Scene } from './types'

export type DoHit = { effects: Effect; verb: string }

const KEYS = new Set<ItemId>([
  'wrench',
  'silas_tip',
  'oram_map',
  'cache_map',
  'overseer_chip',
  'kallik_mark',
  'ossa_token',
  'ceremonial_cloth',
  'false_vessel',
  'kohl_smear',
  'strider_bit',
])

function npcHere(scene: Scene): Person | undefined {
  return personAtScene(scene.id)
}

function mouthHere(scene: Scene): boolean {
  return !!(npcHere(scene) || scene.speaker || talkIntentsFor(scene.id).length)
}

function mouthName(scene: Scene): string {
  return npcHere(scene)?.name ?? scene.speaker ?? 'They'
}

function clip(text: string, n: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…`
}

function glance(state: GameState, scene: Scene, labels: string[]): string {
  const title = scene.title ?? 'This ground'
  const who = npcHere(scene)
  const first = scene.body
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean)
  const sentence = first ? clip(first.split(/(?<=\.)\s/)[0] ?? first, 110) : ''
  const face = state.flags.hunterHere ? 'The knock is still on this ground. ' : ''
  const present = who ? `${who.name} is here. ` : scene.speaker ? `${scene.speaker} is here. ` : ''
  const screen = labels.slice(0, 3)
  const on = screen.length ? ` On screen: ${screen.join(' · ')}.` : ''
  return clip(`${face}${title}. ${present}${sentence}${on}`, 280)
}

function lookTarget(hay: string): string | null {
  const m = hay.match(/^(?:look around|look at|look|search|examine|inspect|scan|check)(?:\s+around)?\s+(.+)$/)
  const rest = m?.[1]?.replace(/^the\s+/, '').trim()
  if (!rest || rest === 'around' || rest === 'room' || rest === 'area') return null
  return rest
}

function wantsLook(hay: string): boolean {
  return /^(?:look|search|examine|inspect|scan|check)(?:\s+around)?$/.test(hay) || /\b(?:look around|look at|examine|inspect)\b/.test(hay) || /^(?:search|examine|inspect)\b/.test(hay)
}

function itemHit(hay: string, state: GameState): ItemId | null {
  const ids = Object.keys(ITEMS) as ItemId[]
  let best: ItemId | null = null
  let bestLen = 0
  for (const id of ids) {
    if (!(state.items[id] ?? 0)) continue
    const name = ITEMS[id].name.toLowerCase()
    const bits = [name, id.replace(/_/g, ' ')]
    for (const bit of bits) {
      if (bit.length >= 3 && hay.includes(bit) && bit.length > bestLen) {
        best = id
        bestLen = bit.length
      }
    }
  }
  return best
}

function lookHit(state: GameState, scene: Scene, hay: string, labels: string[]): DoHit {
  const target = lookTarget(hay)
  if (!target) {
    return { effects: { flash: glance(state, scene, labels) }, verb: 'look' }
  }
  const who = npcHere(scene)
  if (who && who.aliases.some((a) => target.includes(a) || a.includes(target))) {
    return {
      effects: { flash: clip(`${who.name}. ${who.card.split('\n').find(Boolean) ?? ''}`, 220) },
      verb: 'look',
    }
  }
  const item = itemHit(target, state)
  if (item) {
    const def = ITEMS[item]
    return { effects: { flash: clip(`${def.name}. ${def.desc}`, 200) }, verb: 'look' }
  }
  const button = labels.find((label) => label.toLowerCase().includes(target) || target.includes(label.toLowerCase()))
  if (button) {
    return { effects: { flash: `On screen: ${button}. Type it, or tap it.` }, verb: 'look' }
  }
  return {
    effects: { flash: clip(`No ${target} in front of you. ${glance(state, scene, labels)}`, 220) },
    verb: 'look',
  }
}

function wantsFight(hay: string): boolean {
  return /\b(attack|fight|bite|kill|stab|hit|punch|strike)\b/.test(hay)
}

function wantsHide(hay: string): boolean {
  return /\b(hide|crouch|duck|conceal)\b/.test(hay)
}

function combatHit(state: GameState, scene: Scene, hay: string): DoHit | null {
  if (wantsFight(hay)) {
    if (mouthHere(scene)) return null
    if (roadPressureScene(scene.id) && scene.kind !== 'talk' && scene.kind !== 'crisis' && scene.kind !== 'ending') {
      return {
        effects: beginEncounter(state, undefined, 'You pick a fight with the road. Something steps into the grit.'),
        verb: 'fight',
      }
    }
    return {
      effects: { flash: 'No fight on this beat. Nothing here is already bleeding.' },
      verb: 'fight',
    }
  }
  if (wantsHide(hay)) {
    if (state.flags.encounterHere) return null
    const who = mouthName(scene)
    if (mouthHere(scene)) {
      return {
        effects: {
          ticks: 1,
          pressure: 1,
          flash: `You crouch. ${who} still has you in the eye.`,
        },
        verb: 'hide',
      }
    }
    if (roadPressureScene(scene.id)) {
      return {
        effects: {
          ticks: 1,
          pressure: 1,
          flash: 'You drop into the grit. The road loses you for a minute.',
        },
        verb: 'hide',
      }
    }
    return {
      effects: {
        ticks: 1,
        flash: 'Nothing is hunting this room. Hiding here only spends the hour.',
      },
      verb: 'hide',
    }
  }
  return null
}

function spendPocket(state: GameState): { remove: Partial<Record<ItemId, number>>; name: string } | null {
  if ((state.items.glints ?? 0) > 0) return { remove: { glints: 1 }, name: 'Glint' }
  if ((state.items.scrap ?? 0) > 0) return { remove: { scrap: 1 }, name: 'scrap' }
  if ((state.items.scrip ?? 0) > 0) return { remove: { scrip: 1 }, name: 'scrip' }
  return null
}

function bribeHit(state: GameState, scene: Scene): DoHit {
  const who = npcHere(scene)
  const vendor = vendorFor(scene.id)
  if (!who && !scene.speaker) {
    return { effects: { flash: 'No palm here. Bribes need a person.' }, verb: 'bribe' }
  }
  if (who?.id === 'kaelen' || vendor?.id === 'kaelen') {
    return {
      effects: {
        ticks: 1,
        flag: vendor ? { shopShelf: 'buy' } : undefined,
        flash: vendor
          ? 'Bribes are badly labeled prices. Buy is the shelf.'
          : 'Kaelen does not take bribes in the open. Walk the counter if you want a price.',
      },
      verb: 'bribe',
    }
  }
  if (who?.id === 'oiltooth') {
    return { effects: { ticks: 1, flash: 'Oil-Tooth has a wrench, not a palm. Do the job.' }, verb: 'bribe' }
  }
  if (who?.id === 'sybella') {
    if (state.door === 'vessel' && (state.items.glints ?? 0) > 0) {
      return {
        effects: {
          remove: { glints: 1 },
          heat: { seekers: -1 },
          ticks: 1,
          flash: 'She takes the Glint like a receipt. An hour. Not mercy.',
        },
        verb: 'bribe',
      }
    }
    if (state.door !== 'vessel' && (state.items.glints ?? 0) > 0) {
      return {
        effects: {
          remove: { glints: 1 },
          heat: { seekers: 1 },
          pressure: 1,
          ticks: 1,
          flash: 'She does not sell hours to you. She keeps the Glint as evidence.',
        },
        verb: 'bribe',
      }
    }
    return {
      effects: {
        heat: { seekers: 1 },
        pressure: 1,
        ticks: 1,
        flash: 'She does not sell hours to you. The offer is noted.',
      },
      verb: 'bribe',
    }
  }
  if (who?.id === 'thalia' || who?.id === 'brin') {
    return {
      effects: { heat: { seekers: 1 }, ticks: 1, flash: `${mouthName(scene)} does not sell. The hymn hears the attempt.` },
      verb: 'bribe',
    }
  }
  if (who?.id === 'ossa') {
    return { effects: { ticks: 1, flash: 'Ossa does not take payment for being alive.' }, verb: 'bribe' }
  }
  if (who?.id === 'valerius' || who?.id === 'rell') {
    if ((state.items.scrip ?? 0) > 0) {
      return {
        effects: {
          remove: { scrip: 1 },
          heat: { cartel: -1 },
          ticks: 1,
          flash: `${mouthName(scene)} likes paper that says owned. Heat cools a degree. You are still standing here.`,
        },
        verb: 'bribe',
      }
    }
    return {
      effects: { pressure: 1, ticks: 1, flash: 'Scrip or a Hound. You offered neither.' },
      verb: 'bribe',
    }
  }
  const pocket = spendPocket(state)
  if (!pocket) {
    return { effects: { ticks: 1, flash: `Empty hands. ${mouthName(scene)} is not moved.` }, verb: 'bribe' }
  }
  const heat =
    who?.id === 'silas' || who?.id === 'nim' || who?.id === 'zafir'
      ? undefined
      : state.hubId === 'threshold'
        ? { seekers: 1 as const }
        : state.hubId === 'spine' || state.hubId === 'redmaw'
          ? { strays: 1 as const }
          : { cartel: 1 as const }
  return {
    effects: {
      remove: pocket.remove,
      heat,
      ticks: 1,
      flash: `${mouthName(scene)} takes the ${pocket.name}. It buys a minute, not a friend.`,
    },
    verb: 'bribe',
  }
}

function namedItem(hay: string, state: GameState): ItemId | null {
  return itemHit(hay, state)
}

function giveHit(state: GameState, scene: Scene, hay: string): DoHit {
  const rest = hay.replace(/^(?:give|hand|offer|pass)\s+(?:them\s+|him\s+|her\s+)?(?:the\s+)?/, '').trim()
  if (!rest || rest === 'it') {
    return { effects: { flash: mouthHere(scene) ? `Give what to ${mouthName(scene)}? Name it.` : 'Give it to whom?' }, verb: 'give' }
  }
  const item = namedItem(rest, state)
  if (!item) {
    return { effects: { flash: 'Not in the pack.' }, verb: 'give' }
  }
  if (KEYS.has(item)) {
    return { effects: { flash: `${ITEMS[item].name} stays. It is a tool, not a gift.` }, verb: 'give' }
  }
  const vendor = vendorFor(scene.id)
  if (vendor) {
    return {
      effects: { flag: { shopShelf: 'sell' }, flash: `${vendor.openSellFlash}` },
      verb: 'give',
    }
  }
  return {
    effects: { flash: `${mouthHere(scene) ? mouthName(scene) : 'Nobody here'} leaves ${ITEMS[item].name} in your hand.` },
    verb: 'give',
  }
}

function takeHit(scene: Scene, hay: string): DoHit {
  const rest = hay.replace(/^(?:take|grab|steal|snatch|pocket)\s+(?:the\s+)?/, '').trim()
  if (mouthHere(scene)) {
    return {
      effects: {
        ticks: 1,
        pressure: 1,
        flash: `${mouthName(scene)}'s kit is not a shelf. Trade, or use a button that offers a thing.`,
      },
      verb: 'take',
    }
  }
  if (!rest) {
    return {
      effects: { flash: 'Nothing loose to take. Scavenge if you want grit.' },
      verb: 'take',
    }
  }
  return { effects: { flash: `You can't take ${rest} off this beat.` }, verb: 'take' }
}

/**
 * Verbs that are not the story buttons. Shared by every door.
 * Returns null when talk, shop, or a visible choice should own the line.
 */
export function offButton(state: GameState, text: string, scene: Scene, labels: string[]): DoHit | null {
  const hay = text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!hay) return null
  if (state.flags.encounterHere) return null
  if (wantsLook(hay)) return lookHit(state, scene, hay, labels)
  if (state.flags.hunterHere && /\b(bribe|pay|fight|attack|bite|hide|give|take|grab|steal)\b/.test(hay)) {
    return {
      effects: { flash: 'The knock is the conversation. Pay, fight, hide, or bargain — or tap a stake.' },
      verb: 'knock',
    }
  }
  if (/\bbribe\b/.test(hay)) return bribeHit(state, scene)
  if (/^(?:give|hand|offer|pass)\b/.test(hay)) return giveHit(state, scene, hay)
  if (/^(?:take|grab|steal|snatch|pocket)\b/.test(hay)) return takeHit(scene, hay)
  return combatHit(state, scene, hay)
}
