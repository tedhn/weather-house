import type { Condition, ConditionKind, Place, Weather } from '../types'

// Open-Meteo client. No API key, no rate limit for light use.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'pressure_msl',
] as const

// WMO 4677 weather codes, grouped into what the scene actually has to draw.
const CODES: Record<number, Condition> = {
  0: { label: 'Clear sky', kind: 'clear', intensity: 0 },
  1: { label: 'Mainly clear', kind: 'clear', intensity: 0.25 },
  2: { label: 'Partly cloudy', kind: 'cloudy', intensity: 0.5 },
  3: { label: 'Overcast', kind: 'overcast', intensity: 1 },
  45: { label: 'Fog', kind: 'fog', intensity: 0.7 },
  48: { label: 'Rime fog', kind: 'fog', intensity: 1 },
  51: { label: 'Light drizzle', kind: 'rain', intensity: 0.2 },
  53: { label: 'Drizzle', kind: 'rain', intensity: 0.3 },
  55: { label: 'Heavy drizzle', kind: 'rain', intensity: 0.45 },
  56: { label: 'Freezing drizzle', kind: 'rain', intensity: 0.35 },
  57: { label: 'Freezing drizzle', kind: 'rain', intensity: 0.5 },
  61: { label: 'Light rain', kind: 'rain', intensity: 0.4 },
  63: { label: 'Rain', kind: 'rain', intensity: 0.65 },
  65: { label: 'Heavy rain', kind: 'rain', intensity: 1 },
  66: { label: 'Freezing rain', kind: 'rain', intensity: 0.6 },
  67: { label: 'Freezing rain', kind: 'rain', intensity: 0.9 },
  71: { label: 'Light snow', kind: 'snow', intensity: 0.3 },
  73: { label: 'Snow', kind: 'snow', intensity: 0.6 },
  75: { label: 'Heavy snow', kind: 'snow', intensity: 1 },
  77: { label: 'Snow grains', kind: 'snow', intensity: 0.35 },
  80: { label: 'Light showers', kind: 'rain', intensity: 0.45 },
  81: { label: 'Showers', kind: 'rain', intensity: 0.7 },
  82: { label: 'Violent showers', kind: 'rain', intensity: 1 },
  85: { label: 'Snow showers', kind: 'snow', intensity: 0.5 },
  86: { label: 'Heavy snow showers', kind: 'snow', intensity: 0.9 },
  95: { label: 'Thunderstorm', kind: 'storm', intensity: 0.8 },
  96: { label: 'Thunderstorm, hail', kind: 'storm', intensity: 1 },
  99: { label: 'Thunderstorm, heavy hail', kind: 'storm', intensity: 1 },
}

const UNKNOWN: Condition = { label: 'Unknown', kind: 'cloudy', intensity: 0.5 }

export function describeCode(code: number | undefined): Condition {
  if (code === undefined) return UNKNOWN
  return CODES[code] ?? UNKNOWN
}

export const CONDITION_KINDS: readonly ConditionKind[] = [
  'clear',
  'cloudy',
  'overcast',
  'fog',
  'rain',
  'snow',
  'storm',
]

interface CurrentResponse {
  time?: string
  temperature_2m?: number
  apparent_temperature?: number
  relative_humidity_2m?: number
  is_day?: number
  precipitation?: number
  snowfall?: number
  weather_code?: number
  cloud_cover?: number
  wind_speed_10m?: number
  wind_direction_10m?: number
  pressure_msl?: number
}

interface ForecastResponse {
  latitude: number
  longitude: number
  timezone: string
  utc_offset_seconds?: number
  current?: CurrentResponse
}

export interface FetchWeatherOptions {
  latitude: number
  longitude: number
  signal?: AbortSignal
}

export async function fetchWeather({
  latitude,
  longitude,
  signal,
}: FetchWeatherOptions): Promise<Weather> {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', CURRENT_FIELDS.join(','))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('wind_speed_unit', 'ms')

  const response = await fetch(url, signal ? { signal } : {})
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`)

  const data = (await response.json()) as ForecastResponse
  const current = data.current ?? {}

  return {
    ...describeCode(current.weather_code),
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds ?? 0,
    observedAt: current.time ? new Date(`${current.time}Z`) : new Date(),
    temperature: current.temperature_2m ?? 0,
    apparentTemperature: current.apparent_temperature ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    isDay: current.is_day === 1,
    precipitation: current.precipitation ?? 0,
    snowfall: current.snowfall ?? 0,
    cloudCover: (current.cloud_cover ?? 0) / 100,
    windSpeed: current.wind_speed_10m ?? 0,
    windDirection: current.wind_direction_10m ?? 0,
    pressure: current.pressure_msl ?? 0,
    code: current.weather_code ?? -1,
  }
}

interface GeocodeResult {
  id: number
  name: string
  admin1?: string
  country?: string
  latitude: number
  longitude: number
}

export async function searchPlaces(
  name: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Place[]> {
  if (!name.trim()) return []

  const url = new URL(GEOCODE_URL)
  url.searchParams.set('name', name)
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'en')

  const response = await fetch(url, signal ? { signal } : {})
  if (!response.ok) throw new Error(`Geocoding responded ${response.status}`)

  const data = (await response.json()) as { results?: GeocodeResult[] }
  return (data.results ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    region: [place.admin1, place.country].filter(Boolean).join(', '),
    latitude: place.latitude,
    longitude: place.longitude,
  }))
}
