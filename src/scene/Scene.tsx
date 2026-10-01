import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { Coordinates, Mood, Weather } from '../types'
import { auditZFight } from '../dev/auditZFight'
import { CottageModel } from './BlenderCottage'
import {
  FocusContext,
  type FocusControls,
  type FocusFrame,
  type FocusRequest,
  type ScreenKind,
  type SetFocus,
} from './focus'
import { Lighting } from './Lighting'
import { Precipitation } from './Precipitation'
import { ScreenContext } from './screen'

declare global {
  interface Window {
    __auditZFight?: () => ReturnType<typeof auditZFight>
  }
}

// An orthographic camera has no field of view to widen, so the zoom itself has
// to track the viewport or the cottage runs off the edge on a phone. The room
// is a box fit like any other focus frame, just one the wide shot clamps.
const ROOM_FRAME: FocusFrame = [7.5, 7.2]

// The cottage's origin sits above its plinth, so aiming at it leaves the walls
// crowding the top of the frame and empty floor below. Aiming a little higher
// centres the room's silhouette instead.
const ROOM_AIM = new THREE.Vector3(0, 0.7, 0)

function zoomFor(size: { width: number; height: number }, frame: FocusFrame): number {
  return Math.min(size.width / frame[0], size.height / frame[1])
}

// Where the camera sits relative to whatever it is framing, and how far that
// stand is from the aim point -- fixed, so swinging around an object keeps
// the same distance the room shot uses.
const HOME = new THREE.Vector3(14, 11, 14)
const RANGE = HOME.length()

// How close counts as at rest, measured in what the viewer can actually see:
// the aim point within this many pixels of the centre of the frame, the zoom
// within this fraction of its target, the stand within this many radians of
// where it wants to be.
//
// Pixels rather than cottage units, because an orthographic camera turns one
// unit into `zoom` pixels and the close-up zoom is some thirty times the room's
// -- a twentieth of a unit is invisible across the room and a hundred pixels
// of drift once the camera is inside the laptop, which is a desktop sliding
// into place rather than one already there.
const AT_REST = { pixels: 2, angle: 0.005, zoom: 0.002 }

// Arrival is called once the rig is actually at rest, not ahead of it: the
// dive reads as one move that finishes, and only then does the desktop wake.
// Waking it early means fading a flat CSS panel in over a camera that is still
// travelling, so the panel and the glass it stands in for slide apart for the
// length of the fade -- which is exactly the seam the overlay exists to hide.

function CameraRig({
  level,
  focus,
  onArrive,
}: {
  level: number
  focus: FocusRequest | null
  onArrive?: ((arrived: boolean) => void) | undefined
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const { width, height } = size

  const roomZoom = useMemo(
    () => Math.max(24, Math.min(160, zoomFor({ width, height }, ROOM_FRAME))),
    [width, height],
  )

  const aim = useRef(new THREE.Vector3())
  const eased = useRef(new THREE.Vector3())
  const want = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const stand = useRef(HOME.clone())
  const wasArrived = useRef(false)

  // A focus change invalidates whatever the last frame reported, before the
  // rig has taken a single step toward the new target.
  useEffect(() => {
    wasArrived.current = false
    onArrive?.(false)
  }, [focus, onArrive])

  // Eased rather than snapped, so the diorama glides in instead of cutting to
  // a new size. The room shot only ever translates -- HOME is a fixed offset
  // from the aim point -- but swinging onto a screen has to turn as well, so
  // the rig eases where it *stands* in addition to what it is looking at.
  useFrame(() => {
    if (focus) focus.object.getWorldPosition(aim.current)
    else aim.current.copy(ROOM_AIM)
    eased.current.lerp(aim.current, 0.09)

    if (focus?.kind === 'screen') {
      // Dead on the normal, whoever is sitting at the screen covers the
      // middle of it. Rising above it clears them; an orthographic camera
      // still projects the glass as an exact rectangle from up here, only
      // its aspect changes (SCREENS[kind].aspect already bakes that in).
      focus.object.getWorldDirection(want.current)
      right.current.setFromMatrixColumn(focus.object.matrixWorld, 0).normalize()
      want.current.applyAxisAngle(right.current, -focus.pitch).setLength(RANGE)
    } else {
      want.current.copy(HOME)
    }
    stand.current.lerp(want.current, 0.07).setLength(RANGE)

    camera.position.copy(eased.current).add(stand.current)
    camera.lookAt(eased.current)

    // Focus frames are not clamped -- that clamp is only what stops a
    // close-up from filling a monitor, and a close-up filling the monitor is
    // the point.
    const target = focus ? zoomFor(size, focus.frame) : roomZoom * level
    const delta = target - camera.zoom
    if (Math.abs(delta) < 0.02) {
      if (delta !== 0) camera.zoom = target
    } else {
      camera.zoom += delta * 0.12
    }
    camera.updateProjectionMatrix()

    // Latched: what is being reported is that the move onto this focus
    // finished, and a move finishes once. Bounds this tight are a pixel or two
    // wide at the close-up's zoom, so anything that nudges the rig afterwards
    // -- a window resize refitting the frame, a dropped frame under load --
    // would otherwise read as un-arrival and blink the desktop out of a
    // close-up the viewer is sitting in. Only a focus change clears it, in the
    // effect above.
    if (onArrive && !wasArrived.current && focus !== null) {
      const arrived =
        eased.current.distanceTo(aim.current) * camera.zoom < AT_REST.pixels &&
        stand.current.angleTo(want.current) < AT_REST.angle &&
        Math.abs(camera.zoom - target) / target < AT_REST.zoom
      if (arrived) {
        wasArrived.current = true
        onArrive(true)
      }
    }
  })

  return null
}

// Dev only: run __auditZFight() in the console to list coplanar same-facing box
// faces, which is what shows up as a dithered shimmer on a surface.
function ZFightAudit() {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__auditZFight = () => auditZFight(scene)
  }, [scene])

  return null
}

