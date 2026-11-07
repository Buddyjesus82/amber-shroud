import {
  CH3_ARMOR, CH3_ASH_IN, CH3_CHAPTER, CH3_ENTRY, CH3_FIGHT_HEAT, CH3_FIGHT_RESULT, CH3_KEY_BACK, CH3_KEY_HANDOFF, CH3_NO_KEY, CH3_NOISE,
  CH3_RUN_RESULT, CH3_SAP, CH3_STRIP_GEAR, CH3_STRIP_KEY, CH3_STRIP_PARTY, CH3_STRIP_SAP, CH3_WEAPON, CH3_WREN_LINE, CH3_WREN_UNLATCH, CH3_WREN_WORD,
} from './content/luminspire'
import { ITEMS } from './content/catalog'
import { fightStartFlags } from './encounter'
import { snapshot } from './hands'
import type { Effect, GameState, ItemId } from './types'

/** v206 DRAFT: consumables the capture strips and the Sap Crate returns. */
export const CH3_CONSUMABLES: ItemId[] = ['vial_drop', 'salve', 'seeker_rations']

/** v206 DRAFT: spotted odds (in 10) for the vault sneak. Lower Seeker Heat is easier. */
export function vaultSneakOdds(seekers: number): number {
  return Math.max(1, Math.min(9, 2 + Math.floor(seekers / 2)))
}

export function addFlash(next: GameState, line: string): void {
  next.flash = next.flash ? `${next.flash}\n\n${line}` : line
}

function roll(state: GameState, salt: string, n: number): number {
  let h = (state.ticks * 2654435761 + Number(state.flags.sceneSteps ?? 0) * 40503 + 7) >>> 0
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) % n
}

function gearKind(id: string): boolean {
  const k = ITEMS[id as ItemId]?.kind
  return k === 'weapon' || k === 'armor' || k === 'garment'
}

/** Runs after every applied effect. Only touches Chapter Three state. */
export function chapterThreeAfter(state: GameState, next: GameState, _fx?: Effect): GameState {
  const onGround = next.sceneId.startsWith('ch3:')
  if (!onGround) return next
  next = { ...next, flags: { ...next.flags }, items: { ...next.items }, heat: { ...next.heat } }
  const f = next.flags
  if (onGround) {
    next.chapterId = CH3_CHAPTER
    next.hubId = 'barrow'
  }
  // v222: the map may walk these scenes only after the story has already opened them.
  if (next.sceneId === 'ch3:supply' || next.sceneId === 'ch3:tent' || next.sceneId === 'ch3:crosshaven') f.ch3SupplyOpen = true
  if (next.sceneId === 'ch3:tent' || next.sceneId === 'ch3:crosshaven') f.ch3TentOpen = true
  // The capture: both choices land here. Strip gear, consumables, Sap, the key and the party.
  if (f.ch3Strip && !f.ch3Stripped) {
    const how = f.ch3Strip
    delete f.ch3Strip
    f.ch3Stripped = true
    const gear: Record<string, number> = {}
    const cons: Record<string, number> = {}
    for (const [id, n] of Object.entries(next.items)) {
      if (!n) continue
      if (gearKind(id)) gear[id] = n
      else if (CH3_CONSUMABLES.includes(id as ItemId)) cons[id] = n
    }
    for (const id of [...Object.keys(gear), ...Object.keys(cons)]) delete next.items[id as ItemId]
    f.ch3GearStash = JSON.stringify(gear)
    f.ch3ConsStash = JSON.stringify(cons)
    f.ch3SapStash = next.sap
    next.sap = 0
    next.equipped = {}
    const lines = [how === 'run' ? CH3_RUN_RESULT : CH3_FIGHT_RESULT, CH3_STRIP_GEAR, CH3_STRIP_SAP]
    if ((next.items.spire_key ?? 0) > 0) {
      delete next.items.spire_key
      f.ch3KeyTaken = true
      lines.push(CH3_STRIP_KEY)
    }
    delete f.companion
    delete f.companionHp
    lines.push(CH3_STRIP_PARTY)
    if (f.ch3KeyTaken) lines.push(CH3_KEY_HANDOFF)
    f.ch3Helper = roll(state, 'helper', 2) === 0 ? 'wren' : 'corvus'
    next.flash = lines.join('\n')
    f.ch3Started = true
    next.checkpoint = snapshot({ ...next, flash: undefined })
  }
  // The Supply Wagon: first grab free, each grab after +1 Seeker Heat.
  if (f.ch3Grab) {
    const what = f.ch3Grab
    delete f.ch3Grab
    const n = Number(f.ch3Grabs ?? 0)
    f.ch3Grabs = n + 1
    const lines: string[] = []
    if (what === 'weapon' || what === 'armor') {
      const stash = JSON.parse(String(f.ch3GearStash ?? '{}')) as Record<string, number>
      for (const [id, k] of Object.entries(stash)) {
        const isWeapon = ITEMS[id as ItemId]?.kind === 'weapon'
        if (isWeapon === (what === 'weapon')) next.items[id as ItemId] = (next.items[id as ItemId] ?? 0) + k
      }
      lines.push(what === 'weapon' ? CH3_WEAPON : CH3_ARMOR)
    } else {
      next.sap = Math.min(next.sapMax, next.sap + Number(f.ch3SapStash ?? 0))
      const cons = JSON.parse(String(f.ch3ConsStash ?? '{}')) as Record<string, number>
      for (const [id, k] of Object.entries(cons)) next.items[id as ItemId] = (next.items[id as ItemId] ?? 0) + k
      lines.push(CH3_SAP)
    }
    if (n >= 1) {
      next.heat.seekers += 1
      lines.push(CH3_NOISE)
    }
    next.flash = lines.join('\n')
  }
  // The vault: a clean sneak or Wren's deal opens the lockbox.
  if (f.ch3VaultOpen && !f.ch3VaultDone && !f.encounterHere) {
    const how = f.ch3VaultOpen
    delete f.ch3VaultOpen
    f.ch3VaultDone = true
    const lines: string[] = []
    if (how === 'wren') lines.push(CH3_WREN_LINE, CH3_WREN_UNLATCH)
    else lines.push('The lockbox opens.')
    lines.push(giveKey(next))
    if (how === 'wren') lines.push(CH3_WREN_WORD)
    next.flash = lines.join('\n')
  }
  // Vex down: Ash steps in once the win card is closed.
  if (f.ch3VexWon && !f.encounterHere) {
    delete f.ch3VexWon
    next.flags = { ...f, ...fightStartFlags(next, 'ash'), encounterNoSkip: true }
    next.flash = CH3_ASH_IN
    return next
  }
  if (f.ch3AshWon && !f.encounterHere) {
    delete f.ch3AshWon
    f.ch3VaultDone = true
    next.heat.seekers += 2
    addFlash(next, `${giveKey(next)}\n${CH3_FIGHT_HEAT}`)
  }
  return next
}

function giveKey(next: GameState): string {
  if (!next.flags.ch3KeyTaken) return CH3_NO_KEY
  next.items.spire_key = (next.items.spire_key ?? 0) + 1
  return CH3_KEY_BACK
}

export function isChapterThreeEntry(id: string): boolean {
  return id === CH3_ENTRY
}
