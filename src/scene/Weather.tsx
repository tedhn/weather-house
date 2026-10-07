import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ConditionKind, Weather as Reading } from '../types'
import { BASE_Y, MODEL_SCALE } from './dims'
import { ModelErrorBoundary } from './BlenderCottage'
import type { LightningState } from './Lighting'

const URL = '/models/weather.glb'

type Fall = 'rain' | 'snow'

// Which props are out for each condition. One table, like MOODS, so a new
// condition is a row rather than a branch in every effect.
interface Sky {
  /** How many of Cloud0..Cloud4 are out, taken in slot order. */
  clouds: number
  /** Night darkens it through the lighting, not here. */
  tint: string
  fall: Fall | null
  mist: boolean
}

const SKIES: Record<ConditionKind, Sky> = {
  clear: { clouds: 1, tint: '#ffffff', fall: null, mist: false },
  cloudy: { clouds: 3, tint: '#f6f8fb', fall: null, mist: false },
  overcast: { clouds: 5, tint: '#c9ced8', fall: null, mist: false },
  fog: { clouds: 2, tint: '#dfe2e6', fall: null, mist: true },
  rain: { clouds: 4, tint: '#c3cad8', fall: 'rain', mist: false },
  snow: { clouds: 4, tint: '#f3f6fb', fall: 'snow', mist: false },
  storm: { clouds: 5, tint: '#6f788c', fall: 'rain', mist: false },
}

const FIELD = 9 // half-width of the volume precipitation falls through
const TOP = 11
const BOTTOM = -1.7
const RAIN_SPEED = 9
const MIST_OPACITY = 0.7
// Lit only by a rain sky, a cloud goes the same slate as the sky behind it
// and disappears. Glowing faintly in its own colour keeps it a shade lighter
// than the sky, the way a painted cloud is.
const CLOUD_GLOW = 0.35

const dummy = new THREE.Object3D()
const tint = new THREE.Color()
const UP = new THREE.Vector3(0, 1, 0)

/** Frame-rate independent ease that settles in about a second. */
const ease = (delta: number): number => 1 - Math.exp(-delta * 4)

// Meteorological wind direction is where the wind comes FROM, so the travel
// vector is the opposite. +Z is south in this scene, +X is east.
function windVector(speed: number, degrees: number): THREE.Vector3 {
  const radians = (degrees * Math.PI) / 180
  return new THREE.Vector3(-Math.sin(radians), 0, Math.cos(radians)).multiplyScalar(speed)
}

interface Point {
  u: number
  v: number
}

const cross = (o: Point, a: Point, b: Point): number => (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u)

// From this camera everything inside the room's silhouette is either in front
// of an open side, where weather would cover the interior, or behind a wall,
// where it is hidden anyway. So a 2D test against the silhouette is exact
// enough, and it stays right when Drift turns the room or the camera swings
// round to the monitor, which a fixed roof-height test does not.
class ShelterView {
  private readonly corners: THREE.Vector3[] = []
  private readonly points: Point[] = Array.from({ length: 8 }, () => ({ u: 0, v: 0 }))
  private readonly hull: Point[] = Array.from({ length: 16 }, () => ({ u: 0, v: 0 }))
  private count = 0
  private readonly dir = new THREE.Vector3()
  private readonly right = new THREE.Vector3()
  private readonly up = new THREE.Vector3()
  private readonly inverse = new THREE.Matrix4()
  private readonly probe: Point = { u: 0, v: 0 }

  constructor(bounds: THREE.Box3) {
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) this.corners.push(new THREE.Vector3(x, y, z))
  }

  private project(x: number, y: number, z: number, into: Point): void {
    into.u = x * this.right.x + y * this.right.y + z * this.right.z
    into.v = x * this.up.x + y * this.up.y + z * this.up.z
  }

  update(camera: THREE.Camera, group: THREE.Object3D): void {
    group.updateWorldMatrix(true, false)
    this.inverse.copy(group.matrixWorld).invert()
    camera.getWorldDirection(this.dir).transformDirection(this.inverse)

    this.right.crossVectors(UP, this.dir)
    if (this.right.lengthSq() < 1e-8) this.right.set(1, 0, 0)
    this.right.normalize()
    this.up.crossVectors(this.dir, this.right)

    this.corners.forEach((corner, index) => {
      const point = this.points[index]
      if (point) this.project(corner.x, corner.y, corner.z, point)
    })
    this.points.sort((a, b) => a.u - b.u || a.v - b.v)

    const { hull, points } = this
    let n = 0
    const push = (point: Point, floor: number) => {
      while (n >= floor) {
        const a = hull[n - 2]
        const b = hull[n - 1]
        if (!a || !b || cross(a, b, point) > 0) break
        n--
      }
      const slot = hull[n]
      if (slot) {
        slot.u = point.u
        slot.v = point.v
        n++
      }
    }
    for (const point of points) push(point, 2)
    const lower = n + 1
    for (let i = points.length - 2; i >= 0; i--) {
      const point = points[i]
      if (point) push(point, lower)
    }
    this.count = n - 1
  }

  covers(x: number, y: number, z: number): boolean {
    if (this.count < 3) return false
    this.project(x, y, z, this.probe)
    for (let i = 0; i < this.count; i++) {
      const a = this.hull[i]
      const b = this.hull[(i + 1) % this.count]
      if (!a || !b || cross(a, b, this.probe) < 0) return false
    }
    return true
  }
}

