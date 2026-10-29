import { campHuntIsValerius } from './valeriusRest'
import { isMaskedFlash, maskedCoverKey } from './masked'
import { STRAY_HUNTER_COVER } from './strayHunter'
import { bayLookout } from './campJob'
import { isCampHunt, isSpineHunt, isSybellaOverlay, isThreshHunt } from './hunter'
import { CARAPACE_HUNTER, SPINE_HUNTER, spineHunterFor } from './content/spineHunter'
import { personAtScene, type PersonId } from './people'
import type { GameState, Scene } from './types'

export type CoverKey =
  | 'ch2_fight_dragoon'
  | 'ch2_fight_drill_lead'
  | 'ch2_fight_patrol'
  | 'ch2_o_abyss'
  | 'ch2_o_bounty'
  | 'ch2_o_cage'
  | 'ch2_o_hounds'
  | 'ch2_o_root'
  | 'ch2_o_stakes'
  | 'ch2_o_stilts'
  | 'ch2_o_strays'
  | 'ch2_o_wash'
  | 'ch2_p_abyss'
  | 'ch2_p_bays'
  | 'ch2_p_bilge'
  | 'ch2_p_haul'
  | 'ch2_p_jaws'
  | 'ch2_p_shaft'
  | 'ch2_p_sift'
  | 'ch2_v_bleed'
  | 'ch2_v_blown'
  | 'ch2_v_garden'
  | 'ch2_v_greg'
  | 'ch2_v_murch'
  | 'ch2_v_outpost'
  | 'ch2_v_ribs'
  | 'ch2_v_scar'
  | 'ch2_v_stair'
  | 'ch2_v_test'
  | 'world'
  | 'hunger'
  | 'spine'
  | 'threshold'
  | 'valerius'
  | 'greg'
  | 'murch'
  | 'vex'
  | 'hound'
  | 'sybella'
  | 'thalia'
  | 'rim_cutter'
  | 'waste_scavenger'
  | 'amber_husk'
  | 'dust_jackal'
  | 'rib_worm'
  | 'amber_tick'
  | 'shard_pup'
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
  | 'stall_empty'
  | 'rim_gullet'
  | 'rim_bonewash'
  | 'maw_lip'
  | 'maw_ribs'
  | 'maw_hold'
  | 'maw_wreck'
  | 'last_fence'
  | 'noon_country'
  | 'hymn_road'
  | 'cache_run'
  | 'lash_holds'
  | 'valued_thing'
  | 'ch1_end'
  | 'under_jaw'
  | 'masked_figure'
  | 'masked_far'
  | 'south_wind'
  | 'holding_cells'
  | 'rim_pilgrims_scar'
  | 'courtguard'
  | 'down'
  | 'resin_vault'
  | 'extraction_rig'

