import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Coordinates, Mood, Weather } from '../types'
import type { Affordances } from './affordances'
import { auditZFight } from '../dev/auditZFight'
import { CottageModel } from './BlenderCottage'
import { Lighting } from './Lighting'
import { Precipitation } from './Precipitation'

declare global {
  interface Window {
    __auditZFight?: () => ReturnType<typeof auditZFight>
  }
}

// An orthographic camera has no field of view to widen, so the zoom itself has
// to track the viewport or the cottage runs off the edge on a phone.
const SUBJECT_SIZE = 8.4

function FitZoom() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useEffect(() => {
    const fit = Math.min(size.width, size.height * 1.15)
    camera.zoom = Math.max(24, Math.min(110, fit / SUBJECT_SIZE))
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

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
function Drift({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const target = enabled ? Math.sin(state.clock.elapsedTime * 0.08) * 0.09 : 0
    group.current.rotation.y += (target - group.current.rotation.y) * 0.02
  })

  return (
    <group ref={group} name="drift">
      {children}
    </group>
  )
}

export interface SceneProps {
  weather: Weather | null
  location: Coordinates | null
  when: Date
  mood: Mood
  affordances: Affordances
  drift?: boolean
}

export function Scene({ weather, location, when, mood, affordances, drift = true }: SceneProps) {
  // Snow settles on the platform in proportion to how hard it is coming down.
  const snowCover = weather?.kind === 'snow' ? Math.min(1, 0.35 + weather.intensity * 0.6) : 0

  return (
    <Canvas
      // R3F's default is PCFSoftShadowMap, which three r186 removed; it warns
      // and silently falls back to this. Asking for it directly is the same
      // picture without the warning.
      shadows={{ type: THREE.PCFShadowMap }}
      orthographic
      camera={{ position: [14, 16, 14], zoom: 78, near: -120, far: 240 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
    >
      <FitZoom />
      <ZFightAudit />
      <Atmosphere mood={mood} />
      <Lighting
        mood={mood}
        weather={weather}
        when={when}
        latitude={location?.latitude ?? 0}
        longitude={location?.longitude ?? 0}
      />

      <Drift enabled={drift}>
        <CottageModel
          mood={mood}
          affordances={affordances}
          snowCover={snowCover}
          smoke={weather ? weather.temperature < 22 : true}
        />
        <Precipitation weather={weather} />
        <ContactShadows position={[0, -2.1, 0]} opacity={0.5} scale={14} blur={2.4} far={5} resolution={1024} />
      </Drift>

      <OrbitControls
        target={[0, 0.6, 0]}
        enablePan={false}
        enableZoom
        minZoom={22}
        maxZoom={130}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.9}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  )
}
