// Solar position (NOAA / Meeus low-precision algorithm).
// Returns altitude + azimuth in radians for a given instant and location.

const RAD = Math.PI / 180
const DAY_MS = 86400000
const J1970 = 2440588
const J2000 = 2451545
const OBLIQUITY = RAD * 23.4397

const toDays = (date: Date): number => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000

const solarMeanAnomaly = (days: number): number => RAD * (357.5291 + 0.98560028 * days)

function eclipticLongitude(anomaly: number): number {
  const centre =
    RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly))
  const perihelion = RAD * 102.9372
  return anomaly + centre + perihelion + Math.PI
}

const declination = (longitude: number): number => Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude))

const rightAscension = (longitude: number): number =>
  Math.atan2(Math.sin(longitude) * Math.cos(OBLIQUITY), Math.cos(longitude))

const siderealTime = (days: number, westLongitude: number): number =>
  RAD * (280.16 + 360.9856235 * days) - westLongitude

export interface SunPosition {
  /** Radians from due south, increasing westward. */
  azimuth: number
  /** Radians above the horizon; negative after sunset. */
  altitude: number
}

export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const westLongitude = RAD * -longitude
  const phi = RAD * latitude
  const days = toDays(date)

  const anomaly = solarMeanAnomaly(days)
  const eclipticLong = eclipticLongitude(anomaly)
  const dec = declination(eclipticLong)
  const hourAngle = siderealTime(days, westLongitude) - rightAscension(eclipticLong)

  return {
    azimuth: Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi),
    ),
    altitude: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)),
  }
}

export interface SunVector extends SunPosition {
  position: [number, number, number]
}

/** Scene-space direction of the sun. +Z is south, +Y is up. */
export function sunVector(
  date: Date,
  latitude: number,
  longitude: number,
  distance = 30,
): SunVector {
  const { azimuth, altitude } = sunPosition(date, latitude, longitude)
  const horizontal = Math.cos(altitude)
  return {
    altitude,
    azimuth,
    position: [
      distance * horizontal * Math.sin(azimuth),
      distance * Math.sin(altitude),
      distance * horizontal * Math.cos(azimuth),
    ],
  }
}
