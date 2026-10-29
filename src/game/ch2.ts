import { CH2_CHAPTER, CH2_CODE, CH2_START, DRILL_LINES, MILLER_TURRETS, RECKONING_LOST, TURRET_LINE, VALERIUS_LOOT } from './content/intoTheMaw'
import { HANDS_MAX, snapshot } from './hands'
import type { Effect, GameState } from './types'

/** v166: the vault code, any case, trimmed. */
export function isChapterTwoCode(raw: string): boolean {
  return raw.trim().toUpperCase() === CH2_CODE
}

/** The ground of Chapter Two proper (the unlock card and the Legacy box are still Rim screens). */
export function isChapterTwoGround(id: string): boolean {
  return id.startsWith('ch2:') && id !== 'ch2:gate' && id !== 'ch2:legacy' && id !== 'ch2:stub'
}

export function chapterTwoUnlock(legacy: boolean): Effect {
  return { goto: 'ch2:gate', flag: { chapter2Unlocked: true, chapter1Done: true, ...(legacy ? { ch2Legacy: true } : {}) } }
}

function addFlash(next: GameState, line: string): void {
  next.flash = next.flash ? `${next.flash}\n\n${line}` : line
}

function roll(state: GameState, salt: string, n: number): number {
  let h = (state.ticks * 2654435761 + Number(state.flags.sceneSteps ?? 0) * 40503 + 91) >>> 0
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) % n
}

/** Runs after every applied effect. Only touches Chapter Two state. */
export function chapterTwoAfter(state: GameState, next: GameState, _fx?: Effect): GameState {
  const onGround = isChapterTwoGround(next.sceneId)
  if (!onGround && !state.flags.ch2Fight) return next
  next = { ...next, flags: { ...next.flags } }
  const f = next.flags
  if (onGround) {
    next.chapterId = CH2_CHAPTER
    next.hubId = null
  }
  // The Chapter Two start: hands refill and the checkpoint sits at the Jaws.
  if (next.sceneId === CH2_START && !f.ch2Started) {
    f.ch2Started = true
    next.hands = HANDS_MAX
    next.checkpoint = snapshot({ ...next, flash: undefined })
  }
  // The Stray skiff route: one in two, Miller's horn and the turrets.
  if (f.ch2SkiffRoll) {
    delete f.ch2SkiffRoll
    if (roll(state, 'skiff', 2) === 0) {
      f.skiffAlarm = true
      next.health = Math.max(1, (next.health ?? 1) - 2)
      addFlash(next, `${MILLER_TURRETS}\n\n${TURRET_LINE}`)
    } else {
      addFlash(next, 'The Stray skiff slides under the platform lamps. Nobody looks down.')
    }
  }
  // Fights: settle the outcome when the card closes.
  const tag = state.flags.ch2Fight
  if (typeof tag === 'string' && tag) {
    if (state.flags.encounterHere && !next.flags.encounterHere) {
      delete f.ch2Fight
      const won = !state.flags.encounterFled && !next.flags.downed && (next.health ?? 1) > 0
      if (won) {
        f[`ch2Won_${tag}`] = true
        if (tag === 'reckoning') f.reckoningDone = true
        if (tag === 'valerius') {
          next.items = { ...next.items, valerius_baton: (next.items.valerius_baton ?? 0) + 1, cipher_key: (next.items.cipher_key ?? 0) + 1 }
          addFlash(next, VALERIUS_LOOT)
        }
      } else {
        f[`ch2Lost_${tag}`] = true
        if (tag === 'reckoning') {
          next.items = { ...next.items, spire_key: 0 }
          f.keySurrendered = true
          f.reckoningDone = true
          addFlash(next, RECKONING_LOST)
        }
        if (tag === 'garden') next.heat = { ...next.heat, seekers: Math.min(8, (next.heat.seekers ?? 0) + 1) }
      }
    } else if (!state.flags.encounterHere && !next.flags.encounterHere) {
      // A sneak that was never spotted: no fight to settle.
      delete f.ch2Fight
    }
  } else if (typeof f.ch2Fight === 'string' && !next.flags.encounterHere) {
    delete f.ch2Fight
  }
  // Murch's lift: two of the three needs met.
  if (!f.murchLift && [f.murchScrap, f.murchFluid, f.ch2Won_dragoons].filter(Boolean).length >= 2) {
    f.murchLift = true
    delete f.murchAbandoned
  }
  if (f.ch2RunHand) {
    delete f.ch2RunHand
    next.hands = Math.max(0, (typeof next.hands === 'number' ? next.hands : HANDS_MAX) - 1)
  }
  // The drill clock: Sybella's team comes down while you walk the Ribs.
  if (onGround && next.sceneId !== state.sceneId && isChapterTwoGround(state.sceneId) && !f.spireKey) {
    const steps = Number(f.ch2Steps ?? 0) + 1
    f.ch2Steps = steps
    const stage = steps >= 18 ? 3 : steps >= 12 ? 2 : steps >= 6 ? 1 : 0
    if (stage > Number(f.drillStage ?? 0)) {
      f.drillStage = stage
      addFlash(next, DRILL_LINES[stage])
    }
  }
  return next
}