interface Drop {
  x: number
  y: number
  z: number
  speed: number
  phase: number
  sway: number
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
  template: THREE.Mesh
  count: number
  wind: THREE.Vector3
  view: ShelterView
}

// A hidden drop keeps falling with a zero scale, so it comes back into view
// below or beside the room instead of piling up.
function place(instanced: THREE.InstancedMesh, index: number, view: ShelterView, drop: Drop): void {
  if (view.covers(drop.x, drop.y, drop.z)) dummy.scale.setScalar(0)
  dummy.position.set(drop.x, drop.y, drop.z)
  dummy.updateMatrix()
  instanced.setMatrixAt(index, dummy.matrix)
}

function Rain({ template, count, wind, view }: FallProps) {
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
    // Rain leans into the wind: the drop is drawn along its own velocity.
    tilt.set(wind.x * 0.35, -RAIN_SPEED, wind.z * 0.35)
    const pitch = Math.atan2(Math.hypot(tilt.x, tilt.z), Math.abs(tilt.y))
    const yaw = Math.atan2(tilt.x, tilt.z)

    drops.forEach((drop, index) => {
      drop.y -= RAIN_SPEED * drop.speed * step
      drop.x += wind.x * 0.35 * drop.speed * step
      drop.z += wind.z * 0.35 * drop.speed * step

      if (drop.y < BOTTOM) respawn(drop)

      dummy.rotation.set(pitch, yaw, 0, 'YXZ')
      dummy.scale.set(0.7, 0.6 + drop.speed * 0.3, 0.7)
      place(instanced, index, view, drop)
    })

    instanced.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[template.geometry, template.material, count]} frustumCulled={false} />
}

function Snow({ template, count, wind, view }: FallProps) {
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

      if (flake.y < BOTTOM) respawn(flake)

      dummy.rotation.set(time * flake.sway, time * flake.speed, 0)
      dummy.scale.setScalar(0.45 + flake.speed * 0.4)
      place(instanced, index, view, flake)
    })

    instanced.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[template.geometry, template.material, count]} frustumCulled={false} />
}

interface Slot {
  mesh: THREE.Mesh
  position: THREE.Vector3
  scale: THREE.Vector3
}

interface Rig {
  root: THREE.Object3D
  clouds: Slot[]
  mist: Slot[]
  raindrop: THREE.Mesh
  snowflake: THREE.Mesh
  bolt: THREE.Mesh
  snowCap: THREE.Mesh
  bounds: THREE.Box3
  cloudMaterial: THREE.MeshStandardMaterial
  mistMaterial: THREE.MeshStandardMaterial
  boltMaterial: THREE.MeshBasicMaterial
  /** How far below its cloud the bolt's tip reaches. */
  boltReach: number
}

// weather.glb is the asset boundary: a missing node is a stale export, so it
// fails here by name instead of as a crash several frames later.
function node(root: THREE.Object3D, name: string): THREE.Mesh {
  const found = root.getObjectByName(name)
  if (!(found instanceof THREE.Mesh)) {
    throw new Error(`${URL} has no mesh named "${name}"; rebuild it with blender/build_weather.py`)
  }
  return found
}

function standard(mesh: THREE.Mesh): THREE.MeshStandardMaterial {
  if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
    throw new Error(`${URL}: ${mesh.name} needs a MeshStandardMaterial`)
  }
  return mesh.material
}

function slots(root: THREE.Object3D, prefix: string, count: number): Slot[] {
  return Array.from({ length: count }, (_, index) => {
    const mesh = node(root, `${prefix}${index}`)
    return { mesh, position: mesh.position.clone(), scale: mesh.scale.clone() }
  })
}

function buildRig(source: THREE.Object3D): Rig {
  // Cloned so the materials swapped in below never touch the cached glTF.
  const root = source.clone(true)
  root.updateMatrixWorld(true)

  const clouds = slots(root, 'Cloud', 5)
  const mist = slots(root, 'Mist', 4)
  const raindrop = node(root, 'Raindrop')
  const snowflake = node(root, 'Snowflake')
  const bolt = node(root, 'Bolt')
  const snowCap = node(root, 'SnowCap')
  const shelter = node(root, 'Shelter')

  const original = standard(node(root, 'Cloud0'))
  const cloudMaterial = original.clone()
  cloudMaterial.emissiveIntensity = CLOUD_GLOW
  const mistMaterial = cloudMaterial.clone()
  mistMaterial.emissive.copy(mistMaterial.color)
  mistMaterial.transparent = true
  mistMaterial.depthWrite = false
  mistMaterial.opacity = 0

  for (const slot of clouds) {
    slot.mesh.material = cloudMaterial
    slot.mesh.scale.setScalar(0)
  }
  for (const slot of mist) slot.mesh.material = mistMaterial

  // The templates and the shelter box are read, never drawn.
  for (const hidden of [raindrop, snowflake, shelter, bolt]) hidden.visible = false
  // A bolt is the brightest thing on screen for a fifth of a second. Lit, fogged
  // and tone mapped like the rest of the scene it comes out a dull grey, so it
  // is drawn flat in the colour it glows in Blender.
  const boltMaterial = new THREE.MeshBasicMaterial({ color: standard(bolt).emissive, fog: false, toneMapped: false })
  bolt.material = boltMaterial
  snowCap.scale.y = 0

  return {
    root,
    clouds,
    mist,
    raindrop,
    snowflake,
    bolt,
    snowCap,
    bounds: new THREE.Box3().setFromObject(shelter),
    cloudMaterial,
    mistMaterial,
    boltMaterial,
    boltReach: -new THREE.Box3().setFromObject(bolt).min.y,
  }
}

