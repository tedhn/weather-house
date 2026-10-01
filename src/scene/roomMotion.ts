import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { reducedMotion } from '../lib/motion'

// Motion for the pieces blender/export_room.py splits the room into. The shell
// -- floor, walls, beams, window -- is already standing when the loading
// screen drops away; everything inside it pops in after, a few chains running
// side by side so the room fills from several corners at once rather than one
// object at a time.

interface Entrance {
  /** Seconds after the room is in, measured from when the loader starts
      leaving. The first piece lands as the loader clears the frame. */
  at: number
  /** How far the piece jumps on its way in, for the ones that should feel
      alive rather than placed. */
  hop?: number
}

const ENTRANCES: Record<string, Entrance> = {
  Rug: { at: 0.9 },

  Bed: { at: 1.0 },
  Bedding: { at: 1.25 },
  Nightstand: { at: 1.15 },
  NightLamp: { at: 1.35 },
  AlarmClock: { at: 1.45, hop: 0.2 },

  Desk: { at: 1.05 },
  Monitor: { at: 1.35 },
  Keyboard: { at: 1.45 },
  DeskLamp: { at: 1.5 },
  Mug: { at: 1.6, hop: 0.25 },
  Tower: { at: 1.25 },
  TowerFan0: { at: 1.25 },
  TowerFan1: { at: 1.25 },
  Chair: { at: 1.4 },
  Person: { at: 1.75, hop: 0.45 },

  Storage: { at: 1.1 },
  Plant: { at: 1.3 },
  WindowPlant: { at: 1.55, hop: 0.2 },

  Pinboard: { at: 1.2 },
  PosterSpace: { at: 1.35 },
  PosterGame: { at: 1.5 },
  Clock: { at: 1.65 },
  ClockHandH: { at: 1.65 },
  ClockHandM: { at: 1.65 },
  Darts: { at: 1.8 },
}

// How long a hop holds its target before the spring pulls it back down.
const HOP_SECONDS = 0.22

// Under-damped, so a piece overshoots its size and settles back -- the same
// landing GSAP's back.out gives.
const STIFFNESS = 170
const DAMPING = 13

interface Spring {
  value: number
  velocity: number
}

function step(spring: Spring, target: number, dt: number) {
  const force = (target - spring.value) * STIFFNESS - spring.velocity * DAMPING
  spring.velocity += force * dt
  spring.value += spring.velocity * dt
}

interface Rest {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
}

interface Piece {
  node: THREE.Object3D
  rest: Rest
  entrance: Entrance
  size: Spring
  lift: Spring
}

// useGLTF caches the scene, so a remount -- hot reload, StrictMode -- can find
// it mid-entrance. The pose is read once, the first time a node is seen.
function restOf(node: THREE.Object3D): Rest {
  node.userData.rest ??= {
    position: node.position.clone(),
    quaternion: node.quaternion.clone(),
    scale: node.scale.clone(),
  }
  return node.userData.rest as Rest
}

// The axis a fan blade is thinnest along is the one it spins about.
function thinnestAxis(node: THREE.Object3D): THREE.Vector3 {
  const mesh = node as THREE.Mesh
  mesh.geometry.computeBoundingBox()
  const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3())
  if (size.x <= size.y && size.x <= size.z) return new THREE.Vector3(1, 0, 0)
  if (size.y <= size.z) return new THREE.Vector3(0, 1, 0)
  return new THREE.Vector3(0, 0, 1)
}

// Where a hand points at rest, as a clockwise angle from twelve seen from the
// front. The hand's origin is the face's centre, so its middle is along it.
function restAngle(node: THREE.Object3D, rest: Rest): number {
  const mesh = node as THREE.Mesh
  mesh.geometry.computeBoundingBox()
  const middle = mesh.geometry.boundingBox!.getCenter(new THREE.Vector3())
  middle.multiply(rest.scale).applyQuaternion(rest.quaternion)
  return Math.atan2(middle.x, middle.y)
}

// The clock hangs on the back wall, facing out along +z.
const FACE_NORMAL = new THREE.Vector3(0, 0, 1)
const FAN_SPEED = 9

/** Animates the exported room's pieces. */
export function useRoomMotion(scene: THREE.Object3D, utcOffsetSeconds: number) {
  const pieces = useMemo(() => {
    const found: Piece[] = []
    for (const node of scene.children) {
      const entrance = ENTRANCES[node.name]
      if (!entrance) continue
      found.push({
        node,
        rest: restOf(node),
        entrance,
        size: { value: reducedMotion ? 1 : 0, velocity: 0 },
        lift: { value: 0, velocity: 0 },
      })
    }
    return found
  }, [scene])

  const spinners = useMemo(
    () =>
      scene.children
        .filter((node) => node.name.startsWith('TowerFan'))
        .map((node) => ({ node, axis: thinnestAxis(node) })),
    [scene],
  )

  const hands = useMemo(
    () =>
      scene.children
        .filter((node) => node.name.startsWith('ClockHand'))
        .map((node) => ({
          node,
          minute: node.name === 'ClockHandM',
          zero: restAngle(node, restOf(node)),
        })),
    [scene],
  )

  const startedAt = useRef<number | null>(null)
  const turn = useRef(new THREE.Quaternion())

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime
    startedAt.current ??= now
    const since = now - startedAt.current
    // A spring stepped across a long frame -- a background tab coming back --
    // overshoots wildly, so the step is capped.
    const dt = Math.min(delta, 1 / 30)

    for (const { node, rest, entrance, size, lift } of pieces) {
      const arrived = reducedMotion || since >= entrance.at
      step(size, arrived ? 1 : 0, dt)
      const hopping = !reducedMotion && entrance.hop && arrived && since < entrance.at + HOP_SECONDS
      step(lift, hopping ? entrance.hop! : 0, dt)

      // Scale 0 is a singular matrix, which three turns into NaN normals.
      node.scale.copy(rest.scale).multiplyScalar(Math.max(size.value, 1e-4))
      node.position.y = rest.position.y + lift.value
    }

    if (!reducedMotion) {
      for (const { node, axis } of spinners) {
        node.quaternion.copy(restOf(node).quaternion).multiply(turn.current.setFromAxisAngle(axis, -now * FAN_SPEED))
      }
    }

    const local = new Date(Date.now() + utcOffsetSeconds * 1000)
    const minutes = local.getUTCMinutes() + local.getUTCSeconds() / 60
    const hours = (local.getUTCHours() % 12) + minutes / 60
    for (const { node, minute, zero } of hands) {
      const angle = minute ? (minutes / 60) * Math.PI * 2 : (hours / 12) * Math.PI * 2
      // Clockwise seen from the front is a negative turn about the normal.
      turn.current.setFromAxisAngle(FACE_NORMAL, -(angle - zero))
      node.quaternion.copy(turn.current).multiply(restOf(node).quaternion)
    }
  })
}
