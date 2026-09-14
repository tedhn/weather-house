import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COTTAGE } from '../lib/palette'
import type { Mood } from '../types'
import { UNCONNECTED, type Affordances } from './affordances'
import { Panel } from './Panel'
import { Interior } from './Furniture'
import { W, D, WALL, ROOM_H, ROOF_RISE, HALF_W, HALF_D, WALL_TOP, BASE_Y } from './dims'

// Cutaway diorama. The -X and -Z walls stay, the two walls facing the camera
// are gone, and only the far roof slope is drawn so the room reads from above.
export { W, D, WALL, ROOM_H, ROOF_RISE, HALF_W, HALF_D, WALL_TOP, RIDGE, BASE_Y } from './dims'
export { Panel } from './Panel'

interface WindowProps {
  position: [number, number, number]
  width?: number
  height?: number
  glow: boolean
}

function Window({ position, width = 1.1, height = 1.2, glow }: WindowProps) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial
          color={COTTAGE.glass}
          emissive={glow ? COTTAGE.lampLight : COTTAGE.glass}
          emissiveIntensity={glow ? 0.35 : 0}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <Panel size={[width + 0.18, 0.1, 0.12]} position={[0, height / 2 + 0.03, 0.04]} color={COTTAGE.beam} />
      <Panel size={[width + 0.18, 0.1, 0.12]} position={[0, -height / 2 - 0.03, 0.04]} color={COTTAGE.beam} />
      <Panel size={[0.1, height + 0.02, 0.12]} position={[-width / 2 - 0.03, 0, 0.048]} color={COTTAGE.beam} />
      <Panel size={[0.1, height + 0.02, 0.12]} position={[width / 2 + 0.03, 0, 0.048]} color={COTTAGE.beam} />
      <Panel size={[0.07, height + 0.04, 0.09]} position={[0, 0, 0.05]} color={COTTAGE.beam} />
    </group>
  )
}

function Gable() {
  const shape = useMemo(() => {
    const gable = new THREE.Shape()
    gable.moveTo(-HALF_D, 0)
    gable.lineTo(HALF_D, 0)
    gable.lineTo(0, ROOF_RISE)
    gable.closePath()
    return gable
  }, [])

  return (
    <group position={[-HALF_W, WALL_TOP, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: WALL, bevelEnabled: false }]} />
        <meshStandardMaterial color={COTTAGE.wallUpper} flatShading roughness={0.95} />
      </mesh>
    </group>
  )
}

function Roof() {
  const slopeLength = Math.hypot(ROOF_RISE, HALF_D)
  const angle = -Math.atan2(ROOF_RISE, HALF_D)
  const overhang = 0.5
  const length = slopeLength + overhang
  const low = -length / 2

  return (
    <group>
      {/* Far slope, built in its own tilted frame so the shingles and the eave
          board can be positioned along the slope instead of solved in world space. */}
      <group position={[0, WALL_TOP + ROOF_RISE / 2, -HALF_D / 2]} rotation={[angle, 0, 0]}>
        <Panel size={[W + 0.7, 0.22, length]} position={[0, 0, -overhang / 2]} color={COTTAGE.roof} />
        {[0.25, 0.9, 1.55, 2.2].map((offset) => (
          <Panel
            key={offset}
            size={[W + 0.72, 0.07, 0.12]}
            position={[0, 0.09, low + offset]}
            color={COTTAGE.roofTrim}
          />
        ))}
        <Panel size={[W + 0.78, 0.2, 0.14]} position={[0, 0.02, low]} color={COTTAGE.roofTrim} />
      </group>

      <Panel size={[W + 0.76, 0.24, 0.34]} position={[0, WALL_TOP + ROOF_RISE + 0.04, 0]} color={COTTAGE.roofTrim} />
    </group>
  )
}

function Chimney({ smoke }: { smoke: boolean }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, delta) => {
    if (!smoke) return
    for (const puff of puffs.current) {
      if (!puff) continue
      puff.position.y += delta * 0.55
      puff.position.x += delta * 0.18

      const life = (puff.position.y - (WALL_TOP + ROOF_RISE)) / 2.6
      puff.scale.setScalar(0.18 + life * 0.5)
      const material = puff.material as THREE.MeshStandardMaterial
      material.opacity = Math.max(0, 0.5 - life * 0.55)

      if (life > 1) puff.position.set(0, WALL_TOP + ROOF_RISE + 0.35, 0)
    }
  })

  return (
    <group position={[-HALF_W - 0.36, 0, 1.3]}>
      <Panel
        size={[0.66, WALL_TOP + ROOF_RISE + 0.3, 0.84]}
        position={[0, (WALL_TOP + ROOF_RISE + 0.3) / 2, 0]}
        color={COTTAGE.chimney}
      />
      <Panel size={[0.84, 0.2, 1.0]} position={[0, WALL_TOP + ROOF_RISE + 0.38, 0]} color={COTTAGE.roofTrim} />
      {smoke &&
        [0, 1, 2, 3, 4].map((index) => (
          <mesh
            key={index}
            ref={(node) => {
              puffs.current[index] = node
            }}
            position={[0, WALL_TOP + ROOF_RISE + 0.45 + index * 0.5, 0]}
          >
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#e6dcea" transparent opacity={0.35} flatShading depthWrite={false} />
          </mesh>
        ))}
    </group>
  )
}

