import type { GameState } from './types'

/**
 * Outcast: the burned brand on his face. Every Dune-Stray knows the mark and turns away from it.
 * Nobody says what he did. Typed questions about it get a refusal, never the answer.
 */

const LOOK = /\b(look|examine|check|feel|touch|rub|inspect|study)\b.*\b(brand|face|cheek|mark|scar|burn)\b/
const ASK_BRAND = /\b(brand|mark on my face|my mark|the mark|burn on my face)\b/
const WHO_AM_I = /\b(who am i|who i am|my name|what is my name|whats my name)\b/
const WHAT_HAPPENED = /\b(what happened|what did i do|what have i done|why am i here|my past|remember)\b/

export const BRAND_LOOK =
  'Your fingers find it on your left cheek: raised and hard, still hot at the edges, about the size of a thumb. You cannot see it. Every Dune-Stray can.'

/** Who answers depends on who is in front of you. Korvan is the only one who talks about it at all. */
function speakerRefusal(state: GameState): string {
  const id = state.sceneId
  if (id === 'spine:korvan') {
    return state.flags.korvanTook
      ? 'Korvan keeps his back to you.'
      : '"I know what it means. I will not say it. You don\'t remember. They do."'
  }
  if (id === 'spine:mira') return 'Mira looks at the brand, then back at the sand. She says nothing.'
  if (id === 'spine:corvin') return '"I don\'t know Stray marks. The Strays do. They won\'t say it to you, and I\'m not going to guess."'
  if (id.startsWith('spine:silas') || id === 'spine:shade' || id === 'ch1:o-silas') {
    return 'Silas does not look at it. "I do not ask what you did. I ask what you pay."'
  }
  if (id === 'ch1:o-tax') return 'Nim looks past your head. "You know what you did."'
  if (id.includes('ossa') || id.startsWith('maw:stilt')) return 'Ossa looks past the brand to your eyes. "Ask me for water. Talk can wait."'
  return 'Nobody here will say. You don\'t remember. They do.'
}

export function brandReply(state: GameState, text: string): string | null {
  if (state.door !== 'outcast') return null
  const t = text.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (LOOK.test(t)) return BRAND_LOOK
  if (WHO_AM_I.test(t)) {
    return `${speakerRefusal(state)} The brand is the only name anyone on the Spine gives you, and they do not say it out loud.`
  }
  if (WHAT_HAPPENED.test(t) || (ASK_BRAND.test(t) && /\b(ask|about|what|why|tell|mean|means)\b/.test(t))) {
    return speakerRefusal(state)
  }
  return null
}
