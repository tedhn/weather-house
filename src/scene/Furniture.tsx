import { useRef } from 'react'
import type { ComponentType } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, PointLight } from 'three'
import { COTTAGE } from '../lib/palette'
import { Panel, type Vec3 } from './Panel'
import { CharacterModel } from './CharacterModel'
import { PHONE_GRIP } from './Person'
import { Focusable } from './Focusable'
import type { ViewportScreen } from './focus'
import { HALF_D, HALF_W } from './dims'
import { SCREENS, useScreenKind } from './screen'

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

function Fireplace({ nightGlow }: { nightGlow: boolean }) {
  const flame = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)

  // Fire never sits still. A little noise on scale and intensity sells it more
  // cheaply than any particle system.
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const flicker = 0.82 + Math.sin(time * 11) * 0.09 + Math.sin(time * 23.3) * 0.06
    if (flame.current) flame.current.scale.set(flicker, 0.8 + flicker * 0.35, flicker)
    if (light.current) light.current.intensity = (nightGlow ? 5.5 : 3.4) * flicker
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

      {/* No pip: a lit fire in a dark room already pulls the eye, and the laptop
          pip is enough to teach that the room answers a click. */}
      <Focusable label="the fire" frame={[2.625, 2.283]} position={[0.1, 0.34, 0]} hotspot={false}>
        <mesh ref={flame} position={[0, -0.02, 0]}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={COTTAGE.ember}
            emissive={COTTAGE.ember}
            emissiveIntensity={2.6}
            flatShading
            toneMapped={false}
          />
        </mesh>

        {/* Firewood stacked on the hearth. */}
        {[0, 1, 2].map((index) => (
          <mesh
            key={index}
            position={[0, -0.17 + index * 0.13, -0.02 + (index % 2) * 0.08]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.06, 0.06, 0.42, 6]} />
            <meshStandardMaterial color={COTTAGE.woodDark} flatShading />
          </mesh>
        ))}
      </Focusable>
      <pointLight ref={light} position={[0.5, 0.5, 0]} color={COTTAGE.ember} distance={6} decay={2} />
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

function LaptopGlass({ nightGlow }: { nightGlow: boolean }) {
  const spec = SCREENS.mac
  return (
    <>
      {/* Back in the lid's own frame, so the panels keep the numbers they had
          when the lid was the group. */}
      <group position={[0, -0.19, -0.023]}>
        <Panel size={[0.56, 0.38, 0.03]} position={[0, 0.19, 0]} color={COTTAGE.metal} />
        <mesh position={[0, 0.19, 0.023]}>
          <planeGeometry args={[spec.width, spec.height]} />
          <meshStandardMaterial
            color={COTTAGE.screen}
            emissive={COTTAGE.screen}
            emissiveIntensity={nightGlow ? 1.6 : 0.9}
            toneMapped={false}
          />
        </mesh>
        {/* Hinge: turns the frame back level so the base lies flat on the desk. */}
        <group rotation={[spec.tilt, 0, 0]}>
          <Panel size={[0.56, 0.04, 0.4]} position={[0, 0, 0.19]} color={COTTAGE.metal} />
        </group>
      </group>
      <pointLight
        position={[0, -0.1, 0.29]}
        color={COTTAGE.screen}
        intensity={nightGlow ? 1.5 : 0.6}
        distance={2.2}
        decay={2}
      />
    </>
  )
}

function PhoneGlass({ nightGlow }: { nightGlow: boolean }) {
  const spec = SCREENS.ios
  return (
    <>
      {/* A hair larger than the glass itself, so a bezel shows around it. */}
      <Panel
        size={[spec.width + 0.014, spec.height + 0.014, 0.02]}
        position={[0, 0, -0.011]}
        color={COTTAGE.metal}
      />
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[spec.width, spec.height]} />
        <meshStandardMaterial
          color={COTTAGE.screen}
          emissive={COTTAGE.screen}
          emissiveIntensity={nightGlow ? 1.6 : 0.9}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, 0, 0.12]}
        color={COTTAGE.screen}
        intensity={nightGlow ? 0.75 : 0.3}
        distance={1.2}
        decay={2}
      />
    </>
  )
}

// How far the phone's middle sits above the grip, along the phone's own up, so
// the hands close around its bottom corners rather than across the screen.
const PHONE_LIFT = 0.11
// Turns the glass toward the room camera. Held facing the resident's own face
// instead, the phone would sit inside their silhouette from the room's one
// authored angle, and the rig would have to fly through their chest to frame
// it. The chair's own 0.14 turn adds to this, which lands the glass normal
// within a few degrees of the camera's azimuth.
const PHONE_TURN = 0.55

// The phone hangs off the mitts, not the desk: PHONE_GRIP is where the holding
// pose's two hands meet, and the glass is that point pushed up along its own
// up. Mounted in the resident's frame -- the chair group, which is static --
// rather than parented to the spine, whose breathing would drag the close-up's
// glass out from under the DOM overlay that stands in for it.
const PHONE_POSITION: Vec3 = [
  PHONE_GRIP[0],
  PHONE_GRIP[1] + PHONE_LIFT * Math.cos(SCREENS.ios.tilt),
  PHONE_GRIP[2] - PHONE_LIFT * Math.sin(SCREENS.ios.tilt),
]