const PINES: [number, number, number][] = [
  [-HALF_W - 0.58, -HALF_D - 0.52, 0.9],
  [HALF_W + 0.55, -HALF_D - 0.5, 0.68],
  [-HALF_W - 0.6, HALF_D + 0.5, 0.56],
]

function Platform({ snowCover }: { snowCover: number }) {
  const top = W + 1.7

  return (
    <group>
      <Panel size={[top, 0.34, D + 1.7]} position={[0, -0.17, 0]} color={COTTAGE.platformTop} />
      <Panel size={[top - 0.5, 0.56, D + 1.2]} position={[0, -0.6, 0]} color={COTTAGE.platform} />
      <Panel size={[top - 1.3, 0.56, D + 0.4]} position={[0, -1.1, 0]} color={COTTAGE.platform} />
      {snowCover > 0.05 && (
        <Panel
          size={[top + 0.02, 0.07, D + 1.72]}
          position={[0, 0.02, 0]}
          color="#eef0fb"
          transparent
          opacity={Math.min(1, snowCover)}
        />
      )}
      {/* A few pines so the weather has something outside to land on. */}
      {PINES.map(([x, z, scale], index) => (
        <group key={index} position={[x, 0, z]} scale={scale}>
          <Panel size={[0.22, 0.7, 0.22]} position={[0, 0.35, 0]} color={COTTAGE.woodDark} />
          {[0, 1, 2].map((tier) => (
            <mesh key={tier} position={[0, 0.85 + tier * 0.52, 0]} castShadow>
              <coneGeometry args={[0.68 - tier * 0.17, 0.85, 6]} />
              <meshStandardMaterial color={tier === 2 ? COTTAGE.leaf : COTTAGE.leafDark} flatShading roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export interface CottageProps {
  mood: Mood
  snowCover?: number
  smoke?: boolean
  /** What the room shows about the Hermes pipelines. Defaults to unconnected. */
  affordances?: Affordances
}

export function Cottage({
  mood,
  snowCover = 0,
  smoke = true,
  affordances = UNCONNECTED,
}: CottageProps) {
  const nightGlow = mood.phase === 'night'

  return (
    <group position={[0, BASE_Y, 0]}>
      <Platform snowCover={snowCover} />

      {/* Shell: back walls only, so the camera looks straight into the room. */}
      <Panel size={[WALL, ROOM_H, D + 0.02]} position={[-HALF_W, ROOM_H / 2, 0]} color={COTTAGE.wallOuter} />
      <Panel
        size={[W + 0.02, ROOM_H - 0.008, WALL]}
        position={[0, (ROOM_H - 0.008) / 2, -HALF_D]}
        color={COTTAGE.wallInner}
      />

      {/* Short returns at the cut line. They show the wall thickness, which is
          what makes a cutaway look sliced rather than unfinished. */}
      <Panel
        size={[WALL, ROOM_H, 0.75]}
        position={[HALF_W, ROOM_H / 2, -HALF_D + WALL / 2 + 0.387]}
        color={COTTAGE.wallOuter}
      />
      <Panel
        size={[0.75, ROOM_H, WALL]}
        position={[-HALF_W + WALL / 2 + 0.387, ROOM_H / 2, HALF_D]}
        color={COTTAGE.wallOuter}
      />

      {/* Floor. */}
      <Panel size={[W, 0.14, D]} position={[0, 0.07, 0]} color={COTTAGE.floor} />

      <Window position={[-1.05, 1.75, -HALF_D + 0.02]} width={1.0} height={1.05} glow={nightGlow} />
      <Window position={[1.3, 1.8, -HALF_D + 0.02]} width={1.0} height={0.95} glow={nightGlow} />

      <Gable />
      <Roof />
      <Chimney smoke={smoke} />

      <Interior nightGlow={nightGlow} affordances={affordances} />
    </group>
  )
}