interface WeatherProps {
  weather: Reading | null
  snowCover: number
  lightning: LightningState
}

function Props({ weather, snowCover, lightning }: WeatherProps) {
  const gltf = useGLTF(URL)
  const rig = useMemo(() => buildRig(gltf.scene), [gltf.scene])
  const view = useMemo(() => new ShelterView(rig.bounds), [rig])
  const group = useRef<THREE.Group>(null)
  const camera = useThree((state) => state.camera)

  useEffect(
    () => () => {
      rig.cloudMaterial.dispose()
      rig.mistMaterial.dispose()
      rig.boltMaterial.dispose()
    },
    [rig],
  )

  const sky = SKIES[weather?.kind ?? 'clear']
  const intensity = weather?.intensity ?? 0
  const wind = useMemo(
    () => windVector(weather?.windSpeed ?? 0, weather?.windDirection ?? 0),
    [weather?.windSpeed, weather?.windDirection],
  )

  const grown = useRef<number[]>(rig.clouds.map(() => 0))
  const lastFlash = useRef(0)

  // Ahead of the default priority, so the drops and the bolt test against
  // this frame's silhouette rather than last frame's.
  useFrame(() => {
    if (group.current) view.update(camera, group.current)
  }, -1)

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const k = ease(delta)

    tint.set(sky.tint)
    rig.cloudMaterial.color.lerp(tint, k)
    rig.cloudMaterial.emissive.copy(rig.cloudMaterial.color)

    rig.clouds.forEach((slot, index) => {
      const size = grown.current[index] ?? 0
      const next = size + ((index < sky.clouds ? 1 : 0) - size) * k
      grown.current[index] = next

      slot.mesh.visible = next > 0.004
      slot.mesh.scale.copy(slot.scale).multiplyScalar(next)
      slot.mesh.position.set(
        slot.position.x + Math.sin(time * 0.21 + index * 1.7) * 0.03,
        slot.position.y + Math.sin(time * 0.33 + index * 2.3) * 0.04,
        slot.position.z,
      )
    })

    const mist = rig.mistMaterial
    mist.opacity += ((sky.mist ? MIST_OPACITY : 0) - mist.opacity) * k
    rig.mist.forEach((slot, index) => {
      slot.mesh.visible = mist.opacity > 0.01
      slot.mesh.position.x = slot.position.x + Math.sin(time * 0.12 + index * 1.9) * 0.25
    })

    const cap = rig.snowCap
    cap.scale.y += (snowCover - cap.scale.y) * k
    cap.visible = cap.scale.y >= 0.01

    // Only the rising edge of a strike picks a cloud, so the flicker inside
    // one burst keeps the bolt where it landed. A bolt whose cloud or tip is
    // behind the room would be wasted, so those clouds are skipped.
    const flash = lightning.value
    if (flash === 0) {
      rig.bolt.visible = false
    } else if (lastFlash.current === 0) {
      const options = rig.clouds.filter((slot, index) => {
        const { x, y, z } = slot.mesh.position
        return (grown.current[index] ?? 0) > 0.5 && !view.covers(x, y, z) && !view.covers(x, y - rig.boltReach, z)
      })
      const pick = options[Math.floor(Math.random() * options.length)]
      if (pick) {
        rig.bolt.position.copy(pick.mesh.position)
        rig.bolt.visible = true
      }
    }
    lastFlash.current = flash
  })

  return (
    <group ref={group} scale={MODEL_SCALE} position={[0, BASE_Y, 0]}>
      <primitive object={rig.root} />
      {weather && sky.fall === 'rain' && (
        <Rain template={rig.raindrop} count={Math.round(160 + intensity * 900)} wind={wind} view={view} />
      )}
      {weather && sky.fall === 'snow' && (
        <Snow template={rig.snowflake} count={Math.round(120 + intensity * 600)} wind={wind} view={view} />
      )}
    </group>
  )
}

export function Weather(props: WeatherProps) {
  // A missing or broken weather.glb means no weather, not a broken page.
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Props {...props} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

useGLTF.preload(URL)
