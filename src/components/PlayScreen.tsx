import { Fragment, useEffect, useRef, useState } from 'react'
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
  sapLabel,
  scavenge,
  sceneOf,
  skim,
  visibleChoices,
} from '../game/engine'
import { HEAT_FACTIONS, heatRiseLine } from '../game/heat'
import { effectPills, listedKit } from '../game/kit'
import { isMawExit } from '../game/map'
import { encounterSpeaker, isEncounterResult } from '../game/encounter'
import { isSybellaOverlay, isWireSide } from '../game/hunter'
import { isShopOpen } from '../game/trade'
import type { Faction, GameState } from '../game/types'
import { HeatExplainer, HeatTip } from './HeatGuide'
import { InventorySheet } from './InventorySheet'
import { MapSheet } from './MapSheet'

type OptionRow = {
  key: string
  tone: string
  label: string
  sub?: string
  group?: 'buy' | 'sell' | 'talk'
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
  const [draft, setDraft] = useState('')
  const [kit, setKit] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
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
  const overlay =
    !!state.flags.encounterHere ||
    isSybellaOverlay(state) ||
    (!!state.flags.hunterHere && isWireSide(state.sceneId))
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
  const showDo = talky || roam

  useEffect(() => {
    storyRef.current?.scrollTo({ top: 0 })
  }, [state.sceneId, state.flash])

  useEffect(() => {
    const prev = prevHeat.current
    const bits: string[] = []
    for (const f of ['cartel', 'seekers', 'strays'] as const) {
      const d = state.heat[f] - prev[f]
      if (d > 0) bits.push(heatRiseLine(f, d))
    }
    prevHeat.current = state.heat
    if (!bits.length) return
    setToast(bits.join(' '))
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [state.heat, state.updatedAt])

  function submitIntent() {
    const t = draft.trim()
    if (!t) return
    setDraft('')
    onChange(interpret(state, t))
  }

  const art =
    scene.art === 'hunger'
      ? `${import.meta.env.BASE_URL}covers/hunger.png`
      : scene.art === 'world'
        ? `${import.meta.env.BASE_URL}covers/world.png`
        : null

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
          {(['cartel', 'seekers', 'strays'] as const).map((f) => (
            <button
              type="button"
              key={f}
              className={`heat ${heatTone(state.heat[f])}`}
              onClick={() => setHeatInfo(f)}
              aria-label={`${HEAT_FACTIONS[f].name} Heat ${state.heat[f]}. Not XP. Tap for who is watching.`}
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
            {state.flags.encounterHere ? encounterSpeaker(state) : (scene.title ?? hub?.name ?? 'The dunes')}
          </strong>
          <span className="place-meta">
            {hub ? hub.name : scene.chapterId === 'cache-run' ? 'The Hunger' : null}
            {savedCue ? <em className="saved-cue">Saved</em> : null}
          </span>
        </div>
      </header>

      {saveToast ? <p className="heat-toast">{saveToast}</p> : null}
      {toast ? <p className="heat-toast">{toast}</p> : null}

      {art && !state.flags.encounterHere ? (
        <div className="scene-art">
          <img src={art} alt="" />
        </div>
      ) : null}

      <div className="story" ref={storyRef}>
        {scene.speaker || isSybellaOverlay(state) || state.flags.encounterHere ? (
          <p className="speaker">
            {state.flags.encounterHere
              ? encounterSpeaker(state)
              : isSybellaOverlay(state)
                ? 'Sybella'
                : scene.speaker}
          </p>
        ) : null}
        {bodyOf(state)
          .split('\n\n')
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        {state.flash && !state.flags.encounterHere ? <p className="flash">{state.flash}</p> : null}
        {sapThin && scene.kind !== 'crisis' && !state.flags.encounterHere ? (
          <p className="pressure-note">
            {state.sap <= 0
              ? 'Sap is empty. The next act that costs sap will be a crisis, not a death.'
              : 'Sap is thin. Walks and work will empty you.'}
          </p>
        ) : null}
        {state.pressure >= 8 && !state.flags.chapter1Done && !state.chapterId && !state.flags.encounterHere ? (
          <p className="pressure-note">Pressure is mounting. Hunters use the hours you spend lingering.</p>
        ) : null}
      </div>

      <div className="thumb">
        <div className="choices">
          {optionRows.map((row, i) => {
            const prev = optionRows[i - 1]
            const head = row.group && row.group !== prev?.group ? row.group : null
            return (
              <Fragment key={row.key}>
                {head ? <p className="choice-group">{head === 'buy' ? 'Buy' : head === 'sell' ? 'Sell' : 'Talk'}</p> : null}
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isEncounterResult(state)
                  ? 'on'
                  : state.flags.encounterHere
                    ? 'fight / skip'
                    : 'sabotage vent pipes / scavenge / who is kaelen'
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

      {kit ? <InventorySheet state={state} onClose={() => setKit(false)} onChange={onChange} /> : null}
      {mapOpen ? <MapSheet state={state} onClose={() => setMapOpen(false)} onChange={onChange} /> : null}
      {heatInfo ? <HeatExplainer faction={heatInfo} onClose={() => setHeatInfo(null)} /> : null}
      {!state.flags.heatTaught ? (
        <HeatTip onDismiss={() => onChange(applyEffect(state, { flag: { heatTaught: true } }))} />
      ) : null}
    </div>
  )
}