// Where each device sits, how it's turned, how far its label floats above it,
// and which frame it belongs to -- the desk for a laptop, the resident for
// something they are holding.
const DESK_DEVICES: Record<
  ViewportScreen,
  {
    position: Vec3
    rotation: Vec3
    pin: Vec3
    mount: 'desk' | 'resident'
    Glass: ComponentType<{ nightGlow: boolean }>
  }
> = {
  mac: {
    position: [-0.1, 1.0575, -0.208],
    rotation: [-SCREENS.mac.tilt, 0, 0],
    pin: [0, 0.34, 0],
    mount: 'desk',
    Glass: LaptopGlass,
  },
  ios: {
    position: PHONE_POSITION,
    rotation: [-SCREENS.ios.tilt, PHONE_TURN, 0],
    pin: [0, 0.16, 0],
    mount: 'resident',
    Glass: PhoneGlass,
  },
}

function Desk({ nightGlow }: { nightGlow: boolean }) {
  const kind = useScreenKind()
  const spec = SCREENS[kind]
  const { position, rotation, pin, mount, Glass } = DESK_DEVICES[kind]

  // Anchored on the glass, not on whatever holds it: the group's origin is the
  // middle of the screen and its +Z is the screen's normal, which is what the
  // rig swings round onto. Built once here and hung under whichever parent the
  // device belongs to, so both mounts stay one piece of markup.
  const device = (
    <Focusable label={spec.label} screen={kind} position={position} rotation={rotation} pin={pin}>
      <Glass nightGlow={nightGlow} />
    </Focusable>
  )

  return (
    <group position={[1.3, FLOOR_Y, -HALF_D + 0.62]}>
      <Panel size={[1.7, 0.09, 0.72]} position={[0, 0.78, 0]} color={COTTAGE.wood} />
      {DESK_LEGS.map(([x, z], index) => (
        <Panel key={index} size={[0.09, 0.78, 0.09]} position={[x, 0.39, z]} color={COTTAGE.woodDark} />
      ))}

      {mount === 'desk' && device}

      {/* Mug and a small stack of paper. */}
      <mesh position={[0.45, 0.9, 0.1]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.16, 10]} />
        <meshStandardMaterial color={COTTAGE.fabric} flatShading />
      </mesh>
      <Panel size={[0.3, 0.05, 0.22]} position={[0.62, 0.87, -0.16]} color={COTTAGE.paper} />

      {/* Chair, turned a little off square so the pose looks settled rather
          than parked. The backrest sits on the camera side of the seat: the
          person faces the desk, so their back is what leans against it. */}
      <group position={[-0.15, 0, 0.6]} rotation={[0, 0.14, 0]}>
        <Panel size={[0.52, 0.08, 0.5]} position={[0, 0.45, 0]} color={COTTAGE.fabricWarm} />
        {/* A low back. Anything taller hides the sweater, and the figure is the
            point of this corner of the room. */}
        <Panel size={[0.44, 0.44, 0.08]} position={[0, 0.67, 0.2]} color={COTTAGE.fabricWarm} />
        {CHAIR_LEGS.map(([x, z], index) => (
          <Panel key={index} size={[0.07, 0.45, 0.07]} position={[x, 0.22, z]} color={COTTAGE.woodDark} />
        ))}
        <CharacterModel pose={spec.pose} />
        {mount === 'resident' && device}
      </group>
    </group>
  )
}

function FloorLamp({ position, nightGlow }: Placed & { nightGlow: boolean }) {
  return (
    <group position={position}>
      <Panel size={[0.3, 0.06, 0.3]} position={[0, 0.03, 0]} color={COTTAGE.metal} />
      <Panel size={[0.06, 1.5, 0.06]} position={[0, 0.78, 0]} color={COTTAGE.metal} />
      <mesh position={[0, 1.62, 0]} castShadow>
        <coneGeometry args={[0.22, 0.3, 8, 1, true]} />
        <meshStandardMaterial
          color={COTTAGE.lampLight}
          emissive={COTTAGE.lampLight}
          emissiveIntensity={nightGlow ? 1.4 : 0.6}
          side={2}
          flatShading
        />
      </mesh>
      <pointLight
        position={[0, 1.5, 0]}
        color={COTTAGE.lampLight}
        intensity={nightGlow ? 4 : 1.8}
        distance={4.5}
        decay={2}
      />
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

export function Interior({ nightGlow }: { nightGlow: boolean }) {
  return (
    <group>
      <Rug position={[0.45, FLOOR_Y + 0.05, 0.85]} color={COTTAGE.fabric} size={[2.2, 1.7]} />
      <Fireplace nightGlow={nightGlow} />
      <Bed />
      <Nightstand nightGlow={nightGlow} />
      <Desk nightGlow={nightGlow} />
      {/* Turned to face +Z so the spines read; anything facing away shows a
          blank back panel to this camera. */}
      <Bookshelf position={[-1.35, FLOOR_Y, -HALF_D + 0.25]} height={1.5} />
      <FloorLamp position={[1.9, FLOOR_Y, 1.8]} nightGlow={nightGlow} />
      <Plant position={[1.9, FLOOR_Y, 0.35]} scale={1.15} />
      <Plant position={[-0.35, FLOOR_Y, 1.85]} scale={0.95} />
    </group>
  )
}
