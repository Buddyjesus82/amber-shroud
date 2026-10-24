export type DoorId = 'prisoner' | 'outcast' | 'vessel'
export type Faction = 'cartel' | 'seekers' | 'strays'
export type SceneKind = 'story' | 'place' | 'talk' | 'crisis' | 'ending'
export type ItemId =
  | 'vial_empty'
  | 'vial_drop'
  | 'scrap'
  | 'glints'
  | 'scrip'
  | 'wrench'
  | 'rusted_dagger'
  | 'silas_tip'
  | 'oram_map'
  | 'crucible_map'
  | 'shiv'
  | 'strider_bit'
  | 'ceremonial_cloth'
  | 'overseer_chip'
  | 'ossa_token'
  | 'knotted_wrap'
  | 'kallik_mark'
  | 'kohl_smear'
  | 'false_vessel'
  | 'cache_map'
  | 'ironwood_baton'
  | 'needle_knife'
  | 'dust_cloak'
  | 'hide_wrap'
  | 'scav_wrap'
  | 'salve'
  | 'head_wrap'
  | 'shin_wraps'
  | 'hide_gloves'
  | 'scrap_buckler'
  | 'sinew_cord'
  | 'scav_pack'
  | 'hauler_pack'
  | 'seeker_extractor'
  | 'maw_plate'
  | 'plated_buckler'
  | 'plated_scav_wrap'
  | 'plated_dust_cloak'
  | 'plated_head_wrap'
  | 'plated_shin_wraps'

export type ItemKind = 'gear' | 'currency' | 'key' | 'weapon' | 'armor' | 'garment'
/**
 * 'weapon' is the Main hand and 'armor' is the Body slot; the ids stay so old saves load unchanged.
 * Labels live in kit.ts (SLOT_LABEL).
 */
export type EquipSlot = 'head' | 'armor' | 'legs' | 'hands' | 'cloak' | 'garment' | 'weapon' | 'offhand'

export type Heat = {
  cartel: number
  seekers: number
  strays: number
}

export type FlagMap = Record<string, boolean | string | number>

export type GameState = {
  version: 1
  door: DoorId
  epithet: string
  sap: number
  sapMax: number
  /** Fight hits. Empty is a stagger, not a death. */
  health: number
  healthMax: number
  heat: Heat
  items: Partial<Record<ItemId, number>>
  flags: FlagMap
  sceneId: string
  hubId: string | null
  chapterId: string | null
  ticks: number
  pressure: number
  flash?: string
  startedAt: number
  updatedAt: number
  equipped: Partial<Record<EquipSlot, ItemId>>
  recentVerbs?: string[]
  /** v148: get-ups left this attempt (missing = full). */
  hands?: number
  /** v148: the state at the start of the current chapter. Run over restores it. */
  checkpoint?: GameState
}

export type Cond = {
  all?: Cond[]
  any?: Cond[]
  not?: Cond
  flag?: string
  flagEq?: [string, boolean | string | number]
  flagUnset?: string
  item?: ItemId
  itemMin?: [ItemId, number]
  sapMin?: number
  sapMax?: number
  healthMin?: number
  heatMin?: [Faction, number]
  heatMax?: [Faction, number]
  door?: DoorId
  pressureMin?: number
  ticksMin?: number
  equipped?: ItemId
  slot?: EquipSlot
}

