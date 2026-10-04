import { bayLookout } from './campJob'
import { isCampHunt, isSpineHunt, isSybellaOverlay } from './hunter'
import { CARAPACE_HUNTER, SPINE_HUNTER, spineHunterFor } from './content/spineHunter'
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
  | 'drennick'
  | 'oram'
  | 'brin'
  | 'rell'
  | 'handler'
  | 'skiffbay'
  | 'bay_pike'
  | 'bay_sarn'
  | 'bay_vetch'
  | 'hotwire'
  | 'carapace'
  | 'jodi'

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
  drennick: 'drennick.jpg',
  oram: 'oram.jpg',
  brin: 'brin.jpg',
  rell: 'rell.jpg',
  handler: 'hound.jpg',
  skiffbay: 'skiffbay.jpg',
  bay_pike: 'bay_pike.jpg',
  bay_sarn: 'bay_sarn.jpg',
  bay_vetch: 'bay_vetch.jpg',
  hotwire: 'hotwire.jpg',
  carapace: 'carapace.jpg',
  jodi: 'jodi.jpg',
}

/**
 * The band of each cover that must stay visible above the story panel, as [top, bottom] fractions
 * of the image height. People, skiff legs, and the glowing things you can take live in this band.
 * When the band is taller than the clear window over the story, the cover scales down (blurred fill
 * at the sides) instead of hiding the band behind text. See `.scene-img` in index.css.
 */
export const COVER_BAND: Record<CoverKey, [number, number]> = {
  world: [0.05, 0.75],
  hunger: [0.05, 0.75],
  camp04: [0.1, 0.8],
  spine: [0.15, 0.85],
  threshold: [0.1, 0.85],
  valerius: [0.05, 0.7],
  hound: [0.05, 0.8],
  sybella: [0.0, 0.6],
  thalia: [0.05, 0.88],
  zafir: [0.1, 0.9],
  ossa: [0.15, 0.95],
  kaelen: [0.05, 0.72],
  oiltooth: [0.05, 0.78],
  silas: [0.0, 0.6],
  // Drennick's face and glasses are in the top 60%.
  drennick: [0.0, 0.62],
  oram: [0.1, 0.9],
  brin: [0.05, 0.72],
  rell: [0.1, 0.85],
  handler: [0.05, 0.8],
  // Skiff Bay: the four bays, the people, and Vetch's torch.
  skiffbay: [0.2, 0.84],
  // Pike's bolt glows in the rear knee joint; the skiff legs reach the cradle.
  bay_pike: [0.12, 0.82],
  // Sarn's bolts and scrap pile are on the crate in front.
  bay_sarn: [0.12, 0.96],
  // Vetch's vial sits under the skiff; the copper wire and the torch are low.
  bay_vetch: [0.15, 0.9],
  // Jaxson on his back under the hull, the spark, the toolbox.
  hotwire: [0.2, 0.9],
  carapace: [0.0, 0.75],
  // Jodi's face, the snake on her arm, and the vulture behind her are in the top half.
  jodi: [0.04, 0.5],
}

export function coverBand(key: CoverKey): [number, number] {
  return COVER_BAND[key] ?? [0, 0.5]
}

const PERSON_COVER: Record<PersonId, CoverKey> = {
  oiltooth: 'oiltooth',
  kaelen: 'kaelen',
  valerius: 'valerius',
  rell: 'rell',
  silas: 'silas',
  drennick: 'drennick',
  thalia: 'thalia',
  oram: 'oram',
  brin: 'brin',
  zafir: 'zafir',
  ossa: 'ossa',
  sybella: 'sybella',
  handler: 'handler',
  // No portraits yet for the Spine Strays. They use the Spine art.
  korvan: 'spine',
  mira: 'spine',
  corvin: 'spine',
  jodi: 'jodi',
  carapace: 'carapace',
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
  if (state.flags.encounterHere) {
    const kind = state.flags.encounterKind
    if (kind === 'handler' || kind === 'pup') return 'hound'
    if (kind === 'overseer') return 'valerius'
    if (kind === 'patrol') return 'rell'
    if (kind === 'scavenger' || kind === 'cutter') return 'hunger'
    if (kind === 'collector') return SPINE_HUNTER.art
    if (kind === 'carapace') return CARAPACE_HUNTER.art
  }
  if (isSybellaOverlay(state) || id.startsWith('maw:sybella')) return 'sybella'
  if (isCampHunt(state)) return 'hound'
  if (id === 'camp:hunter' || id === 'camp:valerius' || id === 'camp:tower') return 'valerius'
  if (isSpineHunt(state)) return spineHunterFor(state).art
  if (id === 'spine:valerius') return 'valerius'
  if (id === 'spine:hunter' || id === 'spine:hound') return 'hound'
  if (id === 'thresh:thalia' || id.startsWith('thresh:thalia')) return 'thalia'

  const who = npcCover(id)
  if (who) return who

  // The hotwire art is the one-time lookout beat: station down, Jaxson under his skiff.
  if (id === 'camp:bay') return bayLookout(state) ? 'hotwire' : 'skiffbay'
  if (id === 'camp:bay-pike') return 'bay_pike'
  if (id === 'camp:bay-sarn') return 'bay_sarn'
  if (id === 'camp:bay-vetch') return 'bay_vetch'

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
