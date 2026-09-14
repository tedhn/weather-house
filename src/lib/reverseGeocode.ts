// Open-Meteo's geocoding API only goes name -> coordinates, so turning the
// browser's coordinates back into a city name needs a second service.
// BigDataCloud's reverse-geocode-client endpoint is built for browser use:
// free, no key, CORS open. It receives the same coordinates the forecast
// request already carries.
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export interface PlaceName {
  name: string
  region: string
}

interface ReverseResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

/** "Asia/Kuala_Lumpur" -> "Kuala Lumpur". */
export function cityFromTimezone(timezone: string): string {
  const last = timezone.split('/').pop() ?? ''
  return last.replace(/_/g, ' ')
}

/** The browser already knows roughly where it is; no network needed. */
export function localTimezoneCity(): PlaceName {
  try {
    return { name: cityFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), region: '' }
  } catch {
    return { name: 'Here', region: '' }
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<PlaceName> {
  try {
    const url = new URL(REVERSE_URL)
    url.searchParams.set('latitude', String(latitude))
    url.searchParams.set('longitude', String(longitude))
    url.searchParams.set('localityLanguage', 'en')

    const response = await fetch(url, signal ? { signal } : {})
    if (!response.ok) throw new Error(`Reverse geocoding responded ${response.status}`)

    const data = (await response.json()) as ReverseResponse
    const name = data.city || data.locality || data.principalSubdivision
    if (!name) throw new Error('No place name in response')

    const region = [data.principalSubdivision === name ? '' : data.principalSubdivision, data.countryName]
      .filter(Boolean)
      .join(', ')

    return { name, region }
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    // A missing city name should never cost us the weather, so fall back to
    // what the browser can answer offline.
    return localTimezoneCity()
  }
}
