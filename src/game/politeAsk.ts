/**
 * Polite requests and plain questions, read for what the player meant.
 * "Can I have some scrap", "how much for a drop", "who are you", "where is Kaelen".
 * Requests never run theft or violence. A clear, free, same-meaning button may run;
 * otherwise the person on screen answers in character and points at the real buttons.
 */
import { ITEMS } from './content/catalog'
import { HUB_MAPS } from './content/maps'
import { PEOPLE, personAtScene, personKnown } from './people'
import { moneyLabel, offersFor, vendorFor } from './trade'
import type { Choice, GameState, Scene } from './types'
import { pickLine, PERSON_VOICE, VOICES, voiceKeyForSpeaker, type Voice } from './voices'

export type Ask =
  | { kind: 'who' | 'doing' | 'what-that' }
  | { kind: 'price'; obj: string }
  | { kind: 'request'; obj: string }
  | { kind: 'rewrite'; text: string }
  | { kind: 'refuse' }

export type LateAsk = { kind: 'where' | 'what'; obj: string }

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[?!.,]+/g, ' ')
    .replace(/\bplease\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const POLITE =
  /^(?:hey |so |um |uh )?(?:can i|could i|may i|might i|can you|could you|would you|will you|can we|could we|give me|gimme|hand me|ask (?:him |her |them )?for|i want|i'd like|i would like|i need|got any|have you got|do you have|you got|you have any|any chance of(?: getting)?)\s+(.+)$/
const VIOLENT = /\b(steal|rob|pickpocket|lift|snatch|pinch|swipe|filch|mug|fight|attack|kill|stab|hit|punch|strike|hurt|threaten|beat|choke|cut)\b/
/** Cores that are their own verb: let the normal parser read them. */
const ACTION = /^(?:buy|sell|trade|barter|ask|talk|speak|tell|hear|listen|rest|sit|wait|sleep|walk|go|head|leave|look|see|search|examine|help|show you|bind|bandage|heal|drink|use|pay|bribe|hide|follow|tie|craft|stitch|scavenge|skim|cover|hotwire|admit|owe|run|climb|pour|hold|sing|confess|join)\b/
const RECEIVE = /^(?:(?:have|get|borrow|take|grab|spare|lend|keep|try)(?: me| us)?|give(?: me| us)?|hand(?: me| us)?|pass(?: me| us)?|sell(?: me| us)?|show(?: me| us)?)\s+/
const FILLER = /^(?:some|a|an|the|any|more|of|your|that|this|those|these|few|bit of|little|piece of|twist of|one|two|spare|extra|me|us)\s+/

function stripFiller(t: string): string {
  let s = t.trim()
  for (let i = 0; i < 4; i++) s = s.replace(FILLER, '')
  return s.replace(/\s+(?:here|now|from you|off you|for me|too)$/, '').trim()
}

export function readAsk(text: string): Ask | null {
  const t = norm(text)
  if (!t) return null
  if (/^(?:who are you|who're you|who r u|who are u|and who are you|what(?:'s| is) your name|who is this|who might you be)$/.test(t)) return { kind: 'who' }
  if (/^(?:what are you doing|what're you doing|what you doing|whatcha doing|what are you up to|what(?:'s| is) going on|what are you working on)\b/.test(t)) return { kind: 'doing' }
  if (/^what(?:'s| is| are)\s+(?:that|this|those|these|it)$/.test(t) || t === "what's that" || t === 'whats that') return { kind: 'what-that' }
  const price = t.match(/^(?:how much(?: is| are| for| does| do)?|what(?:'s| is) the price(?: of| for)?|what does (.+) cost|what do (.+) cost)\s*(.*)$/)
  if (price) {
    const obj = stripFiller((price[1] ?? price[2] ?? price[3] ?? '').replace(/\s+(?:cost|costs|go for|run)$/, ''))
    return { kind: 'price', obj }
  }
  const m = t.match(POLITE)
  if (!m) return null
  let core = m[1].trim()
  if (/^(help|mercy|a minute|time|forgiveness|a favou?r)$/.test(core)) return null
  if (VIOLENT.test(core)) return { kind: 'refuse' }
  if (/^sell(?: me| us)\s+/.test(core)) return { kind: 'rewrite', text: core.replace(/^sell(?: me| us)\s+/, 'buy ') }
  if (RECEIVE.test(core)) core = core.replace(RECEIVE, '')
  else if (ACTION.test(core)) return { kind: 'rewrite', text: core }
  const obj = stripFiller(core)
  // "Ask for help" and friends are authored talk lines; let the scene answer them.
  if (!obj || /^(help|mercy|a minute|time|forgiveness|a favor|a favour)$/.test(obj)) return null
  return { kind: 'request', obj }
}

export function readLateAsk(text: string): LateAsk | null {
  const t = norm(text)
  const where = t.match(/^(?:where(?:'s| is| are| can i find| do i find| would i find| did .+ go)|have you seen|do you know where)\s+(.+?)(?:\s+is|\s+went)?$/)
  if (where) return { kind: 'where', obj: stripFiller(where[1]) }
  const what = t.match(/^what(?:'s| is| are)\s+(.+)$/)
  if (what) return { kind: 'what', obj: stripFiller(what[1]) }
  return null
}

// ── Who is on screen ──

export function speakerOnScreen(state: GameState, scene: Scene): string | null {
  if (scene.id === 'maw:tuner' && state.door === 'prisoner') return 'Jaxson'
  if (scene.speaker) return scene.speaker
  return personAtScene(scene.id)?.name ?? null
}

export function voiceOnScreen(state: GameState, scene: Scene): Voice | null {
  const name = speakerOnScreen(state, scene)
  const key = voiceKeyForSpeaker(name)
  if (key) return VOICES[key]
  const p = personAtScene(scene.id)
  if (p) return VOICES[PERSON_VOICE[p.id] ?? p.id] ?? null
  return null
}

// ── Items ──

const ITEM_WORDS: [RegExp, string, string[]][] = [
  [/\bscraps?\b/, 'scrap', ['scrap']],
  [/\b(drops?|water|sap|vials?|drink)\b/, 'drop', ['drop', 'vial']],
  [/\b(salves?|resin|healing|medicine|bandage)\b/, 'salve', ['salve', 'resin']],
  [/\b(knife|knives|blade|shiv|dagger|weapon|needle)\b/, 'knife', ['knife', 'blade', 'shiv', 'dagger', 'needle']],
  [/\b(cord|rope|lash)\b/, 'cord', ['cord']],
  [/\b(wire|copper)\b/, 'wire', ['wire']],
  [/\bwrench\b/, 'wrench', ['wrench']],
  [/\b(glints?|coins?|money)\b/, 'glint', ['glint']],
  [/\b(cloak|cloaks)\b/, 'cloak', ['cloak']],
  [/\b(wrap|rag|armor|armour)\b/, 'wrap', ['wrap', 'rag', 'armor']],
  [/\b(maps?|heading|directions|route)\b/, 'map', ['map', 'heading', 'route']],
  [/\b(shade)\b/, 'shade', ['shade']],
  [/\b(scrip)\b/, 'scrip', ['scrip']],
]

export function itemWord(obj: string): { key: string; words: string[] } | null {
  for (const [re, key, words] of ITEM_WORDS) if (re.test(obj)) return { key, words }
  return null
}

const UNSAFE_LABEL = /\b(steal|rob|lift|snatch|pinch|swipe|filch|mug|fight|attack|kill|stab|hit|threaten|grab|pocket|break|smash|run through|while he talks|while she talks|off his|off her|off the crate|turn out)\b/i

/** Theft or violence: never run from a polite ask. */
export function unsafeChoice(c: Choice): boolean {
  if (c.tone === 'danger') return true
  if (UNSAFE_LABEL.test(c.label)) return true
  if (/^take\b/i.test(c.label) && !/\b(offered|hand|gift)\b/i.test(`${c.label} ${c.sub ?? ''}`)) return true
  const fx = c.effects
  const flags = Object.keys(fx.flag ?? {})
  if (flags.some((f) => /took|stole|theft|rob/i.test(f))) return true
  if (fx.flag?.encounterHere) return true
  return false
}

/** Free: no payment, no Heat, no lost items. */
function freeChoice(c: Choice): boolean {
  const fx = c.effects
  if (fx.pay || fx.remove || (fx.sap ?? 0) < 0 || (fx.health ?? 0) < 0) return false
  if (fx.heat && Object.values(fx.heat).some((n) => (n ?? 0) > 0)) return false
  return true
}

function quoteList(labels: string[]): string {
  const q = labels.map((l) => `"${l}"`)
  if (q.length <= 1) return q.join('')
  return `${q.slice(0, -1).join(', ')} or ${q[q.length - 1]}`
}

const NOT_HINTS = /^(back|leave|step back|walk away|stay outside)\b/i

/** A short real pointer: the buttons that do something here. */
export function hintLine(choices: Choice[], on: (c: Choice) => boolean, words?: string[]): string {
  const live = choices.filter((c) => on(c) && !NOT_HINTS.test(c.label))
  // Locked buttons that match still get pointed at, with what they need.
  const anyHit = words?.length
    ? choices.filter((c) => !NOT_HINTS.test(c.label) && !unsafeChoice(c) && words.some((w) => `${c.label} ${c.sub ?? ''}`.toLowerCase().includes(w)))
    : []
  if (anyHit.length) {
    const rows = anyHit.slice(0, 2).map((c) => (on(c) ? `"${c.label}"` : `"${c.label}" (${(c.locked ?? 'locked').replace(/\.$/, '')})`))
    return `Try: ${rows.length > 1 ? `${rows[0]} or ${rows[1]}` : rows[0]}.`
  }
  const hit = words?.length ? live.filter((c) => words.some((w) => `${c.label} ${c.sub ?? ''}`.toLowerCase().includes(w))) : []
  const safeHit = hit.filter((c) => !unsafeChoice(c))
  const safe = live.filter((c) => !unsafeChoice(c))
  // A theft that matches is pointed at plainly, never run, never offered as the polite way.
  if (hit.length && !safeHit.length) {
    const rest = safe.slice(0, 1).map((c) => c.label)
    return `${rest.length ? `Try: ${quoteList(rest)}. ` : ''}Or skip asking: ${quoteList(hit.slice(0, 1).map((c) => c.label))}.`
  }
  const rows = (safeHit.length ? safeHit : safe).slice(0, 2).map((c) => c.label)
  if (!rows.length) return 'Try look, talk, or help.'
  return `Try: ${quoteList(rows)}.`
}

function shelfMatches(state: GameState, words: string[]): string[] {
  const v = vendorFor(state.sceneId)
  if (!v) return []
  return offersFor(state, v)
    .filter((o) => words.some((w) => `${o.item} ${ITEMS[o.item]?.name ?? ''}`.toLowerCase().includes(w)))
    .slice(0, 2)
    .map((o) => `${ITEMS[o.item]?.name ?? o.label} for ${moneyLabel(o.cost)}`)
}

export type AskAnswer = { flash: string; run?: Choice; verb: string }

/** Unnamed or filler spots: the ground answers, short, with a pointer. */
export function sceneVoice(scene: Scene, state: GameState): string {
  const place = scene.title ?? 'The dunes'
  const lines = [
    `Nobody in ${place} takes that up. The wind does, and drops it.`,
    `${place} does not answer. It has heard worse.`,
    `The words go out over ${place} and come back with nothing on them.`,
  ]
  return pickLine(lines, state)
}

export function answerAsk(state: GameState, scene: Scene, ask: Ask, choices: Choice[], on: (c: Choice) => boolean): AskAnswer | null {
  const v = voiceOnScreen(state, scene)
  if (ask.kind === 'rewrite') return null
  if (ask.kind === 'refuse') {
    return { flash: `${v ? v.refuse : sceneVoice(scene, state)} ${hintLine(choices, on)}`, verb: 'ask' }
  }
  if (ask.kind === 'who') {
    return { flash: v ? v.who : `Nobody here to give a name. ${scene.title ?? 'The dunes'} keeps its own.`, verb: 'who are you' }
  }
  if (ask.kind === 'doing') {
    return { flash: v ? v.doing : sceneVoice(scene, state), verb: 'ask' }
  }
  if (ask.kind === 'what-that') {
    return { flash: v ? v.what : sceneVoice(scene, state), verb: 'ask' }
  }
  if (!('obj' in ask)) return null
  const obj = ask.obj
  const item = itemWord(obj)
  const words: string[] = item?.words ?? obj.split(' ').filter((w: string) => w.length > 3)
  const shelf = shelfMatches(state, words)
  if (ask.kind === 'price') {
    const say = v ? (item && v.items?.[item.key]) || v.price : sceneVoice(scene, state)
    if (shelf.length) return { flash: `${say} Shelf: ${shelf.join('; ')}. Type "buy ${item?.key ?? obj}" or open Buy.`, verb: 'price' }
    return { flash: `${say} ${hintLine(choices, on, words)}`, verb: 'price' }
  }
  // request
  const matching = choices.filter((c) => words.some((w) => `${c.label} ${c.sub ?? ''}`.toLowerCase().includes(w)))
  const safe = matching.filter((c) => !unsafeChoice(c) && on(c))
  // Same action, free and clear: just do it.
  if (safe.length === 1 && freeChoice(safe[0]) && /^(ask|hear|listen|get|accept|take the offered|let )/i.test(safe[0].label)) {
    return { flash: '', run: safe[0], verb: 'ask' }
  }
  const say = v ? (item && v.items?.[item.key]) || v.want : sceneVoice(scene, state)
  if (shelf.length) return { flash: `${say} Shelf: ${shelf.join('; ')}. Type "buy ${item?.key ?? obj}" or open Buy.`, verb: 'ask' }
  return { flash: `${say} ${hintLine(choices, on, matching.length ? words : undefined)}`, verb: 'ask' }
}

function personByWords(obj: string) {
  return Object.values(PEOPLE).find((p) => p.aliases.some((a) => obj === a || obj.includes(a)) || obj.includes(p.name.toLowerCase()))
}

/** Hints for where known people tend to be: real, map-backed. */
function whereHint(pid: string, state: GameState): string {
  if (pid === 'kaelen') return 'He walks the roads with his pack. Linger and he stops.'
  const p = PEOPLE[pid as keyof typeof PEOPLE]
  if (!p) return ''
  for (const m of Object.values(HUB_MAPS)) {
    const node = m.nodes.find((n) => p.scenes.includes(n.sceneId))
    if (node) return m.hubId === state.hubId ? `${node.name} is on your Map.` : `${node.name}, ${HUB_NAME[m.hubId] ?? 'another road'}.`
  }
  return ''
}
const HUB_NAME: Record<string, string> = { camp04: 'Camp-04', spine: 'the Bleached Spine', threshold: 'the Threshold', redmaw: 'Red Maw' }

export function answerLate(state: GameState, scene: Scene, ask: LateAsk): AskAnswer | null {
  const v = voiceOnScreen(state, scene)
  if (ask.kind === 'where') {
    const p = personByWords(ask.obj)
    if (p) {
      const known = personKnown(state, p) || (p.id === 'kaelen' && !!state.flags.kaelenKnown)
      if (!known) return { flash: v ? v.unknown : `${sceneVoice(scene, state)} Nobody here knows that name.`, verb: 'where' }
      const said = v?.knows?.[p.id] ?? (v ? pickLine(v.lines, state) : sceneVoice(scene, state))
      const hint = whereHint(p.id, state)
      return { flash: `${said}${hint ? ` ${hint}` : ''}`, verb: 'where' }
    }
    const node = Object.values(HUB_MAPS)
      .flatMap((m) => m.nodes.map((n) => ({ m, n })))
      .find(({ n }) => ask.obj.length > 2 && n.name.toLowerCase().includes(ask.obj))
    if (node) {
      const lead = v ? pickLine(v.lines, state) : sceneVoice(scene, state)
      return { flash: `${lead} ${node.m.hubId === state.hubId ? `${node.n.name} is on your Map.` : `${node.n.name} is on another road: ${HUB_NAME[node.m.hubId] ?? 'not this one'}.`}`, verb: 'where' }
    }
    return null
  }
  const item = itemWord(ask.obj)
  if (item) {
    const def = Object.values(ITEMS).find((d) => item.words.some((w) => d.name.toLowerCase().includes(w)))
    if (def) return { flash: `${def.name}. ${def.desc}`, verb: 'look' }
  }
  return null
}

/** Sayings that work on this screen, for the Heard line. */
export function typedHints(state: GameState, scene: Scene, roam: boolean): string[] {
  const out: string[] = []
  const v = voiceOnScreen(state, scene)
  if (v) out.push('who are you', 'can I have …')
  if (vendorFor(state.sceneId)) out.push('how much …', 'buy …')
  if (roam) out.push('scavenge')
  out.push('look', 'help')
  return out.slice(0, 4)
}
