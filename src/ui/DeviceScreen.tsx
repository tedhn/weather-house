import type { CSSProperties, ReactNode } from 'react'
import type { ScreenKind } from '../scene/focus'
import { SCREENS } from '../scene/screen'
import type { Mood, Weather } from '../types'

/** Both overlays take exactly these -- kept as one type so a prop added to one
    device's screen is a prop added to both, on purpose, in one place. */
export interface DeviceScreenSharedProps {
  /** focus?.kind === 'screen' */
  open: boolean
  /** The rig has settled onto the glass. */
  live: boolean
  mood: Mood
  weather: Weather | null
  when: Date
  onExit: () => void
}

interface DeviceScreenProps {
  kind: ScreenKind
  open: boolean
  live: boolean
  mood: Mood
  onExit: () => void
  children: ReactNode
}

// The wrapper both devices share, because it is identical today: the rig fits
// SCREENS[kind].frame to the viewport, so at rest the glass occupies exactly
// SCREENS[kind].fill of whichever axis binds, and a centred CSS box with the
// same fill lands on it to within a pixel or two. No projection maths, no
// reading the camera back out.
//
// The container itself never fades. Both surfaces inside it key off the same
// moment -- the rig reporting it has come to rest on the glass -- so the room
// flies past at full light for the whole dive, and only once the camera has
// stopped does it dim and hand over to the device. Going the other way the two
// leave together, on the click rather than on a camera that has yet to move.
export function DeviceScreen({ kind, open, live, mood, onExit, children }: DeviceScreenProps) {
  const spec = SCREENS[kind]

  // A flat tint of the sky reads as a grey panel and swallows the white
  // labels, especially on an overcast day where top and bottom are both pale.
  // oklab keeps every mix on the way to that indigo looking lit rather than
  // muddy, the way the same mix in sRGB would.
  const wallpaper = [
    // Edge darkening -- barely there in the middle, a deep vignette by the frame.
    `radial-gradient(120% 95% at 50% 45%, transparent 55%, color-mix(in oklab, ${mood.bottom} 35%, black) 100%)`,
    // A cooler pool low in the frame, opposite the bloom.
    `radial-gradient(50% 40% at 20% 88%, color-mix(in oklab, ${mood.bottom} 55%, #060a18), transparent 75%)`,
    // The sun's own bloom, high and off to the side.
    `radial-gradient(60% 50% at 74% 14%, color-mix(in oklab, ${mood.sun} 70%, transparent), transparent 72%)`,
    // Base: the sky's hue mixed down into a ground dark enough for white text.
    `linear-gradient(165deg, color-mix(in oklab, ${mood.top} 55%, #12142a), color-mix(in oklab, ${mood.bottom} 45%, #05060f))`,
  ].join(', ')

  const dims = {
    '--glass-fill': spec.fill,
    '--glass-aspect': spec.aspect,
    background: wallpaper,
  } as CSSProperties

  return (
    <div className={`device${open ? ' is-open' : ''}${live ? ' is-live' : ''}`} aria-hidden={!live}>
      {/* Hides the resident's head, which sits between the camera and the glass
          while the rig is still swinging round -- not needed once the rig has
          settled on the screen's own front. */}
      <div className="device-veil" onClick={() => live && onExit()} />

      <div className="device-glass" style={dims} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
