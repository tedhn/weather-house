import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { Object3D } from 'three'
import { Cottage, type CottageProps } from './Cottage'
import { BASE_Y, MODEL_SCALE } from './dims'
import { Focusable } from './Focusable'
import { SCREENS } from './screen'
import { useRoomMotion } from './roomMotion'

// The cottage is the Blender export in public/models by default. Point
// VITE_COTTAGE_MODEL at another glTF to swap it, or set it empty to use the
// procedural cottage. Everything else -- lighting, weather, camera -- keeps
// working, because none of it reads the cottage geometry.
const MODEL_URL = import.meta.env.VITE_COTTAGE_MODEL ?? '/models/cozy_room.glb'

// The middle of the monitor's glass in the export's own space, read off the
// Screen object in cozy_room.blend (Blender's Z-up turned Y-up). The panel
// faces +X, out toward the chair.
const MONITOR_GLASS: [number, number, number] = [-1.838, 1.61, 0.3]
const MONITOR_FACING: [number, number, number] = [0, Math.PI / 2, 0]
// The foot of the stand, from the glass. The hover swell grows from here, so
// the stand stays planted on the desk instead of sinking into it.
const MONITOR_FOOT: [number, number, number] = [0, -0.6, 0]

// Focusable wants its origin on the glass with +Z out of it, and the export
// only has the whole monitor piece, origin at its foot. So the Focusable stands
// on the glass and the piece hangs back inside it, moved by exactly the inverse
// of where the Focusable stands -- it lands where it already was, and is now
// what the click, the hover swell and the rig all key off. No hotspot: the
// lit screen already pulls the eye, the same as the fire.
function MonitorFocus({ monitor }: { monitor: Object3D }) {
  const spec = SCREENS.monitor
  return (
    <Focusable
      label={spec.label}
      screen="monitor"
      position={MONITOR_GLASS}
      rotation={MONITOR_FACING}
      growFrom={MONITOR_FOOT}
      hotspot={false}
    >
      <group rotation={[0, -Math.PI / 2, 0]}>
        <group position={MONITOR_GLASS.map((value) => -value) as [number, number, number]}>
          <primitive object={monitor} />
        </group>
      </group>
    </Focusable>
  )
}

function LoadedModel({ url, utcOffsetSeconds }: { url: string; utcOffsetSeconds: number }) {
  const { scene } = useGLTF(url)
  useRoomMotion(scene, utcOffsetSeconds)

  // Looked up once and kept on the scene: useGLTF caches the scene, and after
  // the first mount the monitor lives under the Focusable rather than as one
  // of the scene's own children.
  const monitor = useMemo(
    () => (scene.userData.monitor ??= scene.getObjectByName('Monitor')) as Object3D | undefined,
    [scene],
  )

  // Blender exports its preview lights too, and its watts come through as
  // intensities that blow the room out to white. The scene lights itself.
  const lights: Object3D[] = []
  scene.traverse((node) => {
    if ((node as { isLight?: boolean }).isLight) lights.push(node)
    if (!(node as { isMesh?: boolean }).isMesh) return
    node.castShadow = true
    node.receiveShadow = true
  })
  for (const light of lights) light.removeFromParent()

  return (
    <primitive object={scene} scale={MODEL_SCALE} position={[0, BASE_Y, 0]}>
      {monitor && <MonitorFocus monitor={monitor} />}
    </primitive>
  )
}

export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// Mounts only once everything beside it in the tree has stopped suspending, so
// its effect is the signal that the room is actually on screen.
function Ready({ onReady }: { onReady?: (() => void) | undefined }) {
  useEffect(() => onReady?.(), [onReady])
  return null
}

export function CottageModel({
  onReady,
  utcOffsetSeconds = 0,
  ...props
}: CottageProps & {
  onReady?: (() => void) | undefined
  /** Where the clock on the wall reads its time from. */
  utcOffsetSeconds?: number | undefined
}) {
  const procedural = (
    <>
      <Cottage {...props} />
      <Ready onReady={onReady} />
    </>
  )

  if (!MODEL_URL) return procedural

  // Nothing stands in while the export downloads: showing the procedural
  // cottage first reads as the old room flashing past. App covers the gap
  // with a loading screen instead, and the procedural one is kept for a
  // model that fails to load at all.
  return (
    <ModelErrorBoundary fallback={procedural}>
      <Suspense fallback={null}>
        <LoadedModel url={MODEL_URL} utcOffsetSeconds={utcOffsetSeconds} />
        <Ready onReady={onReady} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

if (MODEL_URL) useGLTF.preload(MODEL_URL)
