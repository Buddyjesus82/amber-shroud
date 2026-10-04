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
} from '../game/engine'
import { heatFactions, heatRiseLine } from '../game/heat'
import { effectPills, listedKit } from '../game/kit'
import { isMawExit } from '../game/map'
import { encounterSpeaker, isEncounterResult } from '../game/encounter'
import { coverBand, playCoverFile, playCoverKey } from '../game/art'
import { bayLookout } from '../game/campJob'
import { isPressureOverlay, pressureFace } from '../game/hunter'
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
  const prevHeat = useRef(state.heat)
  const talky = scene.kind === 'talk' || scene.kind === 'place' || scene.kind === 'story'
  const showNav = !!hub && scene.kind !== 'crisis' && state.chapterId !== 'cache-run'
  const hook = hub?.hungerHook
  const hookOn = hook && isChoiceOn(state, hook.show) && isMawExit(state)
  const closing = !state.flags.chapter1Done && state.pressure >= 10 && !state.chapterId
  const chips = listedKit(state.items)
  const sapThin = state.sap <= 2
  const hpHurt = state.health <= 2
  const choices = visibleChoices(state)
  const roam = canScavenge(state)
  const skimOn = canSkim(state)
  const downed = !!state.flags.downed || state.health <= 0
  const overlay = !!state.flags.encounterHere || isPressureOverlay(state) || downed
  const face = downed
    ? null
    : (state.flags.encounterHere ? encounterSpeaker(state) : null) ??
    pressureFace(state) ??
    (scene.id === 'camp:bay' && bayLookout(state) ? 'Jaxson Vance' : null) ??
    (scene.id === 'maw:tuner' && state.door === 'prisoner' ? 'Jaxson' : null) ??
    scene.speaker
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
      onClick: () => onChange(scavenge(state)),
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
      label: hook.label,
      sub: hook.sub,
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
  if (closeRow) {
    optionRows.push({
      key: 'closing',
      tone: 'danger',
      label: 'The desert is closing. Take the Hunger.',
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
  for (const c of choices) {
    const on = isChoiceOn(state, c.enable)
    optionRows.push({
      key: c.id,
      tone: `${c.tone ?? 'default'}${on ? '' : ' locked'}`,
      label: c.label,
      sub: c.sub,
      group: c.group,
      locked: !on,
      lockedNote: !on ? c.locked : undefined,
      pills: effectPills(c.effects),
      onClick: () => on && onChange(applyEffect(state, c.effects)),
    })
  }
  const split = optionRows.length >= 4
  const showDo = talky || roam || overlay

  const scrolledScene = useRef(state.sceneId)
  useEffect(() => {
    const story = storyRef.current
    if (!story) return
    if (scrolledScene.current !== state.sceneId) {
      scrolledScene.current = state.sceneId
      story.scrollTo({ top: 0 })
      return
    }
    const flash = story.querySelector('.flash')
    if (flash instanceof HTMLElement) story.scrollTo({ top: Math.max(0, flash.offsetTop - 12) })
  }, [state.sceneId, state.flash])

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
    onChange(interpret(state, t))
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

  const coverKey = playCoverKey(state, scene)
  const artSrc = `${import.meta.env.BASE_URL}covers/${playCoverFile(coverKey)}?v=50`
  const [bandTop, bandBot] = coverBand(coverKey)
  const artBand = { '--band-top': bandTop, '--band-bot': bandBot } as CSSProperties

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
          </div>
          <button type="button" className="kit-btn" onClick={() => setKit(true)}>
            Gear
            {chips.length ? <span className="kit-count">{chips.length}</span> : null}
          </button>
        </div>
        <div className="heat-row">
          <button type="button" className="map-btn journal-btn" onClick={() => setJournalOpen(true)}>
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
          {showNav ? (
            <button type="button" className="map-btn" onClick={() => setMapOpen(true)}>
              Map
            </button>
          ) : null}
        </div>
        <div className="place-line">
          <strong>
            {downed
              ? 'Down'
              : state.flags.encounterHere
                ? encounterSpeaker(state)
                : (pressureFace(state) ?? scene.title ?? hub?.name ?? 'The dunes')}
          </strong>
          <span className="place-meta">
            {hub ? hub.name : scene.chapterId === 'cache-run' ? 'The Hunger' : null}
            {savedCue ? <em className="saved-cue">Saved</em> : null}
          </span>
        </div>
      </header>

      {saveToast ? <p className="heat-toast">{saveToast}</p> : null}
      {toast ? <p className="heat-toast">{toast}</p> : null}

      <div className="scene-stage" style={artBand}>
        <div className="scene-art" aria-hidden="true">
          <img className="scene-fill" src={artSrc} alt="" />
          <img className="scene-img" src={artSrc} alt="" />
        </div>

        <div className="story" ref={storyRef}>
          {face ? <p className="speaker">{face}</p> : null}
          {bodyOf(state)
            .split('\n\n')
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          {state.flash && !overlay ? <p className="flash">{state.flash}</p> : null}
          {sapThin && scene.kind !== 'crisis' && !overlay ? (
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
                  className={`choice ${row.tone}${row.group ? ` shop-row` : ''}`}
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isEncounterResult(state)
                  ? 'on'
                  : overlay
                    ? 'talk / fight / bribe / run'
                    : `look / talk / fight / bribe / help / who is ${state.door === 'outcast' ? 'silas' : state.door === 'vessel' ? 'oram' : 'kaelen'}`
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
        {showDo && (state.recentVerbs?.length ?? 0) > 0 ? (
          <p className="verb-hint">Heard: {state.recentVerbs?.join(' · ')}</p>
        ) : null}

        {(state.items.vial_drop ?? 0) > 0 ? (
          <button type="button" className="text-link drink" onClick={() => onChange(drinkDrop(state))}>
            Drink a Drop · +3 Sap
          </button>
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
