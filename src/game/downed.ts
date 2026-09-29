import type { Effect, GameState } from './types'

function nearOssa(state: GameState): boolean {
  const id = state.sceneId
  return !!state.flags.ossaAlly && (state.hubId === 'redmaw' || id.includes('ossa') || id.startsWith('maw:stilt'))
}

function nearOil(state: GameState): boolean {
  const id = state.sceneId
  const friend = !!state.flags.jaxsonInside || !!state.flags.oilRoad || !!state.flags.oilMended
  return friend && (id.startsWith('maw:tuner') || id.startsWith('camp:bay') || id.startsWith('camp:lean') || id === 'ch1:p-oil')
}

export function downedNote(state: GameState): string {
  if (nearOssa(state)) {
    return `You collapse. Too hurt to fight. Ossa's stilts plant beside your head and she hauls you up. It costs — a Drop if you have one, sap if you don't. "Get somewhere that is not the ground."`
  }
  if (nearOil(state)) {
    return `You collapse. Too hurt to fight. Oil-Tooth swears through the brass and drags you under cover. The pull costs scrap or sap. He is not gentle. You are not dead.`
  }
  const kind = state.flags.encounterKind
  const camp =
    state.hubId === 'camp04' || state.sceneId.startsWith('camp:')
  if (camp && (state.flags.hunterHere || kind === 'handler' || kind === 'patrol' || kind === 'pup' || kind === 'overseer')) {
    return `You collapse. Too hurt to fight. The handler's leash, or a clerk's baton, finds you. Cartel hands drag you. You will wake raw, and hotter on their ledger.`
  }
  if (kind === 'overseer' || state.sceneId.includes('valerius')) {
    return `You collapse at Valerius's feet. Too hurt to fight. He does not waste the baton twice. "Useful men scrape. Dead men do not."`
  }
  if (state.hubId === 'redmaw' || state.flags.sybellaHunting) {
    return `You collapse in the grit. Too hurt to fight. The skiff-shadow does not finish you. Something hauls you into rib-shade. You will wake poorer, and she still knows the spot.`
  }
  return `You collapse. Too hurt to fight. The ground keeps you a minute, then lets you up poorer in blood and sap.`
}

export function wakeEffect(state: GameState): Effect {
  if (nearOssa(state)) {
    const payDrop = (state.items.vial_drop ?? 0) > 0
    return {
      health: 2,
      sap: payDrop ? undefined : -1,
      remove: payDrop ? { vial_drop: 1 } : undefined,
      add: payDrop ? { vial_empty: 1 } : undefined,
      unsetFlag: ['downed', 'downedNote'],
      flag: { ossaPulled: true },
      flash: payDrop
        ? 'Ossa takes the Drop and pours a little back into you. Health returns. The vial is empty.'
        : 'Ossa spends a minute and a finger of your sap. Health returns. She does not name the cost.',
    }
  }
  if (nearOil(state)) {
    const scrap = (state.items.scrap ?? 0) > 0
    return {
      health: 2,
      sap: scrap ? undefined : -1,
      remove: scrap ? { scrap: 1 } : undefined,
      unsetFlag: ['downed', 'downedNote'],
      flag: { oilPulled: true },
      flash: scrap
        ? 'He takes a twist of scrap for the resin he wastes on you. Health returns. "Do not make a habit."'
        : 'He burns a minute and some of your sap getting you upright. Health returns.',
    }
  }
  const kind = state.flags.encounterKind
  const camp = state.hubId === 'camp04' || state.sceneId.startsWith('camp:')
  if (camp && (kind === 'handler' || kind === 'patrol' || kind === 'pup' || kind === 'overseer' || state.flags.hunterHere)) {
    return {
      health: 1,
      heat: { cartel: 2 },
      unsetFlag: ['downed', 'downedNote', 'hunterHere', 'hunterFrom'],
      goto: 'camp:yard',
      flash: 'You wake in the Yard. Feet raw. Cartel Heat climbed while you were down. Health is a thread. Too hurt to swing until it holds.',
    }
  }
  return {
    health: 1,
    sap: state.sap > 0 ? -1 : undefined,
    unsetFlag: ['downed', 'downedNote', 'hunterHere', 'hunterFrom'],
    flash: 'You get up. Health is a thread. The minute on the ground cost sap. Too hurt to fight until it holds.',
  }
}
