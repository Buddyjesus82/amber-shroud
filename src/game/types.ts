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
  | 'shiv'
  | 'strider_bit'
  | 'ceremonial_cloth'
  | 'overseer_chip'
  | 'ossa_token'
  | 'kallik_mark'
  | 'kohl_smear'
  | 'false_vessel'
  | 'cache_map'
  | 'ironwood_baton'
  | 'needle_knife'
  | 'dust_cloak'
  | 'hide_wrap'

export type ItemKind = 'gear' | 'currency' | 'key' | 'weapon' | 'armor'
export type EquipSlot = 'weapon' | 'armor'

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
  equipped: { weapon?: ItemId; armor?: ItemId }
  recentVerbs?: string[]
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
  heatMin?: [Faction, number]
  heatMax?: [Faction, number]
  door?: DoorId
  pressureMin?: number
  ticksMin?: number
  equipped?: ItemId
  slot?: EquipSlot
}

export type Effect = {
  sap?: number
  health?: number
  heat?: Partial<Heat>
  add?: Partial<Record<ItemId, number>>
  remove?: Partial<Record<ItemId, number>>
  flag?: FlagMap
  unsetFlag?: string[]
  goto?: string
  startChapter?: string
  enterHub?: string
  pressure?: number
  ticks?: number
  flash?: string
  equip?: ItemId
  returnHunterFrom?: boolean
  returnCrisisFrom?: boolean
  /** Optional roam fight. Bite/Hide compare — no dice. */
  resolveEncounter?: 'fight' | 'skip'
}

export type Choice = {
  id: string
  label: string
  sub?: string
  tone?: 'default' | 'hunger' | 'danger' | 'quiet'
  group?: 'buy' | 'sell' | 'talk'
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
  /** Weapon compare-number. Gear only — never added to a roll. */
  bite?: number
  /** Armor compare-number. Gear only — never added to a roll. */
  hide?: number
}
