import type { Weather } from '../types'

// The dateline offset in ms since epoch, not from `now`, is what lets a
// browser-local `now` render as a searched city's local time.
function shifted(weather: Weather, now: Date): Date {
  return new Date(now.getTime() + weather.utcOffsetSeconds * 1000)
}

export function localClock(weather: Weather | null, now: Date): string {
  if (!weather) return '--:--'
  return shifted(weather, now).toISOString().slice(11, 16)
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function localDate(weather: Weather | null, now: Date): string {
  if (!weather) return ''
  return DATE_FORMAT.format(shifted(weather, now))
}
