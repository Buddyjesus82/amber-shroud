import {
  BREACH_SCENES, DRILL_SCENES, TOO_MANY_LAMPS, CH2_CHAPTER, CH2_CODE, CH2_START_IDS, CH2_ENTRY, DRILL_LINES, HORN_MURCH_FIX, HORN_REPAIRED, KEY_TAKEN, MILLER_TURRETS, RECKONING_LOST, RITE_FAIL, RITE_HOLD,
  SIFT_SPOTTED, STRAYS_THROW_OUT, SUPPLY_HOT, SUPPLY_MURCH, SUPPLY_SAFE, TURRET_LINE, VALERIUS_LOOT,
} from './content/intoTheMaw'
import { fightStartFlags } from './encounter'
import { HANDS_MAX, snapshot } from './hands'
import type { Effect, GameState } from './types'

/** v166: the vault code, any case, trimmed. */
export function isChapterTwoCode(raw: string): boolean {
  return raw.trim().toUpperCase() === CH2_CODE
}

/** The ground of Chapter Two proper (the unlock card is still a Rim screen). */
export function isChapterTwoGround(id: string): boolean {
  return id.startsWith('ch2:') && id !== 'ch2:gate' && id !== 'ch2:stub'
}

export function chapterTwoUnlock(): Effect {
  return { goto: 'ch2:gate', flag: { chapter2Unlocked: true, chapter1Done: true } }
}

function addFlash(next: GameState, line: string): void {
  next.flash = next.flash ? `${next.flash}\n\n${line}` : line
}

function roll(state: GameState, salt: string, n: number): number {
  let h = (state.ticks * 2654435761 + Number(state.flags.sceneSteps ?? 0) * 40503 + 91) >>> 0
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) % n
}

function hurt(next: GameState, n: number): void {
  next.health = Math.max(1, (next.health ?? 1) - n)
}

function openFight(next: GameState, kind: Parameters<typeof fightStartFlags>[1], tag: string, line: string): void {
  next.flags = { ...next.flags, ...fightStartFlags(next, kind), encounterNoSkip: true, ch2Fight: tag }
  next.flash = line
}

