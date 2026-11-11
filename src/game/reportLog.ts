import { ITEMS } from './content/catalog'
import { handsLeft } from './hands'
import { currentNode } from './map'
import type { GameState, ItemId } from './types'
import { BUILD } from '../version'

/** On-screen words. The copied bundle uses its own field names, listed in the PR. */
export const REPORT_LABEL = 'Report'
export const REPORT_PLACEHOLDER = 'What went wrong?'
export const REPORT_COPY = 'Copy'
export const REPORT_COPIED = 'Copied'
export const REPORT_CLOSE = 'Close'

const STORE_KEY = 'amber-shroud.report-log'
/** Last 50 player moves. Not part of the save. */
export const REPORT_LIMIT = 50
const MAX = REPORT_LIMIT

export type ReportAction = {
  at: number
  kind: 'button' | 'do' | 'map'
  id: string
  label: string
  from: string
  to: string
}

let memory: ReportAction[] | null = null

function disk(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function load(): ReportAction[] {
  const raw = disk()?.getItem(STORE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ReportAction[]
    return Array.isArray(parsed) ? parsed.slice(-MAX) : []
  } catch {
    return []
  }
}

export function reportActions(): ReportAction[] {
  if (!memory) memory = load()
  return memory.slice()
}

/** Ring of the last 50 actions. Stored beside the save, never inside it. */
export function pushReportAction(entry: Omit<ReportAction, 'at'>): void {
  const next = [...reportActions(), { ...entry, at: Date.now() }].slice(-MAX)
  memory = next
  try {
    disk()?.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    /* a full disk must not block play */
  }
}

function bagLine(state: GameState): string {
  const parts = (Object.keys(state.items) as ItemId[])
    .filter((id) => (state.items[id] ?? 0) > 0 && ITEMS[id])
    .map((id) => `${ITEMS[id].name} ${state.items[id]}`)
  return parts.length ? parts.join(', ') : 'empty'
}

function flagLine(state: GameState): string {
  const parts = Object.keys(state.flags)
    .filter((k) => /^(chapter|ch2|ch3|spire|lift|hasBargain|keySurrendered)/.test(k))
    .filter((k) => !/Stash$/.test(k))
    .filter((k) => {
      const v = state.flags[k]
      if (v === false || v === 0 || v === '' || v == null) return false
      return typeof v !== 'string' || v.length <= 40
    })
    .sort()
    .map((k) => `${k}=${state.flags[k]}`)
  return parts.length ? parts.join(', ') : 'none'
}

function actionLine(a: ReportAction, i: number): string {
  return `${i + 1}. ${a.kind} [${a.id}] ${a.label} | ${a.from} -> ${a.to}`
}

/** Plain text for the clipboard. Does not write the save. */
export function reportBundle(state: GameState, note: string, actions: ReportAction[] = reportActions()): string {
  const node = currentNode(state)
  return [
    `Build: ${BUILD}`,
    `Door: ${state.door}`,
    `Chapter: ${state.chapterId ?? ''}`,
    `Scene: ${state.sceneId}`,
    `Hub: ${state.hubId ?? ''}`,
    `Node: ${node?.id ?? ''}`,
    `Sap: ${state.sap}/${state.sapMax}`,
    `Health: ${state.health}/${state.healthMax}`,
    `Hands: ${handsLeft(state)}`,
    `Glints: ${state.items.glints ?? 0}`,
    `Heat: cartel ${state.heat.cartel}, seekers ${state.heat.seekers}, strays ${state.heat.strays}`,
    `Bag: ${bagLine(state)}`,
    `Flags: ${flagLine(state)}`,
    `Note: ${note.trim()}`,
    'Actions:',
    ...(actions.length ? actions.slice(-MAX).map(actionLine) : ['none']),
  ].join('\n')
}