function Atmosphere({ mood }: { mood: Mood }) {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    scene.fog = new THREE.FogExp2(new THREE.Color(mood.bottom), mood.fog)
    return () => {
      scene.fog = null
    }
  }, [scene, mood.bottom, mood.fog])

  return null
}

// Slow idle drift so the diorama never looks like a frozen screenshot.
//
// Switched off it holds wherever it had got to rather than unwinding to zero.
// Unwinding is a second move -- one the camera then has to chase for the three
// seconds it takes to run down, which is three seconds in which the rig is
// never quite on its target and the close-up never quite settles. Holding
// stops the room dead instead, at a fifth of a degree per second, which is
// nothing to look at and everything to a rig trying to come to rest.
function Drift({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current || !enabled) return
    const target = Math.sin(state.clock.elapsedTime * 0.08) * 0.09
    group.current.rotation.y += (target - group.current.rotation.y) * 0.02
  })

  return (
    <group ref={group} name="drift">
      {children}
    </group>
  )
}

// Scene works standalone in a story or a test, where nothing owns focus state.
const noFocus: SetFocus = () => {}

export interface SceneProps {
  weather: Weather | null
  location: Coordinates | null
  when: Date
  mood: Mood
  /** Which device the desk holds. Read by useViewportScreen in App.tsx and
      passed down rather than read again in here, so the whole tree agrees on
      one viewport sample per render. */
  screen?: ScreenKind
  /** Multiple of the fitted zoom, driven by the HUD control. */
  zoom?: number
  /** What the camera is framing close up, or null for the whole room. */
  focus?: FocusRequest | null
  onFocus?: SetFocus
  drift?: boolean
  /** Fires once the rig has come to rest on a focus, and again the moment it
      leaves one. Whatever wakes on it plays after the move, not across it. */
  onArrive?: (arrived: boolean) => void
}

export function Scene({
  weather,
  location,
  when,
  mood,
  screen = 'mac',
  zoom = 1,
  focus = null,
  onFocus,
  drift = true,
  onArrive,
}: SceneProps) {
  // Snow settles on the platform in proportion to how hard it is coming down.
  const snowCover = weather?.kind === 'snow' ? Math.min(1, 0.35 + weather.intensity * 0.6) : 0

  const controls = useMemo<FocusControls>(
    () => ({ focus, setFocus: onFocus ?? noFocus }),
    [focus, onFocus],
  )

  return (
    <Canvas
      // R3F's default is PCFSoftShadowMap, which three r186 removed; it warns
      // and silently falls back to this. Asking for it directly is the same
      // picture without the warning.
      shadows={{ type: THREE.PCFShadowMap }}
      orthographic
      camera={{ position: [14, 11, 14], zoom: 78, near: -120, far: 240 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
      // Clicking past everything in the room is how you get back out of a
      // close-up, so it has to land somewhere.
      onPointerMissed={() => onFocus?.(null)}
    >
      <CameraRig level={zoom} focus={focus} onArrive={onArrive} />
      <ZFightAudit />
      <Atmosphere mood={mood} />
      <Lighting
        mood={mood}
        weather={weather}
        when={when}
        latitude={location?.latitude ?? 0}
        longitude={location?.longitude ?? 0}
      />

      <FocusContext.Provider value={controls}>
        {/* R3F's Canvas is its own reconciler, so this has to sit down here
            rather than around <Scene> itself -- a provider above the Canvas
            never reaches the desk that reads it. */}
        <ScreenContext.Provider value={screen}>
          {/* Held still for the length of a close-up: the overlay lands on the
              glass in screen space, so a room still turning under it is a panel
              permanently a few pixels off the thing it is standing in for. */}
          <Drift enabled={drift && focus === null}>
            <CottageModel
              mood={mood}
              snowCover={snowCover}
              smoke={weather ? weather.temperature < 22 : true}
            />
            <Precipitation weather={weather} />
            <ContactShadows position={[0, -2.1, 0]} opacity={0.5} scale={14} blur={2.4} far={5} resolution={1024} />
          </Drift>
        </ScreenContext.Provider>
      </FocusContext.Provider>

      {/* No controls at all. The cutaway is authored for one viewing angle, and
          the wheel belongs to the page rather than the camera -- zooming is the
          HUD control's job. */}
    </Canvas>
  )
}
