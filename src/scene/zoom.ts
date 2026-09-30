// The zoom control works in multiples of whatever "fits this viewport", so one
// step means the same thing on a phone as it does on a desktop.
export const ZOOM_MIN = 0.7
export const ZOOM_MAX = 2.2
export const ZOOM_STEP = 1.25

export function clampZoom(level: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level))
}
