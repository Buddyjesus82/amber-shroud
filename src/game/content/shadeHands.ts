import type { Choice, Scene } from '../types'

/**
 * SCAFFOLD: walk-up Strays in Silas's shade. Nothing here reaches a player yet.
 *
 * Pattern copied from bayHands.ts (Pike, Sarn, Vetch at Skiff Bay): each hand gets its own
 * small scene off `spine:shade` with Talk / Take / Trade buttons, a back button, and typed
 * intents. Taking from a hand should raise Stray Heat, which wakes the Spine hunt through
 * markStrayNotice in engine.ts.
 *
 * TODO(designer): who these 2-3 Strays are (names, what each one is doing, what they carry,
 * what they trade). Fill `SHADE_HANDS`, write each scene, then flip `SHADE_HANDS_LIVE`.
 * Until then the placeholders below must never render; scripts/smoke.ts checks that.
 */
export const SHADE_HANDS_LIVE = false

export type ShadeHand = {
  /** Scene id off the shade, e.g. 'spine:shade-a'. */
  sceneId: string
  /** Button on spine:shade that walks up to this hand. */
  walkLabel: string
  /** Flag set once the player has taken from this hand. */
  tookFlag: string
}

export const SHADE_HANDS: ShadeHand[] = [
  { sceneId: 'spine:shade-a', walkLabel: 'TODO_STRAY_A', tookFlag: 'shadeATook' },
  { sceneId: 'spine:shade-b', walkLabel: 'TODO_STRAY_B', tookFlag: 'shadeBTook' },
  { sceneId: 'spine:shade-c', walkLabel: 'TODO_STRAY_C', tookFlag: 'shadeCTook' },
]

/** Walk-up buttons for spine:shade. Empty while the scaffold is off. */
export function shadeHandChoices(): Choice[] {
  if (!SHADE_HANDS_LIVE) return []
  return SHADE_HANDS.map((hand) => ({
    id: `walk-${hand.sceneId.split('-').pop()}`,
    label: hand.walkLabel,
    effects: { goto: hand.sceneId, ticks: 1 },
  }))
}

/** Scenes for each hand. Empty while the scaffold is off. */
export function shadeHandScenes(): Scene[] {
  if (!SHADE_HANDS_LIVE) return []
  return []
}
