import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Weather } from '../types'
import { BASE_Y, HALF_D, HALF_W, RIDGE } from './dims'

const FIELD = 9 // half-width of the volume precipitation falls through
const TOP = 11
const BOTTOM = -2.4

// Anything that reaches the roof line inside the building footprint has landed
// on the cottage, so it is recycled instead of falling on through the room.
const SHELTER_X = HALF_W + 0.36
const SHELTER_Z = HALF_D + 0.36
const ROOF_Y = BASE_Y + RIDGE

const sheltered = (x: number, y: number, z: number): boolean =>
  y < ROOF_Y && x > -SHELTER_X && x < SHELTER_X && z > -SHELTER_Z && z < SHELTER_Z

const dummy = new THREE.Object3D()

interface Drop {
  x: number
  y: number
  z: number
  speed: number
  phase: number
  sway: number
}

// Meteorological wind direction is where the wind comes FROM, so the travel
// vector is the opposite. +Z is south in this scene, +X is east.
function windVector(speed: number, degrees: number): THREE.Vector3 {
  const radians = (degrees * Math.PI) / 180
  return new THREE.Vector3(-Math.sin(radians), 0, Math.cos(radians)).multiplyScalar(speed)
}

function seed(): Drop {
  return {
    x: (Math.random() - 0.5) * FIELD * 2,
    y: BOTTOM + Math.random() * (TOP - BOTTOM),
    z: (Math.random() - 0.5) * FIELD * 2,
    speed: 0.7 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    sway: 0.4 + Math.random() * 0.8,
  }
}

function respawn(drop: Drop): void {
  drop.y = TOP
  drop.x = (Math.random() - 0.5) * FIELD * 2
  drop.z = (Math.random() - 0.5) * FIELD * 2
}

function useDrops(count: number): Drop[] {
  return useMemo(() => Array.from({ length: count }, seed), [count])
}

interface FallProps {
  count: number
  wind: THREE.Vector3
  opacity: number
}

function Rain({ count, wind, opacity }: FallProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const drops = useDrops(count)
  const tilt = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    mesh.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }, [count])

  useFrame((_, delta) => {
    const instanced = mesh.current
    if (!instanced) return

    const step = Math.min(delta, 0.05)
    // Rain leans into the wind: the streak is drawn along its own velocity.
    tilt.set(wind.x * 0.35, -14, wind.z * 0.35)
    const pitch = Math.atan2(Math.hypot(tilt.x, tilt.z), Math.abs(tilt.y))
    const yaw = Math.atan2(tilt.x, tilt.z)

    drops.forEach((drop, index) => {
      drop.y -= 14 * drop.speed * step
      drop.x += wind.x * 0.35 * drop.speed * step
      drop.z += wind.z * 0.35 * drop.speed * step

      if (drop.y < BOTTOM || sheltered(drop.x, drop.y, drop.z)) respawn(drop)

      dummy.position.set(drop.x, drop.y, drop.z)
      dummy.rotation.set(pitch, yaw, 0, 'YXZ')
      dummy.scale.set(1, 0.7 + drop.speed * 0.6, 1)
      dummy.updateMatrix()
      instanced.setMatrixAt(index, dummy.matrix)
    })

    instanced.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.022, 0.42, 0.022]} />
      <meshBasicMaterial color="#cfe0ff" transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

function Snow({ count, wind, opacity }: FallProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const flakes = useDrops(count)

  useLayoutEffect(() => {
    mesh.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }, [count])

  useFrame((state, delta) => {
    const instanced = mesh.current
    if (!instanced) return

    const step = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime

    flakes.forEach((flake, index) => {
      flake.y -= 1.15 * flake.speed * step
      // Flakes wander sideways instead of falling straight, which is most of
      // what separates snow from rain visually.
      const drift = Math.sin(time * flake.sway + flake.phase) * 0.45
      flake.x += (wind.x * 0.22 + drift) * step
      flake.z += (wind.z * 0.22 + Math.cos(time * flake.sway + flake.phase) * 0.3) * step

      if (flake.y < BOTTOM || sheltered(flake.x, flake.y, flake.z)) respawn(flake)

      dummy.position.set(flake.x, flake.y, flake.z)
      dummy.rotation.set(time * flake.sway, time * flake.speed, 0)
      dummy.scale.setScalar(0.55 + flake.speed * 0.6)
      dummy.updateMatrix()
      instanced.setMatrixAt(index, dummy.matrix)
    })

    instanced.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[0.046, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

export function Precipitation({ weather }: { weather: Weather | null }) {
  const wind = useMemo(
    () => windVector(weather?.windSpeed ?? 0, weather?.windDirection ?? 0),
    [weather?.windSpeed, weather?.windDirection],
  )

  if (!weather) return null

  if (weather.kind === 'snow') {
    return <Snow count={Math.round(220 + weather.intensity * 1100)} wind={wind} opacity={0.85} />
  }

  if (weather.kind === 'rain' || weather.kind === 'storm') {
    return (
      <Rain
        count={Math.round(320 + weather.intensity * 2000)}
        wind={wind}
        opacity={weather.kind === 'storm' ? 0.5 : 0.42}
      />
    )
  }

  return null
}
