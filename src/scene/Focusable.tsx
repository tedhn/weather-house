import { useEffect, useRef, useState } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { useFocus, type FocusFrame, type ScreenKind } from './focus'
import { SCREENS } from './screen'

interface FocusableBase extends Omit<ThreeElements['group'], 'ref' | 'onClick'> {
  label: string
  /** Where the hotspot floats, relative to the group origin. Default sits on
      the aim point, which is usually buried inside the object it belongs to. */
  pin?: [number, number, number]
  /** Where the hover swell grows from, relative to the group origin. Default
      is the origin itself; something standing on a surface wants its foot, or
      the swell pushes it down through whatever it stands on. */
  growFrom?: [number, number, number]
  /** Off for things that already pull the eye on their own. One pip teaches the
      room is clickable; a pip on every object turns the diorama into a map. */
  hotspot?: boolean
}

// `frame` only makes sense for a plain look: a screen focus derives its own
// frame -- and its pitch -- from SCREENS[screen], so accepting an authored
// frame here too would be a second source of truth the registry could drift
// out of sync with. Both keys stay on every branch (just `undefined` on the
// other one) so destructuring below doesn't have to fight a rest type that
// only half-agrees on its shape.
export type FocusableProps = FocusableBase &
  ({ screen?: undefined; frame: FocusFrame } | { screen: ScreenKind; frame?: undefined })

const HOVER_SCALE = 1.07

// Anything wrapped in this can be clicked to send the camera in. Put the group
// where the camera should aim -- its origin is what ends up centred on screen.
//
// The hotspot is not decoration. A still diorama reads as a picture, so nothing
// at rest says the room answers a click, hover says it only after you already
// guessed, and a phone has no hover at all. The pip is also the hit target: the
// laptop is about fifty pixels wide on screen, which is a miss on a thumb.
export function Focusable(props: FocusableProps) {
  // screen and frame are pulled out only to keep them off the three group's
  // spread (oxlint's unused-var check wants the underscore for exactly this
  // -- a destructure that exists to strip keys, not to bind them); aimHere
  // below reads the real values back off `props`, which is what keeps the
  // compiler's link between the two alive.
  const { label, pin = [0, 0, 0], growFrom = [0, 0, 0], hotspot = true, children, screen: _screen, frame: _frame, ...groupProps } =
    props
  const group = useRef<Group>(null)
  const body = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const { focus, setFocus } = useFocus()

  // A cursor set on hover outlives the component unless it is cleared here.
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  // Inside a close-up the HUD already offers the way out, and every other pip
  // is pointing at something off screen.
  const stowed = focus !== null

  // Eased rather than snapped, so the object swells under the pointer instead
  // of popping. This is the part that makes the object itself feel live; the
  // pip only advertises it.
  //
  // The swell drops on the way in. A stowed pip stops taking pointer events, so
  // its leave never fires and the object would hold the hover size for the whole
  // close-up -- seven percent nobody sees across the room, and seven percent of
  // the frame once the camera is in.
  useFrame(() => {
    if (!body.current) return
    const target = hovered && !stowed ? HOVER_SCALE : 1
    body.current.scale.setScalar(body.current.scale.x + (target - body.current.scale.x) * 0.18)
  })

  const enter = () => {
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const leave = () => {
    setHovered(false)
    document.body.style.cursor = ''
  }

  const aimHere = () => {
    if (!group.current) return
    // Reading off `props` rather than a destructured local: a truthiness
    // check on `props.screen` narrows `props` itself to whichever branch, so
    // `props.frame` on the look arm comes back as `FocusFrame`, not
    // `FocusFrame | undefined`.
    if (props.screen) {
      const spec = SCREENS[props.screen]
      setFocus({
        kind: 'screen',
        object: group.current,
        frame: spec.frame,
        label,
        screen: props.screen,
        pitch: spec.pitch,
      })
    } else {
      setFocus({ kind: 'look', object: group.current, frame: props.frame, label })
    }
  }

  return (
    <group ref={group} {...groupProps}>
      <group
        ref={body}
        position={growFrom}
        onClick={(event) => {
          event.stopPropagation()
          aimHere()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          enter()
        }}
        onPointerOut={leave}
      >
        <group position={[-growFrom[0], -growFrom[1], -growFrom[2]]}>{children}</group>
      </group>

      {hotspot && (
        <Html position={pin} center zIndexRange={[10, 0]}>
          <button
            type="button"
            className={`hotspot${stowed ? ' is-stowed' : ''}`}
            aria-label={`Look at ${label}`}
            aria-hidden={stowed}
            tabIndex={stowed ? -1 : 0}
            onClick={(event) => {
              event.stopPropagation()
              aimHere()
            }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-label">{label}</span>
          </button>
        </Html>
      )}
    </group>
  )
}
