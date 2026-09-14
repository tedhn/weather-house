import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../lib/openMeteo'
import type { Coordinates, Place, Weather } from '../types'

function localClock(weather: Weather | null): string {
  if (!weather) return '--:--'
  const shifted = new Date(Date.now() + weather.utcOffsetSeconds * 1000)
  return shifted.toISOString().slice(11, 16)
}

function LocationSearch({ onPick }: { onPick: (place: Place) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      controller.current?.abort()
      const next = new AbortController()
      controller.current = next
      setBusy(true)

      try {
        setResults(await searchPlaces(query, { signal: next.signal }))
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([])
      } finally {
        setBusy(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  if (!open) {
    return (
      <button type="button" className="chip" onClick={() => setOpen(true)}>
        Change location
      </button>
    )
  }

  return (
    <div className="search">
      <input
        autoFocus
        value={query}
        placeholder="Search a city"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      {busy && <p className="search-note">Searching…</p>}
      {!busy && query.trim() && !results.length && <p className="search-note">Nothing found.</p>}
      <ul>
        {results.map((place) => (
          <li key={place.id}>
            <button
              type="button"
              onClick={() => {
                onPick(place)
                setOpen(false)
                setQuery('')
              }}
            >
              <strong>{place.name}</strong>
              <span>{place.region}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="chip subtle" onClick={() => setOpen(false)}>
        Close
      </button>
    </div>
  )
}

export interface HudProps {
  weather: Weather | null
  location: Coordinates | null
  error: Error | null
  loading: boolean
  onPick: (place: Place) => void
  onRefresh: () => void
}

export function Hud({ weather, location, error, loading, onPick, onRefresh }: HudProps) {
  return (
    <div className="hud">
      <div className="hud-corner top-left">
        <p className="eyebrow">
          {location?.name || 'Locating…'}
          {location?.isCurrent && location.name && <span className="you">you</span>}
        </p>
        <h1>{weather ? weather.label : loading ? 'Reading the sky' : 'No signal'}</h1>
        {weather && (
          <p className="temperature">
            {Math.round(weather.temperature)}
            <span>°C</span>
          </p>
        )}
      </div>

      <div className="hud-corner top-right">
        <p className="clock">{localClock(weather)}</p>
        <p className="eyebrow">{weather?.isDay ? 'daylight' : 'after dark'}</p>
      </div>

      <div className="hud-corner bottom-left">
        {weather && (
          <dl>
            <div>
              <dt>feels like</dt>
              <dd>{Math.round(weather.apparentTemperature)}°</dd>
            </div>
            <div>
              <dt>wind</dt>
              <dd>{weather.windSpeed.toFixed(1)} m/s</dd>
            </div>
            <div>
              <dt>cloud</dt>
              <dd>{Math.round(weather.cloudCover * 100)}%</dd>
            </div>
            <div>
              <dt>humidity</dt>
              <dd>{Math.round(weather.humidity)}%</dd>
            </div>
          </dl>
        )}
        {error && <p className="error">Weather unavailable — {error.message}</p>}
      </div>

      <div className="hud-corner bottom-right">
        <LocationSearch onPick={onPick} />
        <button type="button" className="chip subtle" onClick={onRefresh}>
          Refresh
        </button>
        <p className="credit">Live data from Open-Meteo</p>
      </div>
    </div>
  )
}
