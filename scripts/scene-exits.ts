/**
 * Cheap scene→exits map + choice-only reachability.
 * Hub place-chips are NOT required: a door fails if buttons (and the Hunger hook /
 * closing prompt) cannot reach Red Maw / chapter1Done.
 *
 *   npm run exits
 */
import {
  applyEffect,
  isChoiceOn,
  newGame,
  visibleChoices,
} from '../src/game/engine.ts'
import { ALL_SCENES, getScene } from '../src/game/content/index.ts'
import { HUBS } from '../src/game/content/catalog.ts'
import type { DoorId, GameState } from '../src/game/types.ts'

const END = new Set(['ch1:land', 'maw:rim'])

function destOf(goto: string | undefined, travel?: string) {
  if (travel) return `travel:${travel}`
  return goto ?? '(stay)'
}

function printMap() {
  console.log('=== scene → exits ===')
  for (const scene of ALL_SCENES) {
    const bits = scene.choices.map((c) => {
      const extra = [
        c.effects.startChapter ? `ch:${c.effects.startChapter}` : '',
        c.effects.enterHub ? `hub:${c.effects.enterHub}` : '',
        c.effects.flag && 'chapter1Done' in c.effects.flag ? 'done' : '',
      ]
        .filter(Boolean)
        .join(',')
      return `${c.id}→${destOf(c.effects.goto, c.effects.travel)}${extra ? `[${extra}]` : ''}`
    })
    console.log(`${scene.id}: ${bits.join(' | ') || '(no choices)'}`)
  }
}

function missingTargets(): string[] {
  const ids = new Set(ALL_SCENES.map((s) => s.id))
  const bad: string[] = []
  for (const scene of ALL_SCENES) {
    for (const c of scene.choices) {
      const g = c.effects.goto ?? c.effects.travel
      if (g && !ids.has(g) && getScene(g).id === 'missing') bad.push(`${scene.id}:${c.id}→${g}`)
    }
    for (const i of scene.intents ?? []) {
      const g = i.effects.goto
      if (g && !ids.has(g) && getScene(g).id === 'missing') bad.push(`${scene.id}:intent→${g}`)
    }
  }
  return bad
}

function cacheRunOpenExits(): string[] {
  const doors: DoorId[] = ['prisoner', 'outcast', 'vessel']
  const bad: string[] = []
  for (const scene of ALL_SCENES.filter((s) => s.chapterId === 'cache-run' || s.id.startsWith('ch1:'))) {
    const open = scene.choices.filter((c) => !c.show && !c.enable)
    const forward = open.filter((c) => {
      const g = c.effects.goto
      return g && g !== scene.id
    })
    const doorForward = new Set<DoorId>()
    for (const c of scene.choices) {
      const d = c.show?.door
      if (d && !c.enable && c.effects.goto && c.effects.goto !== scene.id) doorForward.add(d)
    }
    const allDoorsCovered = doors.every((d) => doorForward.has(d))
    if (forward.length === 0 && scene.id !== 'ch1:land' && !allDoorsCovered) {
      bad.push(
        open.length === 0
          ? `${scene.id} has no unconditional choice and does not cover every door`
          : `${scene.id} unconditional choices only stay/self`,
      )
    }
    for (const c of scene.choices) {
      const g = c.effects.goto ?? ''
      if (g.startsWith('spine:') || g.startsWith('camp:') || g.startsWith('thresh:')) {
        bad.push(`${scene.id}:${c.id} bounces out of Cache Run to ${g}`)
      }
    }
    for (const i of scene.intents ?? []) {
      const g = i.effects.goto ?? ''
      if (g.startsWith('spine:') || g.startsWith('camp:') || g.startsWith('thresh:')) {
        bad.push(`${scene.id}:intent bounces out of Cache Run to ${g}`)
      }
    }
  }
  return bad
}

function ended(s: GameState) {
  return !!s.flags.chapter1Done || s.hubId === 'redmaw' || END.has(s.sceneId)
}

