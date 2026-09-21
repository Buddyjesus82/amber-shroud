import type { Choice, GameState } from './types'

export function isWireSide(sceneId: string): boolean {
  return sceneId === 'camp:wire' || sceneId.startsWith('camp:kaelen')
}

export function isMawGround(sceneId: string): boolean {
  return sceneId.startsWith('maw:') || sceneId === 'ch2:stub'
}

export function isSybellaOverlay(state: Pick<GameState, 'flags' | 'sceneId' | 'hubId'>): boolean {
  return (
    !state.flags.encounterHere &&
    !!state.flags.hunterHere &&
    (state.hubId === 'redmaw' || isMawGround(state.sceneId)) &&
    state.sceneId !== 'maw:sybella' &&
    state.sceneId !== 'maw:sybella-shadow'
  )
}

export const WIRE_HUNTER_APPEND = `Whistles reach the Wire. Valerius brought a Yard sweep with him — boots, baton, a Hound that is not for dogs. The place line is still the Wire. You are not in the Yard unless you run the scrape-line.`

export function wireHunterChoices(): Choice[] {
  return [
    {
      id: 'hunter-hold',
      label: 'Hold the Wire. Do not run the Yard.',
      tone: 'quiet',
      effects: {
        returnHunterFrom: true,
        unsetFlag: ['hunterHere', 'hunterFrom'],
        ticks: 1,
        flash: 'The sweep passes the fence. You are still on the Wire. Kaelen is still a pack, not a vat-line.',
      },
    },
    {
      id: 'hunter-line',
      label: 'Dive back into the scrape-line',
      effects: {
        sap: -1,
        ticks: 1,
        heat: { cartel: 1 },
        unsetFlag: ['hunterHere', 'hunterFrom'],
        goto: 'camp:yard',
        flash:
          'You become a back among backs. That choice is the Yard. The Hound passes. Valerius writes something that is not your death. Yet.',
      },
    },
    {
      id: 'hunter-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay where you are.',
      show: { slot: 'armor' },
      effects: {
        returnHunterFrom: true,
        unsetFlag: ['hunterHere', 'hunterFrom'],
        ticks: 1,
        flash: 'Dust-cloth or hide — the glance slides. You never left this ground.',
      },
    },
    {
      id: 'hunter-ride',
      label: "Run for Oil-Tooth's hotwired Strider",
      show: { flag: 'striderHot' },
      tone: 'hunger',
      effects: {
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat: { cartel: 2 },
        flag: { hungerKnown: true },
        unsetFlag: ['hunterHere', 'hunterFrom'],
      },
    },
    {
      id: 'hunter-run',
      label: 'Break for the dunes — Hunger, now',
      show: { flag: 'hungerKnown' },
      tone: 'hunger',
      effects: {
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat: { cartel: 2 },
        pressure: 2,
        unsetFlag: ['hunterHere', 'hunterFrom'],
      },
    },
    {
      id: 'hunter-blind',
      label: 'Run anyway. Heading or not.',
      show: { flagUnset: 'hungerKnown' },
      tone: 'danger',
      effects: {
        flag: { hungerKnown: true, cacheBlind: true },
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        heat: { cartel: 2 },
        unsetFlag: ['hunterHere', 'hunterFrom'],
      },
    },
  ]
}

export const SYBELLA_SHADOW_APPEND = `The skiff-shadow slides over this ground without moving you. Sybella's voice, almost kind:

"Tick. Tick. The Maw does not wait on hub-roaming. Drink or be drunk."

You are still here. She is not a teleport. Face her smoke only if you walk it.`

export function sybellaShadowChoices(): Choice[] {
  return [
    {
      id: 'sybella-hold',
      label: 'Stay. Let the shadow pass.',
      tone: 'quiet',
      effects: {
        returnHunterFrom: true,
        unsetFlag: ['hunterHere', 'hunterFrom'],
        ticks: 1,
        flash: 'The shadow lifts. You did not walk. She still knows the hour.',
      },
    },
    {
      id: 'sybella-smoke',
      label: 'Go to her smoke and face it',
      effects: {
        goto: 'maw:sybella',
        ticks: 1,
        unsetFlag: ['hunterHere', 'hunterFrom'],
        flash: 'You spend the walk. The stall, the lip, the rim — whichever you left — waits without you.',
      },
    },
    {
      id: 'sybella-cloak',
      label: 'Let the cloak eat the glance',
      sub: 'Armor on. Stay where you are.',
      show: { slot: 'armor' },
      effects: {
        returnHunterFrom: true,
        unsetFlag: ['hunterHere', 'hunterFrom'],
        ticks: 1,
        flash: 'Dust-cloth or hide. The skiff-shadow slides. You never left this ground.',
      },
    },
  ]
}
