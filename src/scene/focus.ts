import { createContext, useContext } from 'react'
import type { Object3D } from 'three'

/** The world-space box, in cottage units, the camera has to fit on screen. */
export type FocusFrame = [width: number, height: number]

/** The device the viewport width puts on the desk (screen.ts). Keyed rather
    than boolean so a new breakpoint is a new member of this union and a new
    SCREENS entry, not a scattered width check. */
export type ViewportScreen = 'mac' | 'ios'

/** Every surface the camera can go inside: the viewport's own device, plus
    the monitor in the Blender room, which stands there at every width. */
export type ScreenKind = ViewportScreen | 'monitor'

interface Framed {
  /** Carried as an object rather than a point so the rig keeps following it
      while the diorama drifts. */
  object: Object3D
  frame: FocusFrame
  label: string
}

/** Looked at from the room's one authored angle. */
export interface LookFocus extends Framed {
  kind: 'look'
}

/** Gone inside: the rig swings round onto the object's own +Z, which is what
    turns a lid tilted away from the camera into a readable rectangle, and the
    surface's own interface takes the frame once the camera settles. */
export interface ScreenFocus extends Framed {
  kind: 'screen'
  screen: ScreenKind
  /** How far above the screen's own normal the rig stands, in radians. Carried
      on the request rather than imported from the laptop's own constants --
      a television on a wall has nobody in front of it to clear. */
  pitch: number
}

export type FocusRequest = LookFocus | ScreenFocus

export type SetFocus = (request: FocusRequest | null) => void

/** Focusables need to read the focus as well as set it: their hotspots have to
    get out of the way once the camera is already inside a close-up. */
export interface FocusControls {
  focus: FocusRequest | null
  setFocus: SetFocus
}

export const FocusContext = createContext<FocusControls>({ focus: null, setFocus: () => {} })

export function useFocus(): FocusControls {
  return useContext(FocusContext)
}