function key(s: GameState) {
  const flags = Object.keys(s.flags)
    .sort()
    .filter((k) => s.flags[k] !== false && s.flags[k] !== '' && s.flags[k] !== 0)
    .map((k) => `${k}=${String(s.flags[k])}`)
    .join(',')
  const items = Object.keys(s.items)
    .sort()
    .filter((k) => (s.items[k as keyof typeof s.items] ?? 0) > 0)
    .map((k) => `${k}=${s.items[k as keyof typeof s.items]}`)
    .join(',')
  return [s.sceneId, s.chapterId ?? '', s.hubId ?? '', s.sap, flags, items].join('|')
}

function thumbActions(s: GameState): { name: string; next: GameState }[] {
  const out: { name: string; next: GameState }[] = []
  for (const c of visibleChoices(s)) {
    if (!isChoiceOn(s, c.enable)) continue
    out.push({ name: c.id, next: applyEffect(s, c.effects) })
  }
  const scene = getScene(s.sceneId)
  const hub = s.hubId ? HUBS[s.hubId] : null
  const showNav = !!hub && scene.kind !== 'crisis' && s.chapterId !== 'cache-run'
  if (showNav && hub?.hungerHook && isChoiceOn(s, hub.hungerHook.show)) {
    out.push({
      name: 'hunger-hook',
      next: applyEffect(s, {
        goto: hub.hungerHook.sceneId,
        startChapter: s.flags.chapter1Done ? undefined : 'cache-run',
        ticks: 1,
      }),
    })
  }
  if (showNav && !s.flags.chapter1Done && s.pressure >= 10 && !s.chapterId) {
    out.push({
      name: 'closing',
      next: applyEffect(s, {
        startChapter: 'cache-run',
        goto: 'ch1:leave',
        ticks: 1,
        flag: s.flags.hungerKnown ? undefined : { cacheBlind: true },
      }),
    })
  }
  return out
}

function reachEnd(door: DoorId, limit = 2500): { ok: boolean; visited: number; path?: string[] } {
  const start = newGame(door)
  type Node = { s: GameState; path: string[] }
  const q: Node[] = [{ s: start, path: [start.sceneId] }]
  const seen = new Set<string>()
  let visited = 0

  while (q.length && visited < limit) {
    const { s, path } = q.shift()!
    const k = key(s)
    if (seen.has(k)) continue
    seen.add(k)
    visited++
    if (ended(s)) return { ok: true, visited, path }

    const acts = thumbActions(s)
    const scored = acts.map((a) => {
      let score = 0
      if (ended(a.next)) score += 50
      if (a.next.flags.chapter1Done) score += 40
      if (a.next.sceneId === 'ch1:land' || a.next.hubId === 'redmaw') score += 40
      if (a.next.chapterId === 'cache-run' && s.chapterId !== 'cache-run') score += 20
      if (String(a.next.sceneId).startsWith('ch1:') && !String(s.sceneId).startsWith('ch1:')) score += 15
      if (a.next.sceneId !== s.sceneId) score += 2
      return { a, score }
    })
    scored.sort((x, y) => y.score - x.score)
    for (const { a, score } of scored) {
      const nk = key(a.next)
      if (seen.has(nk)) continue
      const node = { s: a.next, path: [...path, `${a.name}→${a.next.sceneId}`] }
      if (score >= 15) q.unshift(node)
      else q.push(node)
    }
  }
  return { ok: false, visited }
}

printMap()

const missing = missingTargets()
const openBad = cacheRunOpenExits()
const doors: DoorId[] = ['prisoner', 'outcast', 'vessel']
const results = doors.map((d) => ({ door: d, ...reachEnd(d) }))

console.log('\n=== choice-only reachability (no hub place-chips) ===')
for (const r of results) {
  console.log(r.door, r.ok ? 'OK' : 'FAIL', 'visited', r.visited)
  if (r.path) console.log('  ', r.path.slice(-12).join(' · '))
}

const fails = [
  ...missing.map((m) => `missing target ${m}`),
  ...openBad,
  ...results.filter((r) => !r.ok).map((r) => `${r.door} cannot reach Red Maw / chapter1Done by choices alone`),
]

if (fails.length) {
  console.error('\nFAIL')
  for (const f of fails) console.error(' -', f)
  process.exit(1)
}

console.log('\nOK all three doors have a finite choice-path to chapter end.')