export type Effect = {
  /** v148: run over. Back to the chapter checkpoint. */
  restoreCheckpoint?: boolean
  /** Self-care in place (drink, bind). Time passes, but no road fight or hunt rolls. */
  still?: boolean
  /** A sneak that can fail: on a spotted roll (odds in 10) a real fight opens on the ground you reach. */
  sneak?: { odds: number; kind: string; spotted: string }
  /** A Vessel lie or the cloth at the Threshold: at Seeker Heat 6+ it can be seen through (Heat +1, or a Court Guard fight at 8+). */
  ruse?: boolean
  /** An ambush that opens on arrival and cannot be skipped (Run still can). Ignores Health. */
  ambush?: { kind: string; line: string }
  /** v155: a 1-in-oneIn seeded chance of losing `health`. The loss shows on its own line. */
  risk?: { oneIn: number; health: number }
  sap?: number
  health?: number
  heat?: Partial<Heat>
  add?: Partial<Record<ItemId, number>>
  remove?: Partial<Record<ItemId, number>>
  /** Dual-currency OR: spend Glint if you can, else scrap. */
  pay?: { glints?: number; scrap?: number }
  /** Extra remove only when `pay` actually spends Glints. */
  payGlintRemove?: Partial<Record<ItemId, number>>
  flag?: FlagMap
  unsetFlag?: string[]
  goto?: string
  /** Map-gated walk. Uses travelGate / travelTo — never a silent hop. */
  travel?: string
  startChapter?: string
  enterHub?: string
  /** The road between a home camp and the Red Maw (after Chapter One). The masked figure never meets you on it. */
  homeRoad?: boolean
  /** v140: a walk on the hub map. The masked figure may glimpse you but never blocks the way. */
  mapWalk?: boolean
  pressure?: number
  ticks?: number
  flash?: string
  equip?: ItemId
  returnHunterFrom?: boolean
  returnCrisisFrom?: boolean
  /** Optional roam fight. Strike + 0-2 swing vs Shell, min 1 damage. */
  resolveEncounter?: 'fight' | 'skip' | 'guard' | 'feint' | 'trick' | 'run' | 'pull' | 'deal' | 'disguise' | 'core' | 'seeker' | 'resin'
  /** v160: Varro plates this piece with a Maw Plate (see kit.ts PLATING). Worn stays worn. */
  plate?: ItemId
  /** Bag full: take held finds back up to the free room. */
  bagRetry?: boolean
  /** Bag full: leave the held finds behind. */
  bagLeave?: boolean
}

export type Choice = {
  id: string
  label: string
  sub?: string
  tone?: 'default' | 'hunger' | 'danger' | 'quiet'
  group?: 'buy' | 'sell' | 'talk' | 'intel' | 'side'
  show?: Cond
  enable?: Cond
  locked?: string
  effects: Effect
}

export type IntentRule = {
  tags: string[]
  show?: Cond
  effects: Effect
  reply: string
}

export type BodyVariant = {
  if: Cond
  body: string
  mode?: 'replace' | 'append'
}

export type Scene = {
  id: string
  hubId?: string
  chapterId?: string
  kind: SceneKind
  title?: string
  speaker?: string
  art?: 'world' | 'hunger'
  body: string
  variants?: BodyVariant[]
  choices: Choice[]
  intents?: IntentRule[]
  intentFallback?: { reply: string; effects?: Effect }
  onEnter?: Effect
}

export type PlaceLink = {
  id: string
  name: string
  sceneId: string
  show?: Cond
}

export type HubDef = {
  id: string
  name: string
  region: string
  blurb: string
  defaultScene: string
  places: PlaceLink[]
  hungerHook?: {
    label: string
    sub: string
    sceneId: string
    show?: Cond
  }
  mawLegs: number
  mawNote: string
}

export type HubMapNode = {
  id: string
  name: string
  short?: string
  sceneId: string
  x: number
  y: number
  mawExit?: boolean
  /** Force the Map label above or below the marker (otherwise picked to avoid collisions). */
  labelSide?: 'above' | 'below'
}

export type HubMapEdge = {
  a: string
  b: string
  sap?: number
}

export type HubMapDef = {
  hubId: string
  ready: boolean
  blurb: string
  coming?: string
  width: number
  height: number
  defaultNode: string
  maw: { x: number; y: number; label: string }
  nodes: HubMapNode[]
  edges: HubMapEdge[]
  sceneNode: Record<string, string>
}

export type DoorDef = {
  id: DoorId
  title: string
  role: string
  place: string
  epithet: string
  blurb: string
  sap: number
  heat: Heat
  items: Partial<Record<ItemId, number>>
  flags: FlagMap
  sceneId: string
  hubId: string
}

export type ItemDef = {
  id: ItemId
  name: string
  kind: ItemKind
  desc: string
  slot?: EquipSlot
  /** Weapon compare-number. Shown as Strike. Never added to a roll. */
  strike?: number
  /** Armor compare-number. Shown as Shell. Never added to a roll. Garment does not stack into this. */
  shell?: number
  /** Can also go in the Off hand: a short blade, a club, or a shield (shield goes only there). */
  offhand?: 'blade' | 'club' | 'shield'
  /** Bag capacity when this is the best bag you own. */
  bag?: number
  /** One-line perk, shown in Gear. */
  perk?: string
}
