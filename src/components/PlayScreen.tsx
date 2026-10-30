import { CRUCIBLE_SCENES, STAIRS } from '../game/content/crucible'
import { typedHints } from '../game/politeAsk'
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { HUBS } from '../game/content/catalog'
import {
  applyEffect,
  bodyOf,
  canScavenge,
  canSkim,
  drinkDrop,
  heatTone,
  healthLabel,
  interpret,
  isChoiceOn,
  persist,
  sapLabel,
  scavenge,
  sceneOf,
  skim,
  visibleChoices,
  CHAPTER_ONE_END,
} from '../game/engine'
import { heatFactions, heatRiseLine } from '../game/heat'
import { effectPills, listedKit } from '../game/kit'
import { isMawExit } from '../game/map'
import { roadChoice } from '../game/returnRoad'
import { encounterSpeaker, isEncounterResult } from '../game/encounter'
import { coverBand, playCoverFile, playCoverKey } from '../game/art'
import { HANDS_MAX, handsLeft, handsPips } from '../game/hands'
import { bayLookout } from '../game/campJob'
import { isPressureOverlay, pressureFace } from '../game/hunter'
import { isMaskedFlash, maskedCoverKey, maskedQuietScene } from '../game/masked'
import { DISGUISE_SOFTEN_NOTE } from '../game/disguise'
import { ROADS, shownText } from '../game/roads'
import { scavengeLock } from '../game/scavenge'
import { RUSH_CHANCE, RUSH_MOVES, RUSH_WINDOW_MS, STALL_BASE, STALL_MAX_S, STALL_MIN_S, STALL_STEP, STALL_TICK_S } from '../game/noticeHeat'
import { fightLocked, noticeOn, timingNotice } from '../game/engine'
import { isShopOpen } from '../game/trade'
import type { Choice, Faction, GameState } from '../game/types'
import { helpEntries } from '../game/help'
import { fightHelpAuto, fightTopicMidFight, helpRoute, helpTopic, markFightHelpSeen } from '../game/helpTopics'
import { HelpTopicCard } from './HelpTopicCard'
import { HeatExplainer, HeatTip } from './HeatGuide'
import { HelpCard } from './HelpCard'
import { InventorySheet } from './InventorySheet'
import { JournalSheet } from './JournalSheet'
import { MapSheet } from './MapSheet'

type OptionRow = {
  key: string
  tone: string
  label: string
  sub?: string
  group?: Choice['group']
  locked?: boolean
  lockedNote?: string
  pills?: { kind: string; text: string }[]
  onClick: () => void
}

type Props = {
  state: GameState
  onChange: (s: GameState) => void
  onTitle: () => void
  savedCue?: boolean
  saveToast?: string | null
}

type HeldScreen = {
  title: string
  meta: string | null
  face: string | null | undefined
  body: string
  art: string
  band: CSSProperties
  result: string
  /** v157: the screen it was made on had no Map (The Stairs, the Crucible): keep it hidden while held. */
  noNav?: boolean
  /** The state the result belongs to. Any other move (Map, Gear, typed) drops the hold. */
  stamp: string
}

/** Back on in v124, rebuilt phone-safe: the held screen keeps its own Continue (always rendered), Map and the Do box. */
const HOLD_RESULTS = true
/** The held screen's Continue: one fixed id, never shared with a scene choice. */
export const HELD_CONTINUE_KEY = 'held-continue'

/** v147: a cover that fails to load (flaky network, cache miss) falls back once to the Blood Yard cover, never a broken icon. */
const COVER_FALLBACK = `${import.meta.env.BASE_URL}covers/${playCoverFile('yard')}`
function coverFallback(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget
  if (img.dataset.fallback) {
    recoverCovers()
    return
  }
  img.dataset.fallback = '1'
  img.src = COVER_FALLBACK
}

/**
 * v173: the fallback cover failed too, so images are not getting through at all (a stuck service worker or cache).
 * Once per session: drop the worker and its caches, then reload from the network. Saves are in localStorage, untouched.
 */