const FILES: Record<CoverKey, string> = {
  ch2_fight_dragoon: 'ch2-fight-dragoon.jpg',
  ch2_fight_drill_lead: 'ch2-fight-drill-lead.jpg',
  ch2_fight_patrol: 'ch2-fight-patrol.jpg',
  ch2_o_abyss: 'ch2-o-abyss.jpg',
  ch2_o_bounty: 'ch2-o-bounty.jpg',
  ch2_o_cage: 'ch2-o-cage.jpg',
  ch2_o_hounds: 'ch2-o-hounds.jpg',
  ch2_o_root: 'ch2-o-root.jpg',
  ch2_o_stakes: 'ch2-o-stakes.jpg',
  ch2_o_stilts: 'ch2-o-stilts.jpg',
  ch2_o_strays: 'ch2-o-strays.jpg',
  ch2_o_wash: 'ch2-o-wash.jpg',
  ch2_p_abyss: 'ch2-p-abyss.jpg',
  ch2_p_bays: 'ch2-p-bays.jpg',
  ch2_p_bilge: 'ch2-p-bilge.jpg',
  ch2_p_haul: 'ch2-p-haul.jpg',
  ch2_p_jaws: 'ch2-p-jaws.jpg',
  ch2_p_shaft: 'ch2-p-shaft.jpg',
  ch2_p_sift: 'ch2-p-sift.jpg',
  ch2_v_bleed: 'ch2-v-bleed.jpg',
  ch2_v_blown: 'ch2-v-blown.jpg',
  ch2_v_garden: 'ch2-v-garden.jpg',
  ch2_v_greg: 'ch2-v-greg.jpg',
  ch2_v_murch: 'ch2-v-murch.jpg',
  ch2_v_outpost: 'ch2-v-outpost.jpg',
  ch2_v_ribs: 'ch2-v-ribs.jpg',
  ch2_v_scar: 'ch2-v-scar.jpg',
  ch2_v_stair: 'ch2-v-stair.jpg',
  ch2_v_test: 'ch2-v-test.jpg',
  world: 'world.jpg',
  hunger: 'hunger.png',
  greg: 'greg.jpg',
  murch: 'murch.jpg',
  vex: 'vex.jpg',
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
  handler: 'handler.jpg',
  skiffbay: 'skiffbay.jpg',
  // v150: Jaxson's Stall after he has gone. Iron lean-to, wrench cut-out, cold sap.
  stall_empty: 'stall-empty.jpg',
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
  maw_lip: 'maw-lip.jpg',
  maw_ribs: 'maw-ribs.jpg',
  maw_hold: 'maw-hold.jpg',
  maw_wreck: 'maw-wreck.jpg',
  last_fence: 'last-fence.jpg',
  noon_country: 'noon-country.jpg',
  hymn_road: 'hymn-road.jpg',
  cache_run: 'cache-run.jpg',
  lash_holds: 'lash-holds.jpg',
  valued_thing: 'valued-thing.jpg',
  ch1_end: 'ch1-end.jpg',
  under_jaw: 'under-jaw.jpg',
  masked_figure: 'masked-figure.jpg',
  masked_far: 'masked-far.jpg',
  south_wind: 'south-wind.jpg',
  holding_cells: 'holding-cells.jpg',
  rim_pilgrims_scar: 'rim-pilgrims-scar.jpg',
  courtguard: 'courtguard.jpg',
  down: 'down.jpg',
  resin_vault: 'resin-vault.jpg',
  extraction_rig: 'extraction-rig.jpg',
  rim_cutter: 'rim-cutter.jpg',
  waste_scavenger: 'waste-scavenger.jpg',
  amber_husk: 'amber-husk.jpg',
  dust_jackal: 'dust-jackal.jpg',
  rib_worm: 'rib-worm.jpg',
  amber_tick: 'amber-tick.jpg',
  shard_pup: 'shard-pup.jpg',
}

/**
 * The band of each cover that must stay visible above the story panel, as [top, bottom] fractions
 * of the image height. People, skiff legs, and the glowing things you can take live in this band.
 * When the band is taller than the clear window over the story, the cover scales down (blurred fill
 * at the sides) instead of hiding the band behind text. See `.scene-img` in index.css.
 */
