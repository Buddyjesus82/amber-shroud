import { useEffect, useRef, useState } from 'react'
import { HUBS } from '../game/content/catalog'
import {
  applyEffect,
  bodyOf,
  canScavenge,
  canSkim,
  drinkDrop,
  heatTone,
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
import type { Faction, GameState } from '../game/types'
import { HeatExplainer, HeatTip } from './HeatGuide'
import { InventorySheet } from './InventorySheet'
import { MapSheet } from './MapSheet'

type Props = {
  state: GameState
  onChange: (s: GameState) => void
  onTitle: () => void
}

export function PlayScreen({ state, onChange, onTitle }: Props) {
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
  const choices = visibleChoices(state)
  const roam = canScavenge(state)
  const skimOn = canSkim(state)
  const optionCount = choices.length + (roam ? 1 : 0) + (skimOn ? 1 : 0) + (hookOn ? 1 : 0)
  const split = optionCount >= 4
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
          <div className={`sap ${sapThin ? 'thin' : ''}`} title="Sap — Drops of life">
            <span className="sap-label">Sap</span>
            <div className="pips" aria-label={`${state.sap} of ${state.sapMax} sap`}>
              {Array.from({ length: state.sapMax }, (_, i) => (
                <i key={i} className={i < state.sap ? 'on' : ''} />
              ))}
            </div>
            <em>{sapLabel(state.sap)}</em>
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
          <strong>{scene.title ?? hub?.name ?? 'The dunes'}</strong>
          {hub ? <span>{hub.name}</span> : scene.chapterId === 'cache-run' ? <span>The Hunger</span> : null}
        </div>
      </header>

      {toast ? <p className="heat-toast">{toast}</p> : null}

      {art ? (
        <div className="scene-art">
          <img src={art} alt="" />
        </div>
      ) : null}

      <div className="story" ref={storyRef}>
        {scene.speaker ? <p className="speaker">{scene.speaker}</p> : null}
        {bodyOf(state)
          .split('\n\n')
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        {state.flash ? <p className="flash">{state.flash}</p> : null}
        {sapThin && scene.kind !== 'crisis' ? (
          <p className="pressure-note">
            {state.sap <= 0
              ? 'Sap is empty. The next act that costs sap will be a crisis, not a death.'
              : 'Sap is thin. Walks and work will empty you.'}
          </p>
        ) : null}
        {state.pressure >= 8 && !state.flags.chapter1Done && !state.chapterId ? (
          <p className="pressure-note">Pressure is mounting. Hunters use the hours you spend lingering.</p>
        ) : null}
      </div>

      <div className="thumb">
        {hub && hookOn && hook && showNav ? (
          <button
            type="button"
            className={state.flags.chapter1Done ? 'btn btn-ghost' : 'btn btn-hunger'}
            onClick={() =>
              onChange(
                applyEffect(state, {
                  goto: hook.sceneId,
                  startChapter: state.flags.chapter1Done ? undefined : 'cache-run',
                  ticks: 1,
                }),
              )
            }
          >
            {hook.label}
            <small>{hook.sub}</small>
          </button>
        ) : null}

        {closing && showNav ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() =>
              onChange(
                applyEffect(state, {
                  startChapter: 'cache-run',
                  goto: 'ch1:leave',
                  ticks: 1,
                  flag: state.flags.hungerKnown ? undefined : { cacheBlind: true },
                }),
              )
            }
          >
            The desert is closing. Take the Hunger.
          </button>
        ) : null}

        {roam ? (
          <div className="hub-acts">
            <button type="button" className="btn btn-ghost hub-act" onClick={() => onChange(scavenge(state))}>
              Scavenge
              <small>Scrap, trade goods. Sometimes a Drop.</small>
            </button>
            {skimOn ? (
              <button type="button" className="btn btn-danger hub-act" onClick={() => onChange(skim(state))}>
                Skim a drip
                <small>Risky Drop. Costs Heat.</small>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="choices">
          {choices.map((c) => {
            const on = isChoiceOn(state, c.enable)
            const pills = effectPills(c.effects)
            return (
              <button
                type="button"
                key={c.id}
                className={`choice ${c.tone ?? 'default'} ${on ? '' : 'locked'}`}
                disabled={!on}
                onClick={() => on && onChange(applyEffect(state, c.effects))}
              >
                <span className="choice-copy">
                  {c.label}
                  {c.sub ? <small>{c.sub}</small> : null}
                  {!on && c.locked ? <small>{c.locked}</small> : null}
                </span>
                {pills.length ? (
                  <span className="pills">
                    {pills.map((p) => (
                      <i key={`${c.id}-${p.kind}-${p.text}`} className={p.kind}>
                        {p.text}
                      </i>
                    ))}
                  </span>
                ) : null}
              </button>
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
              placeholder="ask oil-tooth / scavenge / who is kaelen"
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
