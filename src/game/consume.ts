import type { ItemId } from './types'

/**
 * Verb-first "use an owned item" intent. Drink / sip / use a Drop, apply / use a salve.
 * This is inventory, never a shelf: only buy / purchase / trade for reaches a shop.
 */
export type ConsumeAsk = { item: ItemId; verb: 'drink' | 'bind' }

const DRINK = /^(?:drink|sip|swallow|gulp|quaff)\b/
const USE = /^(?:use|apply|rub|consume|take a (?:sip|swig))\b/
const DROP_WORD = /\b(?:drops?|vials?|sap|oasis|glass)\b/
const SALVE_WORD = /\b(?:salves?|resin salve|tin|ointment)\b/
const SHOP_WORD = /\b(?:buy|purchase|trade|sell|pay|price|cost)\b/

function clean(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function consumeAsk(text: string): ConsumeAsk | null {
  const hay = clean(text)
  if (!hay || SHOP_WORD.test(hay)) return null
  if (DRINK.test(hay)) {
    const rest = hay.replace(DRINK, '').trim()
    // Bare "drink", or "drink a drop / the vial / some sap". Not "drink from the well".
    if (!rest || DROP_WORD.test(rest) || /^(?:it|one|up|something)$/.test(rest)) return { item: 'vial_drop', verb: 'drink' }
    return null
  }
  if (USE.test(hay)) {
    const rest = hay.replace(USE, '').trim()
    if (SALVE_WORD.test(rest)) return { item: 'salve', verb: 'bind' }
    if (DROP_WORD.test(rest)) return { item: 'vial_drop', verb: 'drink' }
  }
  return null
}

export const NONE_TO_USE: Record<'vial_drop' | 'salve', string> = {
  vial_drop: 'You have no Drop to drink.',
  salve: 'You have no salve to use.',
}
