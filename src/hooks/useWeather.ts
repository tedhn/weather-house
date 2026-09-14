import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWeather } from '../lib/openMeteo'
import { reverseGeocode } from '../lib/reverseGeocode'
import type { Coordinates, Weather } from '../types'

const REFRESH_MS = 5 * 60 * 1000

export interface WeatherState {
  weather: Weather | null
  error: Error | null
  loading: boolean
  refresh: () => void
}

export function useWeather(location: Coordinates | null): WeatherState {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const latitude = location?.latitude
  const longitude = location?.longitude

  const load = useCallback(async () => {
    if (latitude === undefined || longitude === undefined) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      setWeather(await fetchWeather({ latitude, longitude, signal: controller.signal }))
      setError(null)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause : new Error(String(cause)))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [latitude, longitude])

  useEffect(() => {
    setLoading(true)
    void load()
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => {
      clearInterval(timer)
      controllerRef.current?.abort()
    }
  }, [load])

  return { weather, error, loading, refresh: () => void load() }
}

const FALLBACK: Coordinates = {
  name: 'Kuala Lumpur',
  region: 'Malaysia',
  latitude: 3.139,
  longitude: 101.6869,
}

export function useInitialLocation(): [Coordinates | null, (next: Coordinates) => void] {
  const [location, setLocation] = useState<Coordinates | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(FALLBACK)
      return
    }

    const controller = new AbortController()
    let settled = false

    const finish = (value: Coordinates) => {
      if (settled) return
      settled = true
      setLocation(value)
    }

    const timer = setTimeout(() => finish(FALLBACK), 6000)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timer)
        const { latitude, longitude } = position.coords

        // Show the cottage the moment we have coordinates. The city name lands
        // a beat later without holding up the forecast.
        finish({ name: '', region: '', latitude, longitude, isCurrent: true })

        try {
          const place = await reverseGeocode(latitude, longitude, controller.signal)
          setLocation({ ...place, latitude, longitude, isCurrent: true })
        } catch {
          // Aborted on unmount; nothing to do.
        }
      },
      () => {
        clearTimeout(timer)
        finish(FALLBACK)
      },
      { timeout: 5000, maximumAge: 600000 },
    )

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return [location, setLocation]
}
