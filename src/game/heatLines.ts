import type { Faction, GameState } from './types'

/**
 * v244: Heat lines tell the truth (Jeramie). A printed "Cartel Heat +2." only shows what the meter really rose.
 * Already at 8: the Heat sentence is dropped. Partly capped (7 -> 8 on a +2): it reads +1. Never any new words.
 */
const NAME: Record<string, Faction> = { Cartel: 'cartel', Seeker: 'seekers', Seekers: 'seekers', Stray: 'strays', Strays: 'strays' }
const LINE = /(Cartel|Seekers?|Strays?) Heat ([+\-−])(\d+)\./g
const FACTIONS: Faction[] = ['cartel', 'seekers', 'strays']

/** The text's printed Heat lines, rewritten so each faction's gains add up to no more than `rose` (the real net change). */
export function honestHeatText(text: string, rose: Partial<Record<Faction, number>>): string {
  // Printed falls (Seeker Heat -1.) stay as they are; they count against the real net change.
  const fell: Record<Faction, number> = { cartel: 0, seekers: 0, strays: 0 }
  const gained: Record<Faction, number> = { cartel: 0, seekers: 0, strays: 0 }
  for (const m of text.matchAll(LINE)) {
    const f = NAME[m[1]]
    if (m[2] === '+') gained[f] += Number(m[3])
    else fell[f] += Number(m[3])
  }
  const left: Record<Faction, number> = { cartel: 0, seekers: 0, strays: 0 }
  let changed = false
  for (const f of FACTIONS) {
    left[f] = Math.max(0, (rose[f] ?? 0) + fell[f])
    if (gained[f] > left[f]) changed = true
  }
  if (!changed) return text
  let dropped = false
  const out = text.replace(/([ \t]*)((Cartel|Seekers?|Strays?) Heat \+(\d+)\.)/g, (_all, lead: string, _line: string, name: string, n: string) => {
    const f = NAME[name]
    const show = Math.min(Number(n), left[f])
    left[f] -= show
    if (show > 0) return `${lead}${name} Heat +${show}.`
    dropped = true
    return ''
  })
  if (!dropped) return out
  // A Heat line that stood alone leaves no empty paragraph behind.
  return out
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}

/** Text fields a state can carry that print Heat: the flash, the fight result card, and the Down note. */
const FLAG_TEXT = ['encounterClash', 'encounterFlash', 'downedNote'] as const

/** Rewrites the Heat lines this step added, against the meters' real change from `before` to `after`. */
export function honestHeat(before: GameState, after: GameState): GameState {
  if (after === before) return after
  const rose: Partial<Record<Faction, number>> = {}
  for (const f of FACTIONS) rose[f] = Math.min(8, after.heat?.[f] ?? 0) - Math.min(8, before.heat?.[f] ?? 0)
  let next = after
  const t = freshText(before.flash, after.flash, rose)
  if (t !== undefined) next = { ...next, flash: t }
  let flags = next.flags
  for (const k of FLAG_TEXT) {
    const v = freshText(before.flags?.[k], after.flags?.[k], rose)
    if (v !== undefined) flags = { ...flags, [k]: v }
  }
  if (flags !== next.flags) next = { ...next, flags }
  return next
}

/** Only the words this step added: text carried over from an earlier step (an unchanged or extended card) keeps its lines. */
function freshText(was: unknown, now: unknown, rose: Partial<Record<Faction, number>>): string | undefined {
  if (typeof now !== 'string' || !now || now === was) return undefined
  const keep = typeof was === 'string' && was && now.startsWith(was) ? was : ''
  const rest = now.slice(keep.length)
  const lead = rest.match(/^\s*/)?.[0] ?? ''
  const body = rest.slice(lead.length)
  const t = honestHeatText(body, rose)
  if (t === body) return undefined
  return t ? keep + lead + t : keep
}

/**
 * v251: a button sub-line does not promise Heat a meter can no longer take (Jeramie). At 8, a "Cartel Heat +1."
 * sentence is dropped from the sub; the rest stays word for word. A sub that was only Heat lines is dropped.
 * Only whole sentences go: a Heat line inside a sentence ("sees you: Seeker Heat +1.") is left as it is.
 */
const SUB_LINE = /(^|(?<=[.!?]['"”’)]?)[ \t]+|\n)((Cartel|Seekers?|Strays?) Heat \+\d+\.)(?=\s|$)/g

export function capHeatSub(sub: string | undefined, heat: Partial<Record<Faction, number>> | undefined): string | undefined {
  if (!sub || !heat) return sub
  if (!FACTIONS.some((f) => (heat[f] ?? 0) >= 8)) return sub
  let changed = false
  const out = sub.replace(SUB_LINE, (all, lead: string, _line: string, name: string) => {
    if ((heat[NAME[name]] ?? 0) < 8) return all
    changed = true
    return lead === '\n' ? '\n' : ''
  })
  if (!changed) return sub
  const clean = out
    .split('\n')
    .map((l) => l.replace(/^[ \t]+|[ \t]+$/g, ''))
    .filter((l, i, a) => l || (i > 0 && i < a.length - 1 && a[i - 1] && a[i + 1]))
    .join('\n')
    .trim()
  return clean || undefined
}
