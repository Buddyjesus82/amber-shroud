import { isSybellaOverlay } from './hunter'
import { PEOPLE, type PersonId } from './people'
import type { GameState, Scene } from './types'

export type CoverKey =
  | 'world'
  | 'hunger'
  | 'camp04'
  | 'spine'
  | 'threshold'
  | 'valerius'
  | 'hound'
  | 'sybella'
  | 'thalia'
  | 'zafir'
  | 'ossa'
  | 'kaelen'
  | 'oiltooth'
  | 'silas'
  | 'nim'
  | 'oram'
  | 'brin'
  | 'rell'

const FILES: Record<CoverKey, string> = {
  world: 'world.png',
  hunger: 'hunger.png',
  camp04: 'camp04.jpg',
  spine: 'spine.jpg',
  threshold: 'threshold.jpg',
  valerius: 'valerius.jpg',
  hound: 'hound.jpg',
  sybella: 'sybella.jpg',
  thalia: 'thalia.jpg',
  zafir: 'zafir.jpg',
  ossa: 'ossa.jpg',
  kaelen: 'kaelen.jpg',
  oiltooth: 'oiltooth.jpg',
  silas: 'silas.jpg',
  nim: 'nim.jpg',
  oram: 'oram.jpg',
  brin: 'brin.jpg',
  rell: 'rell.jpg',
}

const PERSON_COVER: Record<PersonId, CoverKey> = {
  oiltooth: 'oiltooth',
  kaelen: 'kaelen',
  valerius: 'valerius',
  rell: 'rell',
  silas: 'silas',
  nim: 'nim',
  thalia: 'thalia',
  oram: 'oram',
  brin: 'brin',
  zafir: 'zafir',
  ossa: 'ossa',
  sybella: 'sybella',
}

function npcCover(sceneId: string): CoverKey | null {
  for (const p of Object.values(PEOPLE)) {
    if (p.scenes.includes(sceneId)) return PERSON_COVER[p.id]
  }
  return null
}

export function playCoverFile(key: CoverKey): string {
  return FILES[key]
}

/** Interrupt faces first, then the door's land, then Hunger / world. */
export function playCoverKey(state: GameState, scene: Pick<Scene, 'id' | 'art' | 'chapterId' | 'hubId'>): CoverKey {
  const id = scene.id
  if (isSybellaOverlay(state) || id.startsWith('maw:sybella')) return 'sybella'
  if (
    id === 'camp:hunter' ||
    id === 'camp:valerius' ||
    id === 'camp:tower' ||
    (state.flags.hunterHere && (state.hubId === 'camp04' || id.startsWith('camp:')))
  ) {
    return 'valerius'
  }
  if (
    id === 'spine:hunter' ||
    id === 'spine:hound' ||
    id === 'spine:valerius' ||
    (state.flags.hunterHere && (state.hubId === 'spine' || id.startsWith('spine:')))
  ) {
    return 'hound'
  }
  if (id === 'thresh:thalia' || id.startsWith('thresh:thalia')) return 'thalia'

  const who = npcCover(id)
  if (who) return who

  if (scene.art === 'hunger' || scene.chapterId === 'cache-run' || state.chapterId === 'cache-run' || state.hubId === 'redmaw' || id.startsWith('maw:') || id.startsWith('ch1:') || id.startsWith('ch2:')) {
    return 'hunger'
  }
  if (state.hubId === 'camp04' || id.startsWith('camp:') || id.startsWith('open:prisoner')) return 'camp04'
  if (state.hubId === 'spine' || id.startsWith('spine:') || id.startsWith('open:outcast')) return 'spine'
  if (state.hubId === 'threshold' || id.startsWith('thresh:') || id.startsWith('open:vessel')) return 'threshold'
  if (state.door === 'prisoner') return 'camp04'
  if (state.door === 'outcast') return 'spine'
  if (state.door === 'vessel') return 'threshold'
  return scene.art === 'world' ? 'world' : 'world'
}
