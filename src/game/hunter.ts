import type { Choice } from './types'

export function isWireSide(sceneId: string): boolean {
  return sceneId === 'camp:wire' || sceneId.startsWith('camp:kaelen') || sceneId === 'camp:relic'
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
