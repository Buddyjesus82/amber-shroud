import type { DoorId, Scene } from '../types'
import { campScenes } from './camp04'
import { cacheRunScenes } from './cacheRun'
import { crisisScenes } from './crises'
import { campKaelenScenes, spineKaelenScenes } from './kaelen'
import { openingScenes } from './openings'
import { redMawScenes } from './redMaw'
import { spineScenes } from './spine'
import { thresholdScenes } from './threshold'

export { DOORS, HUBS, ITEMS } from './catalog'

const all: Scene[] = [
  ...openingScenes,
  ...campScenes,
  ...campKaelenScenes,
  ...spineScenes,
  ...spineKaelenScenes,
  ...thresholdScenes,
  ...cacheRunScenes,
  ...redMawScenes,
  ...crisisScenes,
]

const byId = new Map(all.map((s) => [s.id, s]))

export function hasScene(id: string): boolean {
  return byId.has(id)
}

function lostHome(door?: DoorId): { goto: string; enterHub?: string; label: string } {
  if (door === 'outcast') return { goto: 'spine:ridge', enterHub: 'spine', label: 'Back to the Spine' }
  if (door === 'vessel') return { goto: 'thresh:court', enterHub: 'threshold', label: 'Back to the Court' }
  return { goto: 'camp:cages', enterHub: 'camp04', label: 'Back to the pens' }
}

export function getScene(id: string, door?: DoorId): Scene {
  const s = byId.get(id)
  if (!s) {
    const home = lostHome(door)
    return {
      id: 'missing',
      kind: 'story',
      title: 'Lost Heading',
      body: 'The desert misplaced this beat. Step back to somewhere that still has your name on it.',
      choices: [
        {
          id: 'home',
          label: home.label,
          tone: 'quiet',
          effects: { goto: home.goto, enterHub: home.enterHub },
        },
      ],
    }
  }
  return s
}

export function resolveBody(
  scene: Scene,
  check: (cond: import('../types').Cond | undefined) => boolean,
  base = scene.body,
): string {
  let body = base
  for (const v of scene.variants ?? []) {
    if (!check(v.if)) continue
    if (v.mode === 'append') body = `${body}\n\n${v.body}`
    else body = v.body
  }
  return body
}

export const ALL_SCENES = all