export const COVER_BAND: Record<CoverKey, [number, number]> = {
  // v168: Chapter Two door art. Faces sit high; wide shots keep the middle band.
  ch2_fight_dragoon: [0.08, 0.72],
  ch2_fight_drill_lead: [0.08, 0.72],
  ch2_fight_patrol: [0.08, 0.72],
  ch2_o_abyss: [0.08, 0.72],
  ch2_o_bounty: [0.18, 0.86],
  ch2_o_cage: [0.08, 0.72],
  ch2_o_hounds: [0.18, 0.86],
  ch2_o_root: [0.18, 0.86],
  ch2_o_stakes: [0.08, 0.72],
  ch2_o_stilts: [0.18, 0.86],
  ch2_o_strays: [0.18, 0.86],
  ch2_o_wash: [0.18, 0.86],
  ch2_p_abyss: [0.08, 0.72],
  ch2_p_bays: [0.18, 0.86],
  ch2_p_bilge: [0.18, 0.86],
  ch2_p_haul: [0.18, 0.86],
  ch2_p_jaws: [0.08, 0.72],
  ch2_p_shaft: [0.18, 0.86],
  ch2_p_sift: [0.18, 0.86],
  ch2_v_bleed: [0.08, 0.72],
  ch2_v_blown: [0.18, 0.86],
  ch2_v_garden: [0.18, 0.86],
  ch2_v_greg: [0.08, 0.72],
  ch2_v_murch: [0.08, 0.72],
  ch2_v_outpost: [0.18, 0.86],
  ch2_v_ribs: [0.08, 0.72],
  ch2_v_scar: [0.18, 0.86],
  ch2_v_stair: [0.18, 0.86],
  ch2_v_test: [0.08, 0.72],
  world: [0.05, 0.75],
  hunger: [0.05, 0.75],
  greg: [0.0, 0.6],
  murch: [0.0, 0.65],
  vex: [0.02, 0.8],
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
  // The handler's face and chains sit up top; keep the hound's head too (lower right), so the hound fight card still shows it.
  handler: [0, 0.88],
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
  // Jodi's face, the python, both vultures and her torso sit in the top 60%; the jar, skull and rats are below.
  jodi: [0.02, 0.62],
  // Kaelen's crate lead: the open crate with its tally marks sits lower left-center.
  hoard: [0.42, 1.0],
  // Maw arrivals, one per door: the walker and the ribs / bone road / cairn ridge.
  rim_gullet: [0.1, 0.85],
  rim_bonewash: [0.2, 0.95],
  // Maw places: the trail and the bone arches; the rib tunnel; the sealed amber between tusks; the wreck and the bench.
  maw_lip: [0.25, 0.95],
  maw_ribs: [0.2, 0.9],
  maw_hold: [0.1, 0.9],
  maw_wreck: [0.3, 0.95],
  last_fence: [0.2, 0.9],
  noon_country: [0.2, 0.9],
  hymn_road: [0.2, 0.9],
  cache_run: [0.2, 0.9],
  lash_holds: [0.2, 0.9],
  valued_thing: [0.2, 0.9],
  ch1_end: [0.2, 0.9],
  under_jaw: [0.2, 0.9],
  // The masked figure: hood, both eyeholes and the whole mask down to the beard stay in frame (hood at the top edge, chin near 0.88).
  masked_figure: [0.0, 0.88],
  // v164: the far-rise glimpse. The small hooded figure on the ridge and the crest under him (figure at 0.36-0.46 of the height, ridge to about 0.6).
  masked_far: [0.15, 0.62],
  // v165: Sybella's skiff on the Bone Wash: crane top near 0.09, the blindfold, the hull, and the runners near 0.72.
  south_wind: [0.08, 0.74],
  // The prisoner's face and both hands on the bar, the amber gap, and the wrench on the floor all sit between these two lines.
  holding_cells: [0.1, 0.92],
  rim_pilgrims_scar: [0.15, 0.9],
  // Court Guard: face, coat, and the curved blade.
  courtguard: [0.05, 0.85],
  // Approach Dry: the fallen figure and the empty glass, center-lower.
  down: [0.35, 0.95],
  // The newest amber figure in the light, the Seeker chalking below it.
  resin_vault: [0.2, 0.95],
  // The scavenger's face, the tubes, and the ledger-drum.
  extraction_rig: [0.1, 0.85],
  // The crouched cutter and the blade on the ledge.
  rim_cutter: [0.05, 0.65],
  // Club over the shoulder down to the boots.
  waste_scavenger: [0.0, 0.65],
  // The whole husk, head to feet, core in the chest.
  amber_husk: [0.05, 0.95],
  // Ears to paws.
  dust_jackal: [0.1, 0.65],
  // The breaching worm and its ringed maw, above the footprints.
  rib_worm: [0.1, 0.9],
  // Legs, glowing sac, and the rock it clings to.
  amber_tick: [0.05, 0.75],
  // Crystal spines to paws.
  shard_pup: [0.0, 0.65],
  // Pegs, the wrench cut-out, and the bench.
  stall_empty: [0.05, 0.65],
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

function npcCover(sceneId: string, state?: GameState): CoverKey | null {
  // v146: personAtScene drops Jaxson from Camp-04 once Chapter One is done.
  const p = personAtScene(sceneId, state)
  return p ? PERSON_COVER[p.id] : null
}

export function playCoverFile(key: CoverKey): string {
  // v147: never an empty src. v151: an unknown key gets the Blood Yard, not the old fence cover.
  return FILES[key] ?? FILES.yard
}

/** Neutral fight cover: the hub's land, or the door's road on the Cache Run and at the Maw. */
function fightGround(state: GameState, scene: Pick<Scene, 'id' | 'chapterId' | 'hubId'>): CoverKey {
  const hub = scene.chapterId === 'cache-run' || state.chapterId === 'cache-run' ? undefined : (scene.hubId ?? state.hubId)
  if (hub === 'camp04') return 'yard'
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
    if (kind === 'masked') return 'masked_figure'
    // The pup has no handler, so it gets the ground you are on (like jackals and ticks), not the handler portrait.
    if (kind === 'handler') return 'handler'
    // v142: the hound fight shows the Hound-handler portrait (his hound is in it), not the old hound art.
    if (kind === 'hound') return 'handler'
    if (kind === 'overseer') return 'valerius'
    if (kind === 'greg') return 'greg'
    // v168: Chapter Two fight art.
    if (id.startsWith('ch2:')) {
      if (kind === 'dragoon') return 'ch2_fight_dragoon'
      if (kind === 'drilllead') return 'ch2_fight_drill_lead'
      if (kind === 'seekerpatrol') return 'ch2_fight_patrol'
      if (kind === 'strayhunter' || kind === 'strayhound') return STRAY_HUNTER_COVER as CoverKey
    }
    if (kind === 'dragoon' || kind === 'seekerpatrol') return 'courtguard'
    if (kind === 'drilllead') return 'extraction_rig'
    if (kind === 'patrol') return 'rell'
    if (kind === 'courtguard') return 'courtguard'
    if (kind === 'collector') return SPINE_HUNTER.art
    if (kind === 'carapace') return CARAPACE_HUNTER.art
    if (kind === 'runner') return 'brin'
    if (kind === 'cutter') return 'rim_cutter'
    if (kind === 'scavenger') return 'waste_scavenger'
    if (kind === 'husk') return 'amber_husk'
    if (kind === 'jackal') return 'dust_jackal'
    if (kind === 'ribworm') return 'rib_worm'
    if (kind === 'tick') return 'amber_tick'
    if (kind === 'pup') return 'shard_pup'
    // No enemy art yet (husk, scavenger, cutter, jackal, tick, pup): the neutral ground cover, never a face from the scene.
    return fightGround(state, scene)
  }
  // The masked figure: his block screen, and any result line that is his.
  if (state.flags.maskedHere) return 'masked_figure'
  if (isMaskedFlash(state.flash)) return maskedCoverKey(state.flash)
  // Stray Hunter: its cover slot, neutral fight ground until the art lands.
  if (state.flags.strayHunterHere) return (STRAY_HUNTER_COVER as CoverKey | null) ?? fightGround(state, scene)
  if (isSybellaOverlay(state) || id.startsWith('maw:sybella')) return 'sybella'
  if (isCampHunt(state)) return campHuntIsValerius(state) ? 'valerius' : 'handler'
  if (id === 'camp:hunter' || id === 'camp:valerius' || id === 'camp:tower') return 'valerius'
  if (isSpineHunt(state)) return spineHunterFor(state).art
  // The Court Guard hunt shows the guard, not Thalia's portrait.
  if (isThreshHunt(state)) return 'courtguard'
  if (id === 'spine:valerius') return 'valerius'
  if (id === 'spine:hunter' || id === 'spine:hound') return 'handler'
  // Cup-Shadow is Kaelen's pack-shade, never Thalia's.
  if (id === 'thresh:sift') return 'kaelen'
  if (id === 'thresh:thalia' || id.startsWith('thresh:thalia')) return 'thalia'

  // v150: the empty stall has its own art, never the camp fence cover.
  if (id === 'camp:lean' && state.flags.chapter1Done) return 'stall_empty'
  // v151: no scene uses the fence cover (camp04.jpg) any more.
  if (state.flags.chapter1Done && id === 'camp:cages') return 'holding_cells'
  if (state.flags.chapter1Done && id.startsWith('camp:jaxson')) return 'stall_empty'
  if (state.flags.chapter1Done && id === 'crisis:camp') return 'down'
  if (state.door === 'prisoner' && (id === 'crisis:spine' || id === 'crisis:thresh')) return 'down'
  if (id === 'camp:gate') return 'guard'
  if (id === 'camp:forced') return 'storm'
  // v154: the Court is the hall, not Thalia's portrait. Her portrait stays on her scene and the Stairs, so the three no longer look like one screen.
  if (id === 'thresh:court') return 'threshold'
  const who = npcCover(id, state)
  if (who) return who

  // The hotwire art is the one-time lookout beat: station down, Jaxson under his skiff.
  if (id === 'camp:bay') return bayLookout(state) ? 'hotwire' : 'skiff_bay_docks'
  if (id === 'camp:bay-pike') return 'bay_pike'
  if (id === 'camp:relic') return 'hoard'
  // The first Prisoner scene: the cage bar, the amber gap, the wrench. (camp:cages is Jaxson's shop and keeps his portrait.)
  if (id === 'open:prisoner') return 'holding_cells'
  if (id === 'crisis:maw') return 'down'
  // The Cache Run collapse is a Down screen too.
  if (id === 'crisis:dunes') return 'down'
  // v147: the camp Sap-0 rescue after Chapter One has nobody in it: the Down art.
  if (id === 'crisis:camp-alone') return 'down'
  if (id === 'ch1:ossa-fix') return 'lash_holds'
  if (id === 'ch1:hollow') return 'valued_thing'
  if (id === 'ch1:end') return 'ch1_end'
  if (id === 'ch2:stub') return 'under_jaw'
  // v166: Chapter Two covers.
  const CH2_ART: Record<string, CoverKey> = {'ch2:gate': 'under_jaw', 'ch2:cache': 'hoard', 'ch2:trapped': 'down', 'ch2:heart': 'hunger', 'ch2:end': 'ch1_end', 'ch2:o-abyss': 'ch2_o_abyss', 'ch2:o-bounty': 'ch2_o_bounty', 'ch2:o-cage': 'ch2_o_cage', 'ch2:o-hounds': 'ch2_o_hounds', 'ch2:o-root': 'ch2_o_root', 'ch2:o-stakes': 'ch2_o_stakes', 'ch2:o-stilts': 'ch2_o_stilts', 'ch2:o-strays': 'ch2_o_strays', 'ch2:o-wash': 'ch2_o_wash', 'ch2:p-abyss': 'ch2_p_abyss', 'ch2:p-bays': 'ch2_p_bays', 'ch2:p-bilge': 'ch2_p_bilge', 'ch2:p-haul': 'ch2_p_haul', 'ch2:p-jaws': 'ch2_p_jaws', 'ch2:p-shaft': 'ch2_p_shaft', 'ch2:p-sift': 'ch2_p_sift', 'ch2:v-bleed': 'ch2_v_bleed', 'ch2:v-blown': 'ch2_v_blown', 'ch2:v-garden': 'ch2_v_garden', 'ch2:v-greg': 'ch2_v_greg', 'ch2:v-murch': 'ch2_v_murch', 'ch2:v-outpost': 'ch2_v_outpost', 'ch2:v-ribs': 'ch2_v_ribs', 'ch2:v-scar': 'ch2_v_scar', 'ch2:v-stair': 'ch2_v_stair', 'ch2:v-test': 'ch2_v_test', 'ch2:p-supply': 'ch2_p_bilge', 'ch2:p-drillrun': 'ch2_p_shaft', 'ch2:survivor': 'ch2_v_garden'}
  if (CH2_ART[id]) return CH2_ART[id]
  // The South Wind: the hull on the horizon, not yet her face. v165: the Outcast sees her skiff on the Bone Wash (it used to borrow the camp dock art).
  if (id === 'ch1:south-wind') return state.door === 'outcast' ? 'south_wind' : fightGround(state, scene)
  // The Vessel's Cache Run (the Pilgrim's Scar) shows the Scar, not the title art.
  if (state.door === 'vessel' && (id === 'ch1:leave' || id === 'ch1:v-hymn')) return 'rim_pilgrims_scar'
  // The Outcast's road start (Cache Run / the Bone Wash) gets the Bone Wash art, not the title art.
  if (id === 'ch1:leave' && state.door === 'outcast') return 'rim_bonewash'
  if (id === 'ch1:leave') return 'cache_run'
  if (id === 'ch1:v-hymn') return 'hymn_road'
  if (id === 'ch1:p-pipe') return 'last_fence'
  if (id === 'ch1:o-noon') return 'noon_country'
  if (id === 'open:vessel') return 'resin_vault'
  if (id === 'thresh:crucible-rig') return 'extraction_rig'
  if (id === 'thresh:stairs') return 'threshold'
  if (id === 'thresh:crucible-stairs') return 'thalia'
  if (id === 'thresh:court-guard') return 'courtguard'
  // The Maw arrival shows the road each door came in by.
  if (id === 'maw:rim' || id === 'ch1:land') {
    if (state.door === 'outcast') return 'rim_bonewash'
    if (state.door === 'vessel') return 'rim_pilgrims_scar'
    return 'rim_gullet'
  }
  if (id === 'maw:lip') return 'maw_lip'
  if (id === 'maw:ribs') return 'maw_ribs'
  if (id === 'maw:hold') return 'maw_hold'
  if (id === 'maw:tuner') return 'maw_wreck'
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
  if (state.hubId === 'camp04' || id.startsWith('camp:') || id.startsWith('open:prisoner')) return 'yard'
  if (state.hubId === 'spine' || id.startsWith('spine:') || id.startsWith('open:outcast')) return 'spine'
  if (state.hubId === 'threshold' || id.startsWith('thresh:') || id.startsWith('open:vessel')) return 'threshold'
  if (state.door === 'prisoner') return 'yard'
  if (state.door === 'outcast') return 'spine'
  if (state.door === 'vessel') return 'threshold'
  return scene.art === 'world' ? 'world' : 'world'
}
