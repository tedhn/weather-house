// The scene only ever branches on these seven groups, so every WMO code is
// folded into one of them at the API boundary.
export type ConditionKind = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'snow' | 'storm'

export type Phase = 'day' | 'night'

export interface Condition {
  label: string
  kind: ConditionKind
  /** 0-1, how hard the condition is coming down. */
  intensity: number
}

export interface Weather extends Condition {
  latitude: number
  longitude: number
  timezone: string
  utcOffsetSeconds: number
  observedAt: Date
  temperature: number
  apparentTemperature: number
  humidity: number
  isDay: boolean
  precipitation: number
  snowfall: number
  /** 0-1, not a percentage. */
  cloudCover: number
  /** Metres per second. */
  windSpeed: number
  /** Degrees the wind blows FROM, the meteorological convention. */
  windDirection: number
  pressure: number
  code: number
}

export interface Place {
  id: number
  name: string
  region: string
  latitude: number
  longitude: number
}

/** Where the cottage is standing. A geocoded Place also satisfies this. */
export interface Coordinates {
  /** Empty while the city name is still being resolved. */
  name: string
  region: string
  latitude: number
  longitude: number
  /** True when this came from the browser rather than a search. */
  isCurrent?: boolean
}

export interface Mood {
  /** Sky gradient, top to bottom. */
  top: string
  bottom: string
  sun: string
  sunIntensity: number
  ambient: string
  ambientIntensity: number
  /** FogExp2 density. */
  fog: number
  kind: ConditionKind
  phase: Phase
  interiorIntensity: number
}
