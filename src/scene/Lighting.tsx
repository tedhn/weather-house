import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import type { DirectionalLight, AmbientLight } from 'three'
import { sunVector } from '../lib/sun'
import type { Mood, Weather } from '../types'

export interface LightningState {
  next: number
  value: number
  burst: number
}

// What you notice in a real storm is the room lighting up, so the flash is
// the lights' job. Weather.tsx hangs a bolt under a cloud for as long as it
// lasts.
function useLightning(current: LightningState, active: boolean): void {
  useFrame((_, delta) => {
    if (!active) {
      current.value = 0
      return
    }

    current.next -= delta
    if (current.next <= 0) {
      current.burst = 0.18 + Math.random() * 0.12
      current.next = 3 + Math.random() * 9
    }

    if (current.burst > 0) {
      current.burst -= delta
      // Double-strike: the flicker inside the flash is what sells it.
      current.value = current.burst > 0 ? (Math.random() > 0.35 ? 1 : 0.25) : 0
    } else {
      current.value = 0
    }
  })
}

export interface LightingProps {
  mood: Mood
  weather: Weather | null
  when: Date
  latitude: number
  longitude: number
  lightning: LightningState
}

export function Lighting({ mood, weather, when, latitude, longitude, lightning }: LightingProps) {
  const sun = useMemo(() => sunVector(when, latitude, longitude, 26), [when, latitude, longitude])

  const key = useRef<DirectionalLight>(null)
  const fill = useRef<AmbientLight>(null)
  const bolt = useRef<DirectionalLight>(null)
  useLightning(lightning, weather?.kind === 'storm')

  // Thick cloud both dims the sun and spreads it, so the key light drops while
  // the ambient fill climbs.
  const cover = weather?.cloudCover ?? 0
  const keyIntensity = mood.sunIntensity * (1 - cover * 0.55)
  const fillIntensity = mood.ambientIntensity * (1 + cover * 0.35)

  useFrame(() => {
    if (bolt.current) bolt.current.intensity = lightning.value * 6
    if (key.current) key.current.intensity = keyIntensity + lightning.value * 1.5
    if (fill.current) fill.current.intensity = fillIntensity
  })

  // Below the horizon the sun would light the scene from underneath, so it is
  // parked just above it and dimmed by the night mood instead.
  const elevated = Math.max(sun.position[1], 6)

  // Flat ambient light leaves PBR surfaces looking like cardboard. A small
  // environment built from the mood's own colours gives them soft, directional
  // fill: sky from above, a warm bounce off the floor, ambient from the sides.
  // Built locally from Lightformers so nothing is fetched from a CDN.
  const envIntensity = (mood.phase === 'night' ? 0.35 : 0.6) * (1 + cover * 0.25)

  return (
    <>
      <Environment key={`${mood.kind}-${mood.phase}`} resolution={64} environmentIntensity={envIntensity}>
        <Lightformer form="rect" color={mood.top} intensity={1.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={12} />
        <Lightformer form="rect" color={mood.bottom} intensity={0.6} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={12} />
        <Lightformer form="ring" color="#ffcf9e" intensity={mood.interiorIntensity * 0.5} position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={4} />
        <Lightformer form="rect" color={mood.ambient} intensity={0.8} position={[6, 1, 0]} rotation-y={-Math.PI / 2} scale={[12, 6, 1]} />
        <Lightformer form="rect" color={mood.ambient} intensity={0.8} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[12, 6, 1]} />
      </Environment>
      <ambientLight ref={fill} color={mood.ambient} intensity={fillIntensity} />
      <hemisphereLight args={[mood.top, mood.bottom, 0.3]} />
      <directionalLight
        ref={key}
        color={mood.sun}
        intensity={keyIntensity}
        position={[sun.position[0], elevated, sun.position[2]]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
      />
      <directionalLight ref={bolt} color="#dfe6ff" intensity={0} position={[6, 16, 10]} />
      {/* Cool rim from the opposite side keeps the cutaway edges readable. */}
      <directionalLight color={mood.top} intensity={0.28} position={[-9, 5, -8]} />
    </>
  )
}
