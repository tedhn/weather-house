import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, PointLight } from 'three'
import { COTTAGE } from '../lib/palette'
import { Panel, type Vec3 } from './Panel'
import type { Affordances } from './affordances'
import { HALF_D, HALF_W } from './dims'

const FLOOR_Y = 0.14

interface Placed {
  position: Vec3
}

function Rug({ position, color, size }: Placed & { color: string; size: [number, number] }) {
  return <Panel size={[size[0], 0.04, size[1]]} position={position} color={color} roughness={1} />
}

const LEAVES: [number, number, number, number][] = [
  [0, 0.42, 0, 0.26],
  [0.13, 0.34, 0.1, 0.2],
  [-0.12, 0.36, -0.08, 0.22],
]

function Plant({ position, scale = 1 }: Placed & { scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.19, 0.15, 0.28, 8]} />
        <meshStandardMaterial color={COTTAGE.fabricWarm} flatShading roughness={0.95} />
      </mesh>
      {LEAVES.map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial
            color={index === 0 ? COTTAGE.leaf : COTTAGE.leafDark}
            flatShading
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

const SPINES = [COTTAGE.fabric, COTTAGE.fabricWarm, COTTAGE.paper, COTTAGE.leaf]

interface BookshelfProps extends Placed {
  rotation?: Vec3
  height?: number
  width?: number
}

function Bookshelf({ position, rotation = [0, 0, 0], height = 1.7, width = 1.3 }: BookshelfProps) {
  return (
    <group position={position} rotation={rotation}>
      <Panel size={[width, height, 0.34]} position={[0, height / 2, 0]} color={COTTAGE.woodDark} />
      {[0, 1, 2].map((row) => (
        <group key={row}>
          <Panel size={[width - 0.1, 0.05, 0.3]} position={[0, 0.42 + row * 0.44, 0.03]} color={COTTAGE.wood} />
          {[0, 1, 2, 3, 4, 5].map((book) => (
            <Panel
              key={book}
              size={[0.11, 0.24 + ((row + book) % 3) * 0.06, 0.2]}
              position={[
                -width / 2 + 0.16 + book * 0.19,
                0.59 + row * 0.44 + ((row + book) % 3) * 0.03,
                0.05,
              ]}
              color={SPINES[(row * 3 + book) % 4] ?? COTTAGE.paper}
            />
          ))}
        </group>
      ))}
    </group>
  )
}

function Fireplace({ nightGlow, hearth }: { nightGlow: boolean; hearth: Affordances['hearth'] }) {
  const flame = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)

  // Fire never sits still. A little noise on scale and intensity sells it more
  // cheaply than any particle system.
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const flicker = 0.82 + Math.sin(time * 11) * 0.09 + Math.sin(time * 23.3) * 0.06
    const banked = hearth === 'embers'
    const height = banked ? 0.3 : 0.8 + flicker * 0.35
    if (flame.current) flame.current.scale.set(flicker * (banked ? 0.7 : 1), height, flicker * (banked ? 0.7 : 1))
    if (light.current) {
      light.current.intensity = (nightGlow ? 5.5 : 3.4) * flicker * (banked ? 0.4 : 1)
    }
  })

  return (
    <group position={[-HALF_W + 0.42, FLOOR_Y, 1.3]}>
      {/* Built as a U so the opening is a real hole facing the camera, rather
          than a dark panel stuck on the front. */}
      <Panel size={[0.3, 1.52, 1.3]} position={[-0.18, 0.77, 0]} color={COTTAGE.chimney} />
      <Panel size={[0.66, 1.5, 0.26]} position={[0.15, 0.72, -0.5]} color={COTTAGE.chimney} />
      <Panel size={[0.66, 1.5, 0.26]} position={[0.15, 0.72, 0.5]} color={COTTAGE.chimney} />
      <Panel size={[0.6, 0.4, 1.2]} position={[0.15, 1.24, 0]} color={COTTAGE.chimney} />
      <Panel size={[0.6, 0.14, 1.2]} position={[0.15, 0.09, 0]} color={COTTAGE.roofTrim} />
      <Panel size={[0.86, 0.16, 1.56]} position={[0.12, 1.56, 0]} color={COTTAGE.roofTrim} />

      <mesh ref={flame} position={[0.1, 0.32, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={COTTAGE.ember}
          emissive={COTTAGE.ember}
          emissiveIntensity={hearth === 'embers' ? 1.4 : 2.6}
          flatShading
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={light} position={[0.5, 0.5, 0]} color={COTTAGE.ember} distance={6} decay={2} />

      {/* Firewood stacked on the hearth. */}
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[0.1, 0.17 + index * 0.13, -0.02 + (index % 2) * 0.08]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 0.42, 6]} />
          <meshStandardMaterial color={COTTAGE.woodDark} flatShading />
        </mesh>
      ))}
    </group>
  )
}

