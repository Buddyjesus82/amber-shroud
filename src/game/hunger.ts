import { HUBS, getScene } from './content'
import { isPressureOverlay } from './hunter'
import { check } from './logic'
import type { Choice, Effect, GameState } from './types'

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Typed Hunger, not Kaelen's lead. Buttons still own "take the Hunger lead". */
export function isHungerCommand(text: string): boolean {
  const hay = norm(text)
  if (!/\bhunger\b/.test(hay)) return false
  if (/\b(lead|intel|rumou?r|glint)\b/.test(hay)) return false
  if (/^(?:the\s+)?hunger$/.test(hay)) return true
  return /^(?:take|grab|walk|enter|start|follow|ride|begin|run|flee|leave|go|break)\b/.test(hay)
}

/**
 * Same payload as the Hunger button on this beat.
 * Hub hooks work off the map's exit node, so Maw Rim can take the Hunger
 * the Lip button offers. Door roads stay on the visible choice.
 */
export function hungerCommandEffect(state: GameState, choices: Choice[]): Effect | null {
  if (state.flags.encounterHere || isPressureOverlay(state)) return null
  const scene = getScene(state.sceneId, state.door)
  if (scene.kind === 'crisis' || scene.kind === 'ending') return null

  const starters = choices.filter((c) => c.effects.startChapter === 'cache-run')
  if (starters.length) {
    const named = starters.filter((c) => /\bhunger\b/i.test(`${c.label} ${c.id}`))
    const pool = named.length ? named : starters
    const known = pool.find((c) => !c.effects.flag?.cacheBlind)
    return (known ?? pool[0]).effects
  }

  if (scene.chapterId === 'cache-run') {
    const roads = choices.filter(
      (c) => c.tone === 'hunger' && !!(c.effects.goto || c.effects.enterHub || c.effects.startChapter),
    )
    if (roads.length === 1) return roads[0].effects
    return null
  }

  const hook = state.hubId ? HUBS[state.hubId]?.hungerHook : undefined
  if (hook && check(hook.show, state)) {
    return {
      goto: hook.sceneId,
      ticks: 1,
      startChapter: state.flags.chapter1Done ? undefined : 'cache-run',
    }
  }

  if (
    state.hubId &&
    state.hubId !== 'redmaw' &&
    !state.chapterId &&
    !state.flags.chapter1Done &&
    state.pressure >= 10
  ) {
    return {
      startChapter: 'cache-run',
      goto: 'ch1:leave',
      ticks: 1,
      flag: state.flags.hungerKnown ? undefined : { cacheBlind: true },
    }
  }

  return null
}

export const AIMLESS_RUN =
  'Running without a heading is how the Maw gets fed. Pick a place. Map if you need a road.'

export const AIMLESS_RUN_HUNGER =
  'Running without a heading is how the Maw gets fed. Pick a place, or take the Hunger. Map if you need a road.'

export function aimlessRunReply(offered: boolean): string {
  return offered ? AIMLESS_RUN_HUNGER : AIMLESS_RUN
}

/**
 * Maw Rim, the Hollow Lip (where the Approach offers the Hunger button),
 * and the Red Maw Approach landing. Other hubs keep the two-step walk line.
 */
const RIM_DEPART_SCENES = new Set(['maw:rim', 'maw:lip', 'ch1:land'])

export function isRimDepartBeat(state: GameState): boolean {
  if (state.flags.encounterHere || isPressureOverlay(state)) return false
  const scene = getScene(state.sceneId, state.door)
  if (scene.kind === 'crisis' || scene.kind === 'ending') return false
  return RIM_DEPART_SCENES.has(state.sceneId)
}

/** Bare leave verbs. Hunger-named lines stay on isHungerCommand. */
export function isRimDepartCommand(text: string): boolean {
  const hay = norm(text)
  if (/^(?:run|go|leave|flee|escape)(?:\s+(?:away|off|out|now|here))?$/.test(hay)) return true
  if (/^leave(?:\s+the)?\s+rim$/.test(hay)) return true
  if (/^(?:run|go|flee)(?:\s+(?:off|from))?(?:\s+the)?\s+rim$/.test(hay)) return true
  return false
}

export const RIM_NOWHERE = 'Nowhere to run yet. The rim holds.'

export const RIM_HUNGER_OPEN = 'Hunger is open. Run, leave, or take the Hunger.'

export const HUNGER_BLOCKED = 'The Hunger is not a road on this beat.'
