import { useCallback, useEffect, useMemo, useState } from 'react'
import { Scene } from './scene/Scene'
import type { FocusRequest } from './scene/focus'
import { useViewportScreen } from './scene/screen'
import { ZOOM_STEP, clampZoom } from './scene/zoom'
import { Hud } from './ui/Hud'
import { IosScreen } from './ui/IosScreen'
import { MacScreen } from './ui/MacScreen'
import {
  applyOverride,
  overrideFromUrl,
  WeatherSwitcher,
  type Override,
} from './ui/WeatherSwitcher'
import { moodFor } from './lib/palette'
import { useInitialLocation, useWeather } from './hooks/useWeather'
import './index.css'

export default function App() {
  const [location, setLocation] = useInitialLocation()
  const { weather: live, error, loading, refresh } = useWeather(location)

  const [override, setOverride] = useState<Override>(() => overrideFromUrl(window.location.search))
  const weather = useMemo(() => applyOverride(live, override), [live, override])
  const mood = useMemo(() => moodFor(weather), [weather])

  const screen = useViewportScreen()
  // Picked rather than branched in the tree, so both overlays are handed one
  // prop list. A prop added to DeviceScreenSharedProps then cannot reach one
  // device and miss the other.
  const Device = screen === 'ios' ? IosScreen : MacScreen

  const [zoom, setZoom] = useState(1)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const [arrived, setArrived] = useState(false)

  // The device that swapped out from under a close-up is gone -- its Object3D
  // unmounted with the old geometry -- so a focus left pointing at it would
  // have the rig chasing a detached object's stale world position. Dropped
  // during render rather than in an effect, so there is no committed frame in
  // between where that is what the rig is aiming at.
  const [shownOn, setShownOn] = useState(screen)
  if (screen !== shownOn) {
    setShownOn(screen)
    setFocus(null)
  }

  // Working the zoom control means you want the room back, not a nudge to a
  // close-up you are already inside.
  const stepZoom = useCallback((direction: 1 | -1) => {
    setFocus(null)
    setZoom((current) => clampZoom(current * (direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP)))
  }, [])

  useEffect(() => {
    if (!focus) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  // The sun angle only needs a fresh clock once a minute.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app">
      <div className="sky" style={{ background: `linear-gradient(${mood.top}, ${mood.bottom})` }} />
      <Scene
        weather={weather}
        location={location}
        when={now}
        mood={mood}
        screen={screen}
        zoom={zoom}
        focus={focus}
        onFocus={setFocus}
        onArrive={setArrived}
      />
      <div className="vignette" />
      <Device
        open={focus?.kind === 'screen'}
        live={arrived}
        mood={mood}
        weather={weather}
        when={now}
        onExit={() => setFocus(null)}
      />
      <Hud
        weather={weather}
        location={location}
        error={error}
        loading={loading}
        zoom={zoom}
        onZoom={stepZoom}
        focus={focus}
        when={now}
        onClearFocus={() => setFocus(null)}
        onPick={setLocation}
        onRefresh={refresh}
      />
      {import.meta.env.DEV && <WeatherSwitcher value={override} onChange={setOverride} />}
    </div>
  )
}
