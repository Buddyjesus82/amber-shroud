export type DoorId = 'prisoner' | 'outcast' | 'vessel'
export type Faction = 'cartel' | 'seekers' | 'strays'
export type SceneKind = 'story' | 'place' | 'talk' | 'crisis' | 'ending'
export type ItemId =
  | 'vial_empty'
  | 'vial_drop'
  | 'scrap'
  | 'glints'
  | 'scrip'
  | 'shiv'
  | 'strider_bit'
  | 'ceremonial_cloth'
  | 'overseer_chip'
  | 'ossa_token'
  | 'kallik_mark'
  | 'kohl_smear'
  | 'false_vessel'
  | 'cache_map'

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
}

export type Effect = {
  sap?: number
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
}

export type Choice = {
  id: string
  label: string
  sub?: string
  tone?: 'default' | 'hunger' | 'danger' | 'quiet'
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
  kind: 'gear' | 'currency' | 'key'
  desc: string
}