const DESK_LEGS: [number, number][] = [
  [-0.75, -0.28],
  [-0.75, 0.28],
  [0.75, -0.28],
  [0.75, 0.28],
]

const CHAIR_LEGS: [number, number][] = [
  [-0.2, -0.18],
  [-0.2, 0.18],
  [0.2, -0.18],
  [0.2, 0.18],
]

function Desk({ nightGlow, papers }: { nightGlow: boolean; papers: number }) {
  return (
    <group position={[1.3, FLOOR_Y, -HALF_D + 0.62]}>
      <Panel size={[1.7, 0.09, 0.72]} position={[0, 0.78, 0]} color={COTTAGE.wood} />
      {DESK_LEGS.map(([x, z], index) => (
        <Panel key={index} size={[0.09, 0.78, 0.09]} position={[x, 0.39, z]} color={COTTAGE.woodDark} />
      ))}

      {/* Laptop: base plus a screen that actually lights the desk. */}
      <Panel size={[0.56, 0.04, 0.4]} position={[-0.1, 0.87, 0.02]} color={COTTAGE.metal} />
      <group position={[-0.1, 0.87, -0.17]} rotation={[-0.32, 0, 0]}>
        <Panel size={[0.56, 0.38, 0.03]} position={[0, 0.19, 0]} color={COTTAGE.metal} />
        <mesh position={[0, 0.19, 0.023]}>
          <planeGeometry args={[0.48, 0.3]} />
          <meshStandardMaterial
            color={COTTAGE.screen}
            emissive={COTTAGE.screen}
            emissiveIntensity={nightGlow ? 1.6 : 0.9}
            toneMapped={false}
          />
        </mesh>
      </group>
      <pointLight
        position={[-0.1, 1.05, 0.1]}
        color={COTTAGE.screen}
        intensity={nightGlow ? 1.5 : 0.6}
        distance={2.2}
        decay={2}
      />

      {/* Mug and a small stack of paper. */}
      <mesh position={[0.45, 0.9, 0.1]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.16, 10]} />
        <meshStandardMaterial color={COTTAGE.fabric} flatShading />
      </mesh>
      {Array.from({ length: papers }, (_, sheet) => (
        <Panel
          key={sheet}
          size={[0.3, 0.045, 0.22]}
          position={[0.62 + sheet * 0.012, 0.87 + sheet * 0.05, -0.16 - sheet * 0.008]}
          color={COTTAGE.paper}
        />
      ))}

      {/* Chair, pulled out slightly. */}
      <group position={[-0.15, 0, 0.8]} rotation={[0, 0.22, 0]}>
        <Panel size={[0.52, 0.08, 0.5]} position={[0, 0.45, 0]} color={COTTAGE.fabricWarm} />
        <Panel size={[0.48, 0.62, 0.09]} position={[0, 0.8, -0.2]} color={COTTAGE.fabricWarm} />
        {CHAIR_LEGS.map(([x, z], index) => (
          <Panel key={index} size={[0.07, 0.45, 0.07]} position={[x, 0.22, z]} color={COTTAGE.woodDark} />
        ))}
      </group>
    </group>
  )
}

