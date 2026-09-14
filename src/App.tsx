import { useEffect, useMemo, useState } from 'react'
import { Scene } from './scene/Scene'
import { Hud } from './ui/Hud'
import {
  applyOverride,
  overrideFromUrl,
  WeatherSwitcher,
  type Override,
} from './ui/WeatherSwitcher'
import { moodFor } from './lib/palette'
import { useInitialLocation, useWeather } from './hooks/useWeather'
import { useHermes } from './hooks/useHermes'
import { affordancesFor } from './scene/affordances'
import './index.css'

export default function App() {
  const [location, setLocation] = useInitialLocation()
  const { weather: live, error, loading, refresh } = useWeather(location)

  const [override, setOverride] = useState<Override>(() => overrideFromUrl(window.location.search))
  const weather = useMemo(() => applyOverride(live, override), [live, override])
  const mood = useMemo(() => moodFor(weather), [weather])

  const hermes = useHermes()
  const affordances = useMemo(() => affordancesFor(hermes), [hermes])

  // The sun angle only needs a fresh clock once a minute.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app">
      <div className="sky" style={{ background: `linear-gradient(${mood.top}, ${mood.bottom})` }} />
      <Scene weather={weather} location={location} when={now} mood={mood} affordances={affordances} />
      <div className="vignette" />
      <Hud
        weather={weather}
        location={location}
        error={error}
        loading={loading}
        onPick={setLocation}
        onRefresh={refresh}
        hermes={hermes}
      />
      {import.meta.env.DEV && <WeatherSwitcher value={override} onChange={setOverride} />}
    </div>
  )
}
