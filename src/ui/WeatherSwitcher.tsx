import { useState } from 'react'
import { useViewportScreen } from '../scene/screen'
import { CONDITION_KINDS } from '../lib/openMeteo'
import type { ConditionKind, Weather } from '../types'

export type TimeOverride = 'auto' | 'day' | 'night'

export interface Override {
  /** null means "use whatever the API reported". */
  kind: ConditionKind | null
  intensity: number
  time: TimeOverride
}

export const LIVE: Override = { kind: null, intensity: 0.8, time: 'auto' }

/** Reads ?preview=snow&intensity=0.9&night so a state can be linked to. */
export function overrideFromUrl(search: string): Override {
  const params = new URLSearchParams(search)
  const kind = params.get('preview') as ConditionKind | null
  const intensity = Number(params.get('intensity') ?? LIVE.intensity)

  return {
    kind: kind && CONDITION_KINDS.includes(kind) ? kind : null,
    intensity: Number.isFinite(intensity) ? intensity : LIVE.intensity,
    time: params.has('night') ? 'night' : LIVE.time,
  }
}

export function applyOverride(weather: Weather | null, override: Override): Weather | null {
  if (!weather) return weather
  if (override.kind === null && override.time === 'auto') return weather

  return {
    ...weather,
    ...(override.kind
      ? { kind: override.kind, intensity: override.intensity, label: `${override.kind} (preview)` }
      : {}),
    ...(override.time === 'auto' ? {} : { isDay: override.time === 'day' }),
  }
}

const TIMES: TimeOverride[] = ['auto', 'day', 'night']

export interface WeatherSwitcherProps {
  value: Override
  onChange: (next: Override) => void
}

export function WeatherSwitcher({ value, onChange }: WeatherSwitcherProps) {
  const set = (patch: Partial<Override>) => onChange({ ...value, ...patch })

  // A phone has no room to spare: open, the panel covers the diorama, which is
  // the whole picture. So it starts collapsed to its own title there and opens
  // as a sheet along the bottom edge. A wide window starts open, where the
  // panel costs nothing. Resized across the breakpoint it re-reads the default
  // rather than carrying a phone's collapsed panel onto a desktop.
  const screen = useViewportScreen()
  const [open, setOpen] = useState(screen === 'mac')
  const [sizedFor, setSizedFor] = useState(screen)
  if (screen !== sizedFor) {
    setSizedFor(screen)
    setOpen(screen === 'mac')
  }

  return (
    <aside className={open ? 'switcher is-open' : 'switcher'}>
      <button
        type="button"
        className="switcher-title"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Preview <strong>{value.kind ?? 'live'}</strong>
      </button>

      <div className="switcher-group">
        <button
          type="button"
          className={value.kind === null ? 'switcher-chip is-on' : 'switcher-chip'}
          onClick={() => onChange(LIVE)}
        >
          live
        </button>
        {CONDITION_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={value.kind === kind ? 'switcher-chip is-on' : 'switcher-chip'}
            onClick={() => set({ kind })}
          >
            {kind}
          </button>
        ))}
      </div>

      <label className="switcher-slider">
        <span>
          intensity <strong>{value.intensity.toFixed(2)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value.intensity}
          disabled={value.kind === null}
          onChange={(event) => set({ intensity: Number(event.target.value) })}
        />
      </label>

      <div className="switcher-group">
        {TIMES.map((time) => (
          <button
            key={time}
            type="button"
            className={value.time === time ? 'switcher-chip is-on' : 'switcher-chip'}
            onClick={() => set({ time })}
          >
            {time}
          </button>
        ))}
      </div>
    </aside>
  )
}
