import type { ConditionKind, Mood, Phase, Weather } from '../types'

// Fixed cottage colours. These never change -- the mood comes from the lighting
// and the sky, the way it does in Virtual Cottage.
export const COTTAGE = {
  wallOuter: '#c98fa0',
  wallInner: '#e6bdc2',
  wallUpper: '#b57a92',
  floor: '#c68a58',
  floorUpper: '#b87a4d',
  beam: '#7d4a53',
  roof: '#6d3f5e',
  roofTrim: '#53304a',
  chimney: '#7a4a5f',
  platform: '#5d3a58',
  platformTop: '#7d5a76',
  glass: '#2b2340',
  wood: '#8d5a3c',
  woodDark: '#6a4029',
  fabric: '#4a8f8b',
  fabricWarm: '#d9776b',
  leaf: '#3f7d63',
  leafDark: '#2f6049',
  paper: '#e7d9c3',
  metal: '#4a4457',
  ember: '#ff8a3d',
  lampLight: '#ffb26b',
  screen: '#9fd6ff',
  skin: '#d9a179',
  hair: '#84543a',
  shirt: '#3e3d68',
  trousers: '#2f3050',
  boot: '#b0763c',
} as const

type MoodBase = Omit<Mood, 'kind' | 'phase' | 'interiorIntensity'>

// Sky and light per condition. Day and night are separate because the swing
// between them is far bigger than the swing between rain and overcast.
const MOODS: Record<ConditionKind, Record<Phase, MoodBase>> = {
  clear: {
    day: { top: '#7fb8e0', bottom: '#f2c6a4', sun: '#ffe3bb', sunIntensity: 2.6, ambient: '#9db8d2', ambientIntensity: 0.75, fog: 0.008 },
    night: { top: '#16224a', bottom: '#0a0f24', sun: '#9bb2ff', sunIntensity: 0.5, ambient: '#3f4d80', ambientIntensity: 0.78, fog: 0.012 },
  },
  cloudy: {
    day: { top: '#9fb8cf', bottom: '#d9cfcc', sun: '#ffeacd', sunIntensity: 2.3, ambient: '#a3b2c2', ambientIntensity: 0.62, fog: 0.014 },
    night: { top: '#1e2742', bottom: '#0f1424', sun: '#8296d8', sunIntensity: 0.42, ambient: '#434f75', ambientIntensity: 0.82, fog: 0.018 },
  },
  overcast: {
    day: { top: '#939ca7', bottom: '#c3c0bd', sun: '#e6e7e8', sunIntensity: 1.5, ambient: '#99a0a8', ambientIntensity: 0.7, fog: 0.022 },
    night: { top: '#1f242e', bottom: '#10131a', sun: '#6d78a0', sunIntensity: 0.36, ambient: '#414755', ambientIntensity: 0.84, fog: 0.026 },
  },
  fog: {
    day: { top: '#cac9c4', bottom: '#a6a49f', sun: '#eceae4', sunIntensity: 1.1, ambient: '#b4b2ad', ambientIntensity: 0.9, fog: 0.055 },
    night: { top: '#282a2e', bottom: '#181a1e', sun: '#75798c', sunIntensity: 0.3, ambient: '#52555e', ambientIntensity: 0.92, fog: 0.07 },
  },
  rain: {
    day: { top: '#657590', bottom: '#424c66', sun: '#c2cfe6', sunIntensity: 1.2, ambient: '#76849c', ambientIntensity: 0.68, fog: 0.03 },
    night: { top: '#151d2e', bottom: '#0a0e18', sun: '#5d6da8', sunIntensity: 0.32, ambient: '#3a4360', ambientIntensity: 0.84, fog: 0.038 },
  },
  snow: {
    day: { top: '#b3c6dc', bottom: '#e8edf5', sun: '#ffffff', sunIntensity: 1.3, ambient: '#c4cfdd', ambientIntensity: 0.8, fog: 0.04 },
    night: { top: '#24314f', bottom: '#131a2b', sun: '#a8b9f0', sunIntensity: 0.58, ambient: '#4d5980', ambientIntensity: 1.0, fog: 0.045 },
  },
  storm: {
    day: { top: '#3c4354', bottom: '#242935', sun: '#a5aec4', sunIntensity: 0.5, ambient: '#535a6e', ambientIntensity: 0.9, fog: 0.04 },
    night: { top: '#171c28', bottom: '#0c0e15', sun: '#5b668f', sunIntensity: 0.4, ambient: '#3d445c', ambientIntensity: 0.98, fog: 0.05 },
  },
}

// Interior lamps are always on, but they read much stronger after dark.
const INTERIOR: Record<Phase, number> = { day: 0.9, night: 2.1 }

export function moodFor(weather: Weather | null | undefined): Mood {
  const kind: ConditionKind = weather && MOODS[weather.kind] ? weather.kind : 'cloudy'
  const phase: Phase = weather?.isDay ? 'day' : 'night'

  return {
    ...MOODS[kind][phase],
    kind,
    phase,
    interiorIntensity: INTERIOR[phase],
  }
}