/** Runs after every applied effect. Only touches Chapter Two state. */
export function chapterTwoAfter(state: GameState, next: GameState, _fx?: Effect): GameState {
  const onGround = isChapterTwoGround(next.sceneId)
  if (!onGround && !state.flags.ch2Fight) return next
  next = { ...next, flags: { ...next.flags } }
  let f = next.flags
  if (onGround) {
    next.chapterId = CH2_CHAPTER
    next.hubId = null
  }
  // v168: each door's first scene holds the checkpoint and refills the hands.
  if ((next.sceneId === CH2_ENTRY || CH2_START_IDS.includes(next.sceneId)) && !f.ch2Started) {
    f.ch2Started = true
    next.hands = HANDS_MAX
    next.checkpoint = snapshot({ ...next, flash: undefined })
  }
  const moved = onGround && next.sceneId !== state.sceneId && isChapterTwoGround(state.sceneId)
  // The haul skiff: one in two, Miller's horn and the turrets.
  if (f.ch2SkiffRoll) {
    delete f.ch2SkiffRoll
    if (roll(state, 'skiff', 2) === 0) {
      f.skiffAlarm = true
      hurt(next, 2)
      addFlash(next, `${MILLER_TURRETS}\n\n${TURRET_LINE}`)
    }
  }
  // The horn: cut for a while. Miller's mechanics fix it after 3 scenes; a captive Murch fixes it on the next.
  if (f.hornCut && f.hornCutAt === undefined) f.hornCutAt = Number(f.ch2Moves ?? 0)
  if (moved) {
    // Prisoner: a Murch left in the bays is taken a scene later.
    if (f.murchAbandoned && !f.murchCaptured && next.door === 'prisoner') f.murchCaptured = true
    const moves = Number(f.ch2Moves ?? 0) + 1
    f.ch2Moves = moves
    if (f.hornCut && !f.hornRepaired) {
      const since = moves - Number(f.hornCutAt ?? moves)
      if ((f.murchAbandoned || f.murchCaptured) && since >= 1) {
        f.hornRepaired = true
        f.hornByMurch = true
        addFlash(next, HORN_MURCH_FIX)
      } else if (since >= 3) {
        f.hornRepaired = true
        addFlash(next, HORN_REPAIRED)
      }
    }
  }
  // The supply skiff: safe while the horn is down, hot otherwise.
  if (f.ch2SupplyRide) {
    delete f.ch2SupplyRide
    if (f.hornCut && !f.hornRepaired) addFlash(next, SUPPLY_SAFE)
    else {
      addFlash(next, SUPPLY_HOT)
      if (f.hornByMurch) addFlash(next, SUPPLY_MURCH)
      if (roll(state, 'supply', 2) === 0) {
        hurt(next, 2)
        addFlash(next, `${MILLER_TURRETS}\n\n${TURRET_LINE}`)
      }
    }
  }
  // Murch's lift: a jam, one in three, unless Vex knows the dead stops.
  if (f.ch2LiftRoll) {
    delete f.ch2LiftRoll
    if (!f.vexFreed && roll(state, 'lift', 3) === 0) {
      hurt(next, 1)
      addFlash(next, 'The cage jams between stops and drops the last stretch. You hit the floor hard.')
    }
  }
  // The rite at Seeker Heat 3-4: one in two that the keeper doubts you.
  if (f.ch2RiteRoll) {
    delete f.ch2RiteRoll
    if (roll(state, 'rite', 2) === 0) addFlash(next, RITE_HOLD)
    else {
      f.coverBlown = true
      addFlash(next, RITE_FAIL)
    }
  }
  // The Key owed to Greg from a Reckoning lost before the cache.
  if (f.keyOwed && f.spireKey && !f.keySurrendered && (next.items.spire_key ?? 0) > 0) {
    next.items = { ...next.items, spire_key: 0 }
    f.keySurrendered = true
    delete f.keyOwed
    next.flash = next.flash === KEY_TAKEN ? RECKONING_LOST : next.flash ? `${next.flash}\n\n${RECKONING_LOST}` : RECKONING_LOST
  }
  // Fights: settle the outcome when the card closes.
  const tag = state.flags.ch2Fight
  if (typeof tag === 'string' && tag) {
    if (state.flags.encounterHere && !next.flags.encounterHere) {
      delete f.ch2Fight
      const won = !state.flags.encounterFled && !next.flags.downed && (next.health ?? 1) > 0
      if (tag === 'test') {
        delete f.cupPassed
        f.cupFailed = true
        // v179: lost or fled, he has moved on: no sprite, no voice in the test chamber.
        if (!won) f.valeriusMoved = true
      }
      if (won) {
        f[`ch2Won_${tag}`] = true
        if (tag === 'reckoning') f.reckoningDone = true
        if (tag === 'bounty') {
          f.bountyBroken = true
          next.heat = { ...next.heat, cartel: Math.min(8, (next.heat.cartel ?? 0) + 2) }
        }
        if (tag === 'valerius') {
          next.items = { ...next.items, valerius_baton: (next.items.valerius_baton ?? 0) + 1, cipher_key: (next.items.cipher_key ?? 0) + 1 }
          addFlash(next, VALERIUS_LOOT)
        }
      } else {
        f[`ch2Lost_${tag}`] = true
        if (tag === 'reckoning') {
          f.reckoningDone = true
          if ((next.items.spire_key ?? 0) > 0) {
            next.items = { ...next.items, spire_key: 0 }
            f.keySurrendered = true
            addFlash(next, RECKONING_LOST)
          } else f.keyOwed = true
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
  if (f.ch2RunHand) {
    delete f.ch2RunHand
    next.hands = Math.max(0, (typeof next.hands === 'number' ? next.hands : HANDS_MAX) - 1)
  }
  // Arrival beats that open a fight or a hunt.
  if (moved && !next.flags.encounterHere && !next.flags.downed) {
    if (next.sceneId === 'ch2:p-sift' && (next.heat.cartel ?? 0) >= 4 && !f.siftChecked) {
      f.siftChecked = true
      if (roll(state, 'sift', 2) === 0) openFight(next, 'greg', 'sift', SIFT_SPOTTED)
    } else if (next.sceneId === 'ch2:o-strays' && (next.heat.strays ?? 0) >= 4 && !f.straysThrown) {
      f.straysThrown = true
      openFight(next, 'strayhunter', 'strays', STRAYS_THROW_OUT)
    } else if (next.sceneId === 'ch2:o-stakes' && !f.stakesHunt) {
      f.stakesHunt = true
      next.flags = { ...next.flags, strayHunterHere: true, strayHunterHound: (next.heat.strays ?? 0) >= 5, strayHuntStep: Number(next.flags.sceneSteps ?? 0), fightQuiet: 0 }
      next.flash = undefined
    }
    f = next.flags
  }
  // The drill clock: Sybella's team comes down while you walk.
  // v180: a breach scene says the drills are through; the stage follows, with no second line.
  if (moved && BREACH_SCENES.includes(next.sceneId)) f.drillStage = 3
  else if (moved && !f.spireKey) {
    const steps = Number(f.ch2Steps ?? 0) + 1
    f.ch2Steps = steps
    const stage = steps >= 18 ? 3 : steps >= 12 ? 2 : steps >= 6 ? 1 : 0
    if (stage > Number(f.drillStage ?? 0)) {
      f.drillStage = stage
      // Scenes that print the drill stage themselves do not also get the flash.
      if (!DRILL_SCENES.includes(next.sceneId)) addFlash(next, DRILL_LINES[stage])
    }
  }
  // v180: with the Spire Key, a Seeker patrol is waiting at the drill run (once), and the zone's Seekers hit harder.
  if (moved && f.spireKey && BREACH_SCENES.includes(next.sceneId) && !f.keyPatrolMet && !next.flags.encounterHere && !next.flags.downed) {
    f.keyPatrolMet = true
    openFight(next, 'seekerpatrol', 'keypatrol', TOO_MANY_LAMPS)
    f = next.flags
  }
  return next
}
