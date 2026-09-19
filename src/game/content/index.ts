import type { Scene } from '../types'
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

export function getScene(id: string): Scene {
  const s = byId.get(id)
  if (!s) {
    return {
      id: 'missing',
      kind: 'story',
      title: 'Lost Heading',
      body: 'The desert misplaced this beat. Step back to somewhere that still has a name.',
      choices: [{ id: 'title', label: 'Find shade', effects: { goto: 'camp:yard' } }],
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
