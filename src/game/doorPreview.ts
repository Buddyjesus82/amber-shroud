import { DOORS } from './content/catalog'
import { getScene } from './content/index'
import { kitLine } from './kit'
import { loadDoor } from './save'
import type { DoorId } from './types'

export type DoorPreview = {
  place: string
  sap: number
  heat: { cartel: number; seekers: number; strays: number }
  gear: string
  /** True when the line was read from this door's save, not the starting card. */
  live: boolean
}

/** Location and Sap (and the rest of the card) come from the save when one exists. */
export function doorPreview(id: DoorId): DoorPreview {
  const door = DOORS[id]
  const save = loadDoor(id)
  if (!save) {
    return { place: door.place, sap: door.sap, heat: { ...door.heat }, gear: kitLine(door.items), live: false }
  }
  const scene = getScene(save.sceneId, save.door)
  const place = scene.id === 'missing' || !scene.title ? door.place : scene.title
  return { place, sap: save.sap, heat: { ...save.heat }, gear: kitLine(save.items), live: true }
}
