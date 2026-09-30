import { getScene } from './content'
import { roadPressureScene } from './encounter'
import { isPressureOverlay } from './hunter'
import { compassCommand, compassMoves } from './map'
import { personAtScene } from './people'
import { talkIntentsFor } from './talk'
import type { Effect, GameState } from './types'

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A typed line repeats a button when every real word is already on that label. */
function covered(command: string, labels: string[]): boolean {
  const words = norm(command)
    .split(' ')
    .filter((w) => w.length >= 3)
  if (!words.length) return false
  return labels.some((label) => {
    const have = new Set(norm(label).split(' ').filter(Boolean))
    return words.every((w) => have.has(w))
  })
}

function push(list: string[], labels: string[], command: string) {
  const key = norm(command)
  if (!key || list.some((c) => norm(c) === key) || covered(command, labels)) return
  list.push(command)
}

function blocked(state: GameState): boolean {
  return !!(state.flags.downed || (state.health ?? 1) <= 0 || state.flags.encounterHere || isPressureOverlay(state))
}

function underHull(state: GameState): boolean {
  return !!(state.flags.jaxsonInside && state.flags.guardDown && !state.flags.striderHot)
}

/** Concrete `search <thing>` lines. Only targets that resolve on this scene. */
export function sceneSearch(state: GameState, target: string): Effect | null {
  const t = norm(target).replace(/^the /, '')
  const id = state.sceneId
  if (id === 'camp:bay' && (t === 'north hull' || t === 'hull' || t === 'pike' || t.includes('lash'))) {
    const cord = !!state.flags.lashCord
    const trade = (state.items.wrench ?? 0) > 0 && !state.flags.wrenchBayTrade && !cord
    const flash = cord
      ? 'Pike is still scraping the north hull. The lash cord is already in your hand.'
      : trade
        ? 'Pike scrapes the north hull and does not look up. A lash cord is on the runner. You can steal it, or trade him the wrench for it.'
        : 'Pike scrapes the north hull and does not look up. A lash cord is on the runner.'
    return { flag: { bayLooked: true }, flash }
  }
  if (id === 'ch1:p-pipe' && (t === 'grate' || t === 'bolt' || t === 'pipe' || t === 'fence')) {
    const wrench = (state.items.wrench ?? 0) > 0
    return {
      flash: wrench
        ? 'A steam grate, bolts Camp-04 cheaped out on. The wrench will take the west bolt. The open wash is the other way, and Clerk Rell is on the far side.'
        : 'A steam grate. No wrench. You can crawl the hot pipe, or run the open wash where Clerk Rell is already waiting.',
    }
  }
  if (id === 'ch1:p-clerk' && (t === 'tablet' || t === 'clerk' || t === 'papers')) {
    return {
      flash: 'Clerk Rell’s steam-tablet. He wants work papers, or he writes you down as escaped and calls a Hound. Then he goes home.',
    }
  }
  if (id === 'ch1:p-oil' && (t === 'hull' || t === 'runner' || t === 'lash' || t === 'tag' || t === 'cuff')) {
    const wrench = (state.items.wrench ?? 0) > 0
    return {
      flash: wrench
        ? 'The stolen hull is loud. A lash on the port runner is coming loose. The wrench would seat it. The Cartel tag is still sewn in your cuff.'
        : 'The stolen hull is loud. Oil-Tooth is under it. The Cartel tag is still sewn in your cuff unless you let him cut it.',
    }
  }
  return null
}

/**
 * Hidden typed actions for this scene: things that work and are not already buttons.
 * Every string here must resolve through interpret without a Miss.
 */
export function hiddenCommands(state: GameState, labels: string[]): string[] {
  const list: string[] = []
  const scene = getScene(state.sceneId, state.door)
  const down = !!(state.flags.downed || (state.health ?? 1) <= 0)
  const fight = !!state.flags.encounterHere
  const press = isPressureOverlay(state)

  if (!down && !fight) {
    push(list, labels, 'look around')
  }

  if (blocked(state)) return list

  const who = personAtScene(scene.id)
  if (who && talkIntentsFor(scene.id).length) {
    push(list, labels, `talk ${who.name}`)
    push(list, labels, `who is ${who.name}`)
  }

  if (state.sceneId === 'camp:bay') {
    push(list, labels, 'talk Pike')
    push(list, labels, 'talk Sarn')
    push(list, labels, 'talk Vetch')
    if (underHull(state)) push(list, labels, 'talk Oil-Tooth')
    push(list, labels, 'search north hull')
    if (!state.flags.bayPikeTook) push(list, labels, 'steal bolt from Pike')
    if (!state.flags.baySarnTook) push(list, labels, 'steal scrap from Sarn')
    if (!state.flags.bayVetchTook) push(list, labels, 'steal wire from Vetch')
    if ((state.items.wrench ?? 0) > 0 && !state.flags.wrenchBayTrade) {
      if (!state.flags.lashCord) push(list, labels, 'trade wrench to Pike')
      push(list, labels, 'trade wrench to Sarn')
      push(list, labels, 'trade wrench to Vetch')
    }
  }

  if (state.sceneId === 'ch1:p-pipe') push(list, labels, 'search the grate')
  if (state.sceneId === 'ch1:p-clerk') push(list, labels, 'search the tablet')
  if (state.sceneId === 'ch1:p-oil') push(list, labels, 'search the hull')

  const mouth = !!(who || scene.speaker || talkIntentsFor(scene.id).length)
  if (
    !mouth &&
    roadPressureScene(scene.id) &&
    scene.kind !== 'talk' &&
    scene.kind !== 'crisis' &&
    scene.kind !== 'ending'
  ) {
    push(list, labels, 'fight the road')
  }

  if (!press) {
    const moves = compassMoves(state)
    for (const move of moves) push(list, labels, compassCommand(moves, move))
  }

  return list
}

export function helpText(state: GameState, labels: string[]): string {
  const cmds = hiddenCommands(state, labels)
  if (!cmds.length) return 'Nothing hidden to type here. Try look.'
  return `Things you could try here:\n${cmds.join('\n')}`
}
