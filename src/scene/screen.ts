import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FocusFrame, ScreenKind } from './focus'
import type { PersonPose } from './Person'

// Shared between each device's own geometry (Furniture.tsx) and the DOM
// overlay that lands on top of it (DeviceScreen.tsx and friends) -- one set of
// numbers per device, so the CSS panel can never drift out of step with the
// glass it is standing in for.
export interface ScreenSpec {
  /** Glass width, in cottage units. */
  width: number
  /** Glass height, in cottage units. */
  height: number
  /** How far the panel leans back off vertical, in radians. */
  tilt: number
  /** How far above the glass normal the rig stands, in radians. Dead on,
      whoever is sitting at the device covers the middle of it. Rising clears
      them, and an orthographic camera still projects the glass as an exact
      rectangle -- only its aspect changes, by cos(pitch). */
  pitch: number
  /** How much of the viewport the glass claims once the camera is in. The rest
      is the sliver of room left around the edges, which is what keeps the
      close-up reading as a machine on a desk rather than a web page. */
  fill: number
  /** The resident's pose while this device is showing -- lives on the device
      because the pose is a property of what the room displays, not a knob on
      the figure itself. */
  pose: PersonPose
  /** Hotspot text, e.g. "the laptop". */
  label: string
  /** HUD exit-chip text, e.g. "Leave the desktop". */
  exitLabel: string
  /** The glass's height as the pitched camera sees it. */
  viewHeight: number
  /** width / viewHeight -- what the DOM overlay renders at. */
  aspect: number
  /** The world-space box the camera fits the glass into once focused. */
  frame: FocusFrame
}

/** The numbers a device author actually picks. Everything else on ScreenSpec
    is computed from these by `buildScreen`, so a new device can't drift by
    hand-deriving viewHeight/aspect/frame slightly wrong. */
type ScreenAuthored = Pick<
  ScreenSpec,
  'width' | 'height' | 'tilt' | 'pitch' | 'fill' | 'pose' | 'label' | 'exitLabel'
>

function buildScreen(authored: ScreenAuthored): ScreenSpec {
  const viewHeight = authored.height * Math.cos(authored.pitch)
  const aspect = authored.width / viewHeight
  const frame: FocusFrame = [authored.width / authored.fill, viewHeight / authored.fill]
  return { ...authored, viewHeight, aspect, frame }
}

export const SCREENS: Record<ScreenKind, ScreenSpec> = {
  mac: buildScreen({
    width: 0.48,
    height: 0.3,
    tilt: 0.32,
    pitch: 0.44,
    fill: 0.86,
    pose: 'typing',
    label: 'the laptop',
    exitLabel: 'Leave the desktop',
  }),
  // The phone is turned toward the room camera rather than toward the
  // resident's face, so nothing stands between the glass and the rig. With
  // no torso to clear, pitch drops to almost nothing, and since the glass
  // squashes by cos(pitch) the panel renders at very nearly a true portrait
  // ratio.
  ios: buildScreen({
    width: 0.14,
    height: 0.31,
    tilt: 0.6,
    pitch: 0.15,
    fill: 0.86,
    pose: 'holding',
    label: 'the phone',
    exitLabel: 'Leave the phone',
  }),
}

/** Mirrors the `@media (max-width: 620px)` breakpoint in index.css -- the room
    and the HUD reflow at the same width the desk swaps its device, so the
    scene never shows a phone next to HUD chrome still laid out for a desktop
    (or the other way round). */
export const PHONE_MAX_WIDTH = 620

// One MediaQueryList for the whole app, built on first use rather than at
// import time so the module stays loadable without a DOM. useSyncExternalStore
// calls the snapshot on every render of every consumer, and matchMedia parses
// its query string each time it is called.
let query: MediaQueryList | null = null

function phoneQuery(): MediaQueryList {
  query ??= window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`)
  return query
}

function subscribe(callback: () => void): () => void {
  const media = phoneQuery()
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function snapshot(): ScreenKind {
  return phoneQuery().matches ? 'ios' : 'mac'
}

/** The one place width turns into a device. Everything downstream reads a
    ScreenKind, never innerWidth, so a third breakpoint is a change here and
    nowhere else. */
export function useViewportScreen(): ScreenKind {
  return useSyncExternalStore(subscribe, snapshot)
}

// R3F's Canvas runs its own reconciler, separate from the DOM tree App.tsx
// renders into -- a context provided above the Canvas does not reach inside
// it. This provider has to sit inside the Canvas, next to FocusContext.
export const ScreenContext = createContext<ScreenKind>('mac')

export function useScreenKind(): ScreenKind {
  return useContext(ScreenContext)
}