function FloorLamp({ position, nightGlow, on }: Placed & { nightGlow: boolean; on: boolean }) {
  return (
    <group position={position}>
      <Panel size={[0.3, 0.06, 0.3]} position={[0, 0.03, 0]} color={COTTAGE.metal} />
      <Panel size={[0.06, 1.5, 0.06]} position={[0, 0.78, 0]} color={COTTAGE.metal} />
      <mesh position={[0, 1.62, 0]} castShadow>
        <coneGeometry args={[0.22, 0.3, 8, 1, true]} />
        <meshStandardMaterial
          color={on ? COTTAGE.lampLight : COTTAGE.paper}
          emissive={COTTAGE.lampLight}
          emissiveIntensity={on ? (nightGlow ? 1.4 : 0.6) : 0}
          side={2}
          flatShading
        />
      </mesh>
      {on && (
        <pointLight
          position={[0, 1.5, 0]}
          color={COTTAGE.lampLight}
          intensity={nightGlow ? 4 : 1.8}
          distance={4.5}
          decay={2}
        />
      )}
    </group>
  )
}

function Bed() {
  return (
    <group position={[-1.02, FLOOR_Y, -0.9]} rotation={[0, Math.PI / 2, 0]}>
      <Panel size={[1.55, 0.32, 1.95]} position={[0, 0.16, 0]} color={COTTAGE.woodDark} />
      <Panel size={[1.46, 0.22, 1.86]} position={[0, 0.42, 0]} color={COTTAGE.paper} />
      <Panel size={[1.5, 0.16, 1.1]} position={[0, 0.55, 0.36]} color={COTTAGE.fabric} />
      <Panel size={[0.86, 0.18, 0.42]} position={[0, 0.6, -0.66]} color={COTTAGE.fabricWarm} />
      <Panel size={[1.62, 0.9, 0.12]} position={[0, 0.44, -1.02]} color={COTTAGE.wood} />
    </group>
  )
}

function Nightstand({ nightGlow }: { nightGlow: boolean }) {
  return (
    <group position={[-1.4, FLOOR_Y, 0.3]}>
      <Panel size={[0.5, 0.55, 0.44]} position={[0, 0.28, 0]} color={COTTAGE.wood} />
      <Panel size={[0.44, 0.05, 0.05]} position={[0, 0.3, 0.22]} color={COTTAGE.metal} />
      <Panel size={[0.1, 0.24, 0.1]} position={[0, 0.67, 0]} color={COTTAGE.metal} />
      <mesh position={[0, 0.86, 0]} castShadow>
        <coneGeometry args={[0.2, 0.26, 8, 1, true]} />
        <meshStandardMaterial
          color={COTTAGE.lampLight}
          emissive={COTTAGE.lampLight}
          emissiveIntensity={nightGlow ? 1.5 : 0.6}
          side={2}
          flatShading
        />
      </mesh>
      <pointLight
        position={[0, 0.8, 0]}
        color={COTTAGE.lampLight}
        intensity={nightGlow ? 3.2 : 1.4}
        distance={3.6}
        decay={2}
      />
    </group>
  )
}

export function Interior({
  nightGlow,
  affordances,
}: {
  nightGlow: boolean
  affordances: Affordances
}) {
  return (
    <group>
      <Rug position={[0.45, FLOOR_Y + 0.05, 0.85]} color={COTTAGE.fabric} size={[2.2, 1.7]} />
      <Fireplace nightGlow={nightGlow} hearth={affordances.hearth} />
      <Bed />
      <Nightstand nightGlow={nightGlow} />
      <Desk nightGlow={nightGlow} papers={affordances.papers} />
      {/* Turned to face +Z so the spines read; anything facing away shows a
          blank back panel to this camera. */}
      <Bookshelf position={[-1.35, FLOOR_Y, -HALF_D + 0.25]} height={1.5} />
      <FloorLamp position={[1.9, FLOOR_Y, 1.8]} nightGlow={nightGlow} on={affordances.floorLamp} />
      <Plant position={[1.9, FLOOR_Y, 0.35]} scale={1.15} />
      <Plant position={[-0.35, FLOOR_Y, 1.85]} scale={0.95} />
    </group>
  )
}
