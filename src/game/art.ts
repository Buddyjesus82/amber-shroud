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
  | 'skiff_bay_docks'
  | 'stray_collector'
  | 'bay_pike'
  | 'corvin'
  | 'guard'
  | 'yard'
  | 'vents'
  | 'mira'
  | 'korvan'
  | 'storm'
  | 'bootprints'
  | 'camp_shiv'
  | 'bay_sarn'
  | 'bay_vetch'
  | 'hotwire'
  | 'carapace'
  | 'jodi'
  | 'hoard'
  | 'rim_gullet'
  | 'rim_bonewash'
  | 'rim_pilgrims_scar'
  | 'courtguard'
  | 'down'
  | 'resin_vault'
  | 'extraction_rig'

const FILES: Record<CoverKey, string> = {
  world: 'world.jpg',
  hunger: 'hunger.png',
  camp04: 'camp04.jpg',
  spine: 'spine.jpg',
  threshold: 'threshold.jpg',
  valerius: 'valerius.jpg',
  hound: 'hound.jpg',
  sybella: 'sybella.jpg',
  thalia: 'thalia.jpg',
  zafir: 'bonewright.jpg',
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
  skiff_bay_docks: 'skiff-bay-docks.jpg',
  stray_collector: 'stray-collector.jpg',
  bay_pike: 'bay_pike.jpg',
  corvin: 'corvin.jpg',
  guard: 'guard.jpg',
  yard: 'yard.jpg',
  vents: 'steam-vents.jpg',
  mira: 'mira.jpg',
  korvan: 'korvan.jpg',
  storm: 'camp-storm.jpg',
  bootprints: 'bootprints.jpg',
  camp_shiv: 'camp-shiv.jpg',
  bay_sarn: 'bay_sarn.jpg',
  bay_vetch: 'bay_vetch.jpg',
  hotwire: 'hotwire.jpg',
  carapace: 'carapace.jpg',
  jodi: 'jodi.jpg',
  hoard: 'hoard.jpg',
  rim_gullet: 'rim-gullet.jpg',
  rim_bonewash: 'rim-bonewash.jpg',
  rim_pilgrims_scar: 'rim-pilgrims-scar.jpg',
  courtguard: 'courtguard.jpg',
  down: 'down.jpg',
  resin_vault: 'resin-vault.jpg',
  extraction_rig: 'extraction-rig.jpg',
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
  // The Cartel barge, the tarp Strider, and the white skiff's amber crane.
  skiff_bay_docks: [0.15, 0.85],
  // The hooded collector, hood to boots, with the spine bones at his feet.
  stray_collector: [0.02, 0.85],
  // Pike's bolt glows in the rear knee joint; the skiff legs reach the cradle.
  bay_pike: [0.12, 0.82],
  // Corvin's face sits high; keep his head and hands.
  corvin: [0.0, 0.75],
  // Guardhouse vents and the Strider walker both sit in the middle band.
  guard: [0.15, 0.85],
  // Vat mouths and the bent prisoners fill the lower two-thirds.
  yard: [0.25, 0.95],
  // The far grate and the side jets of steam sit across the middle.
  vents: [0.15, 0.8],
  // Mira's face and the brass pendant sit in the upper band.
  mira: [0.0, 0.75],
  // Korvan's amber-scarred face is center-left in the upper half.
  korvan: [0.0, 0.7],
  // The storm wall over the camp sits across the middle.
  storm: [0.15, 0.85],
  // The prints run up the lower half toward the tent.
  bootprints: [0.3, 1.0],
  // Both hands on the bar and the sparks sit in the middle band.
  camp_shiv: [0.25, 0.85],
  // Sarn's bolts and scrap pile are on the crate in front.
  bay_sarn: [0.12, 0.96],
  // Vetch's vial sits under the skiff; the copper wire and the torch are low.
  bay_vetch: [0.15, 0.9],
  // Jaxson on his back under the hull, the spark, the toolbox.
  hotwire: [0.2, 0.9],
  carapace: [0.0, 0.75],
  // Jodi's face, the snake on her arm, and the vulture behind her are in the top half.
  jodi: [0.04, 0.5],
  // Kaelen's crate lead: the open crate with its tally marks sits lower left-center.
  hoard: [0.42, 1.0],
  // Maw arrivals, one per door: the walker and the ribs / bone road / cairn ridge.
  rim_gullet: [0.1, 0.85],
  rim_bonewash: [0.2, 0.95],
  rim_pilgrims_scar: [0.15, 0.9],
  // Court Guard: face, coat, and the curved blade.
  courtguard: [0.05, 0.85],
  // Approach Dry: the fallen figure and the empty glass, center-lower.
  down: [0.35, 0.95],
  // The newest amber figure in the light, the Seeker chalking below it.
  resin_vault: [0.2, 0.95],
  // The scavenger's face, the tubes, and the ledger-drum.
  extraction_rig: [0.1, 0.85],
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
  // The Stray collector hunt has its own cover (stray_collector); the named Strays use their portraits.
  korvan: 'korvan',
  mira: 'mira',
  corvin: 'corvin',
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

/** Neutral fight cover: the hub's land, or the door's road on the Cache Run and at the Maw. */
function fightGround(state: GameState, scene: Pick<Scene, 'id' | 'chapterId' | 'hubId'>): CoverKey {
  const hub = scene.chapterId === 'cache-run' || state.chapterId === 'cache-run' ? undefined : (scene.hubId ?? state.hubId)
  if (hub === 'camp04') return 'camp04'
  if (hub === 'spine') return 'spine'
  if (hub === 'threshold') return 'threshold'
  if (state.door === 'outcast') return 'rim_bonewash'
  if (state.door === 'vessel') return 'rim_pilgrims_scar'
  return 'rim_gullet'
}

/** Interrupt faces first, then the door's land, then Hunger / world. */
export function playCoverKey(state: GameState, scene: Pick<Scene, 'id' | 'art' | 'chapterId' | 'hubId'>): CoverKey {
  const id = scene.id
  // Down, on every door: the collapse art, never the scene you fell in.
  if (state.flags.downed || (state.health ?? 1) <= 0) return 'down'
  if (state.flags.encounterHere) {
    const kind = state.flags.encounterKind
    // The pup has no handler, so it gets the ground you are on (like jackals and ticks), not the handler portrait.
    if (kind === 'handler' || kind === 'hound') return 'hound'
    if (kind === 'overseer') return 'valerius'
    if (kind === 'patrol') return 'rell'
    if (kind === 'courtguard') return 'courtguard'
    if (kind === 'collector') return SPINE_HUNTER.art
    if (kind === 'carapace') return CARAPACE_HUNTER.art
    // No enemy art yet (husk, scavenger, cutter, jackal, tick, pup): the neutral ground cover, never a face from the scene.
    return fightGround(state, scene)
  }
  if (isSybellaOverlay(state) || id.startsWith('maw:sybella')) return 'sybella'
  if (isCampHunt(state)) return 'hound'
  if (id === 'camp:hunter' || id === 'camp:valerius' || id === 'camp:tower') return 'valerius'
  if (isSpineHunt(state)) return spineHunterFor(state).art
  if (id === 'spine:valerius') return 'valerius'
  if (id === 'spine:hunter' || id === 'spine:hound') return 'hound'
  // Cup-Shadow is Kaelen's pack-shade, never Thalia's.
  if (id === 'thresh:sift') return 'kaelen'
  if (id === 'thresh:thalia' || id.startsWith('thresh:thalia')) return 'thalia'

  const who = npcCover(id)
  if (who) return who

  // The hotwire art is the one-time lookout beat: station down, Jaxson under his skiff.
  if (id === 'camp:bay') return bayLookout(state) ? 'hotwire' : 'skiff_bay_docks'
  if (id === 'camp:bay-pike') return 'bay_pike'
  if (id === 'camp:relic') return 'hoard'
  if (id === 'crisis:maw') return 'down'
  // The Cache Run collapse is a Down screen too.
  if (id === 'crisis:dunes') return 'down'
  // The South Wind: the hull on the horizon, not yet her face. The door's road art.
  if (id === 'ch1:south-wind') return fightGround(state, scene)
  // The Vessel's Cache Run (the Pilgrim's Scar) shows the Scar, not the title art.
  if (state.door === 'vessel' && (id === 'ch1:leave' || id === 'ch1:v-hymn')) return 'rim_pilgrims_scar'
  // The Outcast's road start (Cache Run / the Bone Wash) gets the Bone Wash art, not the title art.
  if (id === 'ch1:leave' && state.door === 'outcast') return 'rim_bonewash'
  if (id === 'open:vessel') return 'resin_vault'
  if (id === 'thresh:crucible-rig') return 'extraction_rig'
  if (id === 'thresh:crucible-stairs') return 'thalia'
  if (id === 'thresh:court-guard') return 'courtguard'
  // The Maw arrival shows the road each door came in by.
  if (id === 'maw:rim' || id === 'ch1:land') {
    if (state.door === 'outcast') return 'rim_bonewash'
    if (state.door === 'vessel') return 'rim_pilgrims_scar'
    return 'rim_gullet'
  }
  if (id === 'camp:guard' || id === 'camp:sabotage') return 'guard'
  if (id === 'camp:yard' || id === 'camp:vats') return 'yard'
  if (id === 'camp:vents') return 'vents'
  if (id === 'spine:korvan') return 'korvan'
  if (id === 'ch1:storm') return 'storm'
  if (id === 'spine:boots') return 'bootprints'
  if (id === 'camp:shiv') return 'camp_shiv'
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
