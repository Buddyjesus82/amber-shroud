import type { Choice, GameState } from './types'

const RUMOR_SCENES = new Set(['camp:kaelen-rumors', 'spine:kaelen-rumors', 'thresh:kaelen-rumors'])

export type RumorShelf = 'intel' | 'side'

export function isRumorCounter(sceneId: string): boolean {
  return RUMOR_SCENES.has(sceneId)
}

export function rumorShelfOf(state: GameState): RumorShelf | null {
  const v = state.flags.rumorShelf
  return v === 'intel' || v === 'side' ? v : null
}

function backShelf(): Choice {
  return {
    id: 'rumor-back',
    label: 'Back to the counter',
    tone: 'quiet',
    effects: { unsetFlag: ['rumorShelf'] },
  }
}

function tagRumor(c: Choice): Choice {
  if (c.group === 'intel' || c.group === 'side') return c
  if (c.id.startsWith('hunger')) return { ...c, group: 'intel' }
  if (c.tone === 'quiet' || c.tone === 'hunger') return c
  if (c.id === 'walk') return c
  return { ...c, group: 'side' }
}

/** Two shelves like Buy/Sell: Intel goes forward. Side trouble is area jobs. */
export function rumorChoices(state: GameState, authored: Choice[]): Choice[] {
  if (!isRumorCounter(state.sceneId)) return authored
  const tagged = authored.map(tagRumor)
  const shelf = rumorShelfOf(state)
  const root = tagged.filter((c) => c.group !== 'intel' && c.group !== 'side')
  if (shelf === 'intel') {
    const rows = tagged.filter((c) => c.group === 'intel')
    if (!rows.length) {
      rows.push({
        id: 'intel-empty',
        label: 'No Hunger lead on this shelf',
        sub: 'Glints buy intel. You already bought it, or the pack is waiting on coin.',
        group: 'intel',
        enable: { flag: '__no__' },
        locked: 'Pay a Glint, or you already hold the heading.',
        effects: {},
      })
    }
    rows.push(backShelf())
    return rows
  }
  if (shelf === 'side') {
    const rows = tagged.filter((c) => c.group === 'side')
    if (!rows.length) {
      rows.push({
        id: 'side-empty',
        label: 'No side trouble left to sell',
        sub: 'You bought the cheap headings, or the pack wants scrap.',
        group: 'side',
        enable: { flag: '__no__' },
        locked: 'Scrap buys smaller trouble.',
        effects: {},
      })
    }
    rows.push(backShelf())
    return rows
  }
  return [
    {
      id: 'rumor-intel',
      label: 'Intel',
      sub: 'Glints. The Hunger. A heading that goes forward.',
      group: 'intel',
      effects: {
        flag: { rumorShelf: 'intel' },
        flash: '"Glints buy intel. Kallik. Cache. The blonde on the skiff. Point."',
      },
    },
    {
      id: 'rumor-side',
      label: 'Side trouble',
      sub: 'Scrap. Area jobs. Relics, clocks, Hounds, runners. Not the Maw.',
      group: 'side',
      effects: {
        flag: { rumorShelf: 'side' },
        flash: '"Cheaper leads. Side trouble. I sold a heading. I do not sell a door."',
      },
    },
    ...root,
  ]
}

export function matchRumorText(state: GameState, text: string): { effects: import('./types').Effect; verb: string } | null {
  if (!isRumorCounter(state.sceneId)) return null
  const hay = text.toLowerCase()
  const shelf = rumorShelfOf(state)
  if (shelf && /\b(back|counter|pack|menu)\b/.test(hay)) {
    return { effects: { unsetFlag: ['rumorShelf'], flash: 'Back to the counter.' }, verb: 'back' }
  }
  if (/\b(intel|hunger|kallik|cache|heading|glint)\b/.test(hay) && shelf !== 'intel') {
    return {
      effects: { flag: { rumorShelf: 'intel' }, flash: '"Glints buy intel. Point."' },
      verb: 'intel',
    }
  }
  if (/\b(side|cheap|trouble|relic|hound|runner|bleed)\b/.test(hay) && shelf !== 'side') {
    return {
      effects: { flag: { rumorShelf: 'side' }, flash: '"Side trouble. Scrap. Point."' },
      verb: 'side',
    }
  }
  return null
}