function recoverCovers() {
  try {
    if (sessionStorage.getItem('amber-shroud.coverRecover')) return
    sessionStorage.setItem('amber-shroud.coverRecover', '1')
  } catch {
    return
  }
  const sw = navigator.serviceWorker
  const drop = sw ? sw.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))) : Promise.resolve()
  const wipe = 'caches' in window ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))) : Promise.resolve()
  Promise.all([drop, wipe]).finally(() => window.location.reload())
}

/** The masked figure's portrait, for a held result that is his. */
function maskedArt(flash: string | undefined | null): { art: string; band: CSSProperties } {
  const key = maskedCoverKey(flash)
  const [top, bot] = coverBand(key)
  return { art: `${import.meta.env.BASE_URL}covers/${playCoverFile(key)}?v=82`, band: { '--band-top': top, '--band-bot': bot } as CSSProperties }
}

function heldStamp(s: GameState): string {
  return `${s.sceneId}|${s.updatedAt ?? 0}|${s.ticks}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** v157: The Stairs read the same from the Court as in the opening: no hub sub-label. */
const NO_HUB_LABEL = new Set<string>([STAIRS])

export function PlayScreen({ state, onChange, onTitle, savedCue, saveToast }: Props) {
  const scene = sceneOf(state)
  const hub = state.hubId ? HUBS[state.hubId] : null
  const storyRef = useRef<HTMLDivElement>(null)
  const sayRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [topicOpen, setTopicOpen] = useState<string | null>(null)
  const [kit, setKit] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [heatInfo, setHeatInfo] = useState<Faction | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // An action that moves you on shows its result here first, on the screen you acted on, with Continue.
  const [heldRaw, setHeld] = useState<HeldScreen | null>(null)
  // A held result only covers the exact state it was made for. Walking on by Map must not carry it along.
  const held = heldRaw && heldRaw.stamp === heldStamp(state) ? heldRaw : null
  const prevHeat = useRef(state.heat)
  // No Map in the Crucible Chambers: the only way up is the stairs.
  // Map on every hub and road screen, but not in a crisis, a fight, Down, or the Crucible Chambers (the only way up is the stairs).
  const showNav =
    (!!hub || state.chapterId === 'cache-run') &&
    scene.kind !== 'crisis' &&
    scene.kind !== 'ending' &&
    !state.flags.encounterHere &&
    !state.flags.strayHunterHere &&
    !state.flags.maskedHere &&
    !state.flags.downed &&
    !isPressureOverlay(state) &&
    state.health > 0 &&
    !(CRUCIBLE_SCENES as readonly string[]).includes(scene.id)
  const hook = hub?.hungerHook
  const hookOn = hook && isChoiceOn(state, hook.show) && isMawExit(state) && !(state.flags.chapter1Done && hub?.id !== 'redmaw')
  const road = roadChoice(state)
  const closing = !state.flags.chapter1Done && state.pressure >= 10 && !state.chapterId
  const chips = listedKit(state.items, !!state.flags.plateHinted)
  const sapThin = state.sap <= 2
  const hpHurt = state.health <= 2
  const choices = held ? [] : visibleChoices(state)
  const roam = canScavenge(state)
  const skimOn = canSkim(state)
  const downed = !!state.flags.downed || state.health <= 0
  const overlay = !held && (!!state.flags.encounterHere || !!state.flags.strayHunterHere || !!state.flags.maskedHere || isPressureOverlay(state) || downed)
  const face = downed
    ? null
    : (state.flags.encounterHere ? encounterSpeaker(state) : null) ??
    pressureFace(state) ??
    (scene.id === 'camp:bay' && bayLookout(state) ? 'Jaxson Vance' : null) ??
    (scene.id === 'camp:lean' && bayLookout(state) ? '' : null) ??
    (scene.id === 'maw:tuner' && state.door === 'prisoner' ? 'Jaxson' : null) ??
    shownText(state, scene.speaker)
  function screenKey(s: GameState): string {
    return `${s.sceneId}|${isPressureOverlay(s) ? 1 : 0}|${s.flags.encounterHere ? 1 : 0}|${s.flags.downed || s.health <= 0 ? 1 : 0}`
  }
  /** Choice and typed results: if the act moves you to another screen, hold its result on this one first. */
  function act(next: GameState) {
    const moved = screenKey(next) !== screenKey(state)
    const fightResult = isEncounterResult(state) || !!next.flags.encounterHere
    // A note that only rides along (the Vessel cloth line) shows on the next screen; it is not a result to hold.
    const noteOnly = next.flash === DISGUISE_SOFTEN_NOTE
    // v159: his line never holds over a talk or offer card; it shows on the ground you arrive at, in plain text.
    const maskedOnQuiet = isMaskedFlash(next.flash) && maskedQuietScene(state.sceneId)
    // Leaving a crisis (Empty, Approach Dry) shows its result on the new ground, so the dry title does not linger.
    // Starting a new chapter (leaving for the road) is not held: the result shows on the road screen, with its buttons.
    const newChapter = next.chapterId !== state.chapterId
    // v114 hotfix: holding a result on the old screen left players on iOS with no buttons, Map, or Do box.
    // Results now show on the new screen, which always has its own actions.
    try {
    if (HOLD_RESULTS && moved && next.flash && !fightResult && !noteOnly && !maskedOnQuiet && !newChapter && scene.kind !== 'crisis') {
      const heldNext: HeldScreen = {
        title: placeTitle,
        meta: hub && !NO_HUB_LABEL.has(scene.id) ? hub.name : scene.id === 'ch1:storm' ? 'Camp-04' : scene.chapterId === 'cache-run' ? cap(ROADS[state.door].name) : null,
        // His cover never wears a speaker's name.
        face: isMaskedFlash(next.flash) ? null : face,
        body: shownText(state, bodyOf(state)),
        // His lines carry his portrait, even on the held screen of the ground you just left.
        art: isMaskedFlash(next.flash) ? maskedArt(next.flash).art : artSrc,
        band: isMaskedFlash(next.flash) ? maskedArt(next.flash).band : artBand,
        result: shownText(next, next.flash),
        noNav: !showNav,
        stamp: heldStamp(next),
      }
      // Anything missing and the hold is skipped: the result shows on the new screen, as before.
      if (heldNext.result && heldNext.title) setHeld(heldNext)
    }
    } catch {
      setHeld(null)
    }
    onChange(next)
  }
  // iOS can leave the page scrolled after the keyboard closes, which pushes the buttons off the bottom.
  function resetPageScroll() {
    if (typeof window !== 'undefined' && (window.scrollY || document.documentElement.scrollTop)) window.scrollTo(0, 0)
  }
  useEffect(() => {
    resetPageScroll()
  }, [state.sceneId, state.flash, heldRaw])
  function continueOn() {
    setHeld(null)
    onChange({ ...state, flash: undefined })
  }
  const coverKey = playCoverKey(state, scene)
  const artSrc = `${import.meta.env.BASE_URL}covers/${playCoverFile(coverKey)}?v=82`
  const [bandTop, bandBot] = coverBand(coverKey)
  const artBand = { '--band-top': bandTop, '--band-bot': bandBot } as CSSProperties
  const placeTitle = downed
    ? 'Down'
    : state.flags.encounterHere
      ? encounterSpeaker(state)
      : (pressureFace(state) ?? shownText(state, scene.title) ?? hub?.name ?? 'The dunes')
  const shopOpen = isShopOpen(state)
  const hookRow = !!(!overlay && !shopOpen && hub && hookOn && hook && showNav)
  const closeRow = !!(!overlay && !shopOpen && closing && showNav)
  // Every selectable quest/story/hub action belongs in this list — never pinned above .choices.
  const optionRows: OptionRow[] = []
  if (!overlay && !shopOpen && roam) {
    optionRows.push({
      key: 'scavenge',
      tone: 'quiet',
      label: 'Scavenge',
      sub: 'Scrap, trade goods. Sometimes a Drop.',
      locked: !!scavengeLock(state),
      lockedNote: scavengeLock(state) ?? undefined,
      onClick: () => !scavengeLock(state) && onChange(scavenge(state)),
    })
  }
  const hasSceneSkim = choices.some((c) => c.id === 'skim')
  if (!overlay && !shopOpen && skimOn && !hasSceneSkim) {
    optionRows.push({
      key: 'skim',
      tone: 'danger',
      label: 'Skim a drip',
      sub: 'Risky Drop. Costs Heat.',
      onClick: () => onChange(skim(state)),
    })
  }
  if (hookRow && hook) {
    optionRows.push({
      key: 'hunger-hook',
      tone: state.flags.chapter1Done ? 'quiet' : 'hunger',
      label: shownText(state, hook.label),
      sub: shownText(state, hook.sub),
      onClick: () =>
        onChange(
          applyEffect(state, {
            goto: hook.sceneId,
            startChapter: state.flags.chapter1Done ? undefined : 'cache-run',
            ticks: 1,
          }),
        ),
    })
  }
  if (road && !overlay && !shopOpen && showNav) {
    const on = isChoiceOn(state, road.enable)
    optionRows.push({
      key: road.id,
      tone: `quiet${on ? '' : ' locked'}`,
      label: road.label,
      sub: road.sub,
      locked: !on,
      lockedNote: on ? undefined : road.locked,
      onClick: () => on && act(applyEffect(state, road.effects)),
    })
  }
  if (closeRow) {
    optionRows.push({
      key: 'closing',
      tone: 'danger',
      label: shownText(state, 'The desert is closing. Take the Gullet.'),
      sub: 'Pressure. The camp will not hold the hour.',
      onClick: () =>
        onChange(
          applyEffect(state, {
            startChapter: 'cache-run',
            goto: 'ch1:leave',
            ticks: 1,
            flag: state.flags.hungerKnown ? undefined : { cacheBlind: true },
          }),
        ),
    })
  }
  const usedKeys = new Set<string>()
  for (const c of choices) {
    const on = isChoiceOn(state, c.enable)
    // Keys must be unique: a repeated id let React keep a stale button (and its old state) on later screens.
    let key = c.id
    for (let n = 2; usedKeys.has(key); n++) key = `${c.id}~${n}`
    usedKeys.add(key)
    optionRows.push({
      key,
      tone: `${c.tone ?? 'default'}${on ? '' : ' locked'}`,
      label: shownText(state, c.label),
      sub: shownText(state, c.sub),
      group: c.group,
      locked: !on,
      lockedNote: !on ? shownText(state, c.locked) : undefined,
      pills: effectPills(c.effects),
      onClick: () => on && (scene.id === CHAPTER_ONE_END && c.id === 'title' ? onTitle() : scene.id === 'ch2:end' && c.id === 'title' ? (act(applyEffect(state, c.effects)), onTitle()) : act(applyEffect(state, c.effects))),
    })
  }
  if (held) {
    optionRows.length = 0
    optionRows.push({ key: HELD_CONTINUE_KEY, tone: 'default', label: 'Continue', onClick: continueOn })
  }
  // Never leave a screen with nothing to press: fall back to a look, and keep the Do box.
  const stuck = !held && optionRows.length === 0
  if (stuck) {
    optionRows.push({ key: 'look-around', tone: 'quiet', label: 'Look around', sub: 'Take stock of where you are.', onClick: () => onChange(interpret({ ...state, flash: undefined }, 'look')) })
  }
  const split = optionRows.length >= 4
  // The Do box is on every screen.
  // Held too: typing drops the hold and acts on the new screen, so a held result never hides the Do box.
  const showDo = true

  const scrolledScene = useRef(state.sceneId)
  useEffect(() => {
    const story = storyRef.current
    if (!story) return
    const resultCard = held ? story.querySelector('.result-flash') : null
    if (resultCard instanceof HTMLElement) {
      scrolledScene.current = state.sceneId
      story.scrollTo({ top: Math.max(0, resultCard.offsetTop - 12) })
      return
    }
    if (scrolledScene.current !== state.sceneId) {
      scrolledScene.current = state.sceneId
      story.scrollTo({ top: 0 })
      return
    }
    const flash = story.querySelector('.flash')
    if (flash instanceof HTMLElement) story.scrollTo({ top: Math.max(0, flash.offsetTop - 12) })
  }, [state.sceneId, state.flash, held])

  // Jodi's Heat: rushing and stalling on danger ground. Visible, online time only; at most +1 a scene.
  const liveState = useRef(state)
  liveState.current = state
  const paused = helpOpen || !!topicOpen || kit || mapOpen || journalOpen || !!held
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const moves = useRef<number[]>([])
  const lastStamp = useRef(state.updatedAt)
  useEffect(() => {
    if (state.updatedAt === lastStamp.current) return
    lastStamp.current = state.updatedAt
    const now = Date.now()
    moves.current = [...moves.current.filter((t) => now - t <= RUSH_WINDOW_MS), now]
    if (moves.current.length < RUSH_MOVES || !noticeOn(state)) return
    moves.current = []
    if (Math.random() < RUSH_CHANCE) onChange(timingNotice(state, 'rush'))
  }, [state.updatedAt])
  useEffect(() => {
    if (!noticeOn(state) || state.flags.timingNoticeAt === state.sceneId) return
    const threshold = STALL_MIN_S + Math.random() * (STALL_MAX_S - STALL_MIN_S)
    let waited = 0
    let chance = STALL_BASE
    const away = () => {
      if (document.hidden) moves.current = []
    }
    document.addEventListener('visibilitychange', away)
    const tick = window.setInterval(() => {
      if (document.hidden || !navigator.onLine || pausedRef.current) return
      waited += 1
      if (waited < threshold || (waited - threshold) % STALL_TICK_S !== 0) return
      if (Math.random() < chance) onChange(timingNotice(liveState.current, 'stall'))
      else chance = Math.min(0.9, chance + STALL_STEP)
    }, 1000)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', away)
    }
  }, [state.sceneId, state.updatedAt])

  useEffect(() => {
    const prev = prevHeat.current
    const bits: string[] = []
    for (const f of ['cartel', 'seekers', 'strays'] as const) {
      const d = state.heat[f] - prev[f]
      if (d > 0) bits.push(heatRiseLine(f, d, state.door))
    }
    prevHeat.current = state.heat
    if (!bits.length) return
    setToast(bits.join(' '))
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [state.heat, state.updatedAt, state.door])

  function submitIntent() {
    const t = draft.trim()
    if (!t) return
    setHeld(null)
    const route = helpRoute(t)
    if (route?.kind === 'list') {
      setDraft('')
      setHelpOpen(true)
      return
    }
    if (route?.kind === 'topic') {
      setDraft('')
      setTopicOpen(route.topic.id)
      return
    }
    setDraft('')
    act(interpret(state, t))
  }

  const fightAuto = fightHelpAuto(state)

  const typedTopic = topicOpen ? helpTopic(topicOpen) : undefined
  const autoTopic = !topicOpen && fightAuto ? helpTopic('fight') : undefined
  const shownTopic = typedTopic ?? (autoTopic ? fightTopicMidFight(autoTopic) : undefined)

  function closeTopic() {
    setTopicOpen(null)
    if (fightAuto) onChange(persist(markFightHelpSeen(state)))
  }

  function pickHelp(command: string) {
    setDraft(command)
    setHelpOpen(false)
    requestAnimationFrame(() => sayRef.current?.focus())
  }


  return (
    <div className={`screen play-screen${split ? ' play-split' : ''}`}>
      <header className="status">
        <div className="status-row">
          <button type="button" className="brand" onClick={onTitle} title="Title">
            Amber
          </button>
          <div className="vitals">
            <div className={`sap ${sapThin ? 'thin' : ''}`} title="Sap — thirst, walks, crisis fuel">
              <span className="sap-label">Sap</span>
              <div className="pips" aria-label={`${state.sap} of ${state.sapMax} sap`}>
                {Array.from({ length: state.sapMax }, (_, i) => (
                  <i key={i} className={i < state.sap ? 'on' : ''} />
                ))}
              </div>
              <em>{sapLabel(state.sap)}</em>
            </div>
            <div className={`sap hp ${hpHurt ? 'thin' : ''}`} title="Health — fight hits">
              <span className="sap-label">Health</span>
              <div className="pips" aria-label={`${state.health} of ${state.healthMax} health`}>
                {Array.from({ length: state.healthMax }, (_, i) => (
                  <i key={i} className={i < state.health ? 'on' : ''} />
                ))}
              </div>
              <em>{healthLabel(state.health)}</em>
            </div>
            <div className={`sap hands ${handsLeft(state) <= 1 ? 'thin' : ''}`} title={handsLeft(state) > 0 ? "Hands — get-ups left this chapter" : "No hands left — the next fall ends the run"}>
              <span className="sap-label">Hands</span>
              <span className="hands-pips" aria-label={`${handsLeft(state)} of ${HANDS_MAX} hands`}>{handsPips(state)}</span>
            </div>
          </div>
          <button type="button" className="kit-btn" onClick={() => setKit(true)}>
            Gear
            {chips.length ? <span className="kit-count">{chips.length}</span> : null}
          </button>
        </div>
        <div className="heat-row">
          <button type="button" className="map-btn journal-btn" disabled={fightLocked(state)} onClick={() => setJournalOpen(true)}>
            Rumors
          </button>
          {(['cartel', 'seekers', 'strays'] as const).map((f) => (
            <button
              type="button"
              key={f}
              className={`heat ${heatTone(state.heat[f])}`}
              onClick={() => setHeatInfo(f)}
              aria-label={`${heatFactions(state.door)[f].name} Heat ${state.heat[f]}. Not XP. Tap for who is watching.`}
            >
              {f} {state.heat[f]}
            </button>
          ))}
          {showNav && !held?.noNav ? (
            <button type="button" className="map-btn" onClick={() => setMapOpen(true)}>
              Map
            </button>
          ) : null}
        </div>
        <div className="place-line">
          <strong>{held ? held.title : placeTitle}</strong>
          <span className="place-meta">
            {held ? held.meta : hub && !NO_HUB_LABEL.has(scene.id) ? hub.name : scene.id === 'ch1:storm' ? 'Camp-04' : scene.chapterId === 'cache-run' ? cap(ROADS[state.door].name) : null}
            {savedCue ? <em className="saved-cue">Saved</em> : null}
          </span>
        </div>
      </header>

      {saveToast ? <p className="heat-toast">{saveToast}</p> : null}
      {toast ? <p className="heat-toast">{toast}</p> : null}

      <div className="scene-stage" style={held ? held.band : artBand}>
        <div className="scene-art" aria-hidden="true">
          <img key={`fill:${held ? held.art : artSrc}`} className="scene-fill" src={held ? held.art : artSrc} alt="" onError={coverFallback} />
          <img key={`img:${held ? held.art : artSrc}`} className="scene-img" src={held ? held.art : artSrc} alt="" onError={coverFallback} />
        </div>

        <div className="story" ref={storyRef}>
          {(held ? held.face : face) ? <p className="speaker">{held ? held.face : face}</p> : null}
          {(held ? held.body : shownText(state, bodyOf(state)))
            .split('\n\n')
            .map((p, i) => (
              <p key={i} className={/^[A-Z][A-Z'-]* ♥ \d/.test(p) ? 'fight-stat' : undefined}>{p}</p>
            ))}
          {held ? <p className="flash result-flash">{held.result}</p> : null}
          {state.flash && !overlay && !held ? <p className="flash">{shownText(state, state.flash)}</p> : null}
          {sapThin && scene.kind !== 'crisis' && !overlay && !held ? (
            <p className="pressure-note">
              {state.sap <= 0
                ? 'Sap is empty. The next act that costs sap will be a crisis, not a death.'
                : 'Sap is thin. Walks and work will empty you.'}
            </p>
          ) : null}
          {state.pressure >= 8 && !state.flags.chapter1Done && !state.chapterId && !overlay ? (
            <p className="pressure-note">Pressure is mounting. Hunters use the hours you spend lingering.</p>
          ) : null}
        </div>
      </div>

      <div className="thumb">
        <div className="choices">
          {optionRows.map((row, i) => {
            const prev = optionRows[i - 1]
            const head = row.group && row.group !== prev?.group ? row.group : null
            return (
              <Fragment key={row.key}>
                {head ? (
                  <p className="choice-group">
                    {head === 'buy'
                      ? 'Buy'
                      : head === 'sell'
                        ? 'Sell'
                        : head === 'intel'
                          ? 'Intel'
                          : head === 'side'
                            ? 'Side trouble'
                            : 'Talk'}
                  </p>
                ) : null}
                <button
                  type="button"
                  id={row.key === HELD_CONTINUE_KEY ? HELD_CONTINUE_KEY : undefined}
                  className={`choice ${row.tone}${row.group ? ` shop-row` : ''}${row.key === HELD_CONTINUE_KEY ? ' held-continue' : ''}`}
                  disabled={row.locked}
                  onClick={row.onClick}
                >
                  <span className="choice-copy">
                    {row.label}
                    {row.sub ? <small>{row.sub}</small> : null}
                    {row.lockedNote ? <small>{row.lockedNote}</small> : null}
                  </span>
                  {row.pills?.length ? (
                    <span className="pills">
                      {row.pills.map((p) => (
                        <i key={`${row.key}-${p.kind}-${p.text}`} className={p.kind}>
                          {p.text}
                        </i>
                      ))}
                    </span>
                  ) : null}
                </button>
              </Fragment>
            )
          })}
        </div>

        {/* With the actions, above the Do box: at narrow widths it sat under the form like a stray footnote. */}
        {(state.items.vial_drop ?? 0) > 0 && !held ? (
          <button type="button" className="text-link drink" onClick={() => onChange(drinkDrop(state))}>
            Drink a Drop · +3 Sap
          </button>
        ) : null}
        {showDo ? (
          <form
            className="say"
            onSubmit={(e) => {
              e.preventDefault()
              submitIntent()
            }}
          >
            <input
              ref={sayRef}
              onBlur={resetPageScroll}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isEncounterResult(state)
                  ? 'on'
                  : overlay
                    ? 'talk / fight / bribe / run'
                    : `look / talk / fight / bribe / help / who is ${state.door === 'outcast' ? 'silas' : state.door === 'vessel' ? 'oram' : state.flags.kaelenKnown ? 'kaelen' : 'valerius'}`
              }
              enterKeyHint="go"
              autoComplete="off"
              aria-label="Do something"
            />
            <button type="submit" className="btn btn-gold btn-tiny" disabled={!draft.trim()}>
              Do
            </button>
          </form>
        ) : null}
        {showDo ? (
          <p className="verb-hint">
            {(state.recentVerbs?.length ?? 0) > 0 ? `Heard: ${state.recentVerbs?.slice(0, 2).join(' · ')}. ` : ''}
            Try typing: {typedHints(state, scene, roam).join(' · ')}
          </p>
        ) : null}

      </div>

      {helpOpen ? (
        <HelpCard
          entries={helpEntries(
            state,
            optionRows.map((row) => row.label),
          )}
          onClose={() => setHelpOpen(false)}
          onPick={pickHelp}
          onTopic={(id) => {
            setHelpOpen(false)
            setTopicOpen(id)
          }}
        />
      ) : null}
      {shownTopic ? <HelpTopicCard topic={shownTopic} onClose={closeTopic} /> : null}
      {kit ? <InventorySheet state={state} onClose={() => setKit(false)} onChange={onChange} /> : null}
      {mapOpen ? <MapSheet state={state} onClose={() => setMapOpen(false)} onChange={onChange} /> : null}
      {journalOpen ? <JournalSheet state={state} onClose={() => setJournalOpen(false)} /> : null}
      {heatInfo ? <HeatExplainer faction={heatInfo} door={state.door} onClose={() => setHeatInfo(null)} /> : null}
      {!state.flags.heatTaught ? (
        <HeatTip door={state.door} onDismiss={() => onChange(applyEffect(state, { flag: { heatTaught: true } }))} />
      ) : null}
    </div>
  )
}
