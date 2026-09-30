import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, Vector3, type Group } from 'three'
import { COTTAGE } from '../lib/palette'
import { Panel, type Vec3 } from './Panel'

// The resident, drawn the way Virtual Cottage draws its own: one soft mass for
// the sweater, an oversized rounded head of hair sitting straight on it with no
// neck, sleeves that taper into mitts, and boots. Nothing is a box, nothing has
// a face -- the camera only ever sees this person from behind.
export const SEAT_Y = 0.49

// Forearm length. Shared by both poses -- only the angle differs.
const ARM_LENGTH = 0.34

// Where the spine group stands and how far it leans, and where the shoulder
// sockets sit inside it. The render reads these same constants, so the solver
// below starts every arm from the point the arm is actually drawn from.
const SPINE_ORIGIN: Vec3 = [0, SEAT_Y + 0.14, 0.01]
const SPINE_LEAN = -0.16
const SHOULDER: Vec3 = [0.21, 0.26, -0.03]
// Shoulder socket to the middle of the mitt: the sleeve plus the ball on its
// end. This is the resident's whole reach, since the arm is one straight
// capsule with no elbow to fold.
const MITT_DROP = ARM_LENGTH + 0.06

export type PersonPose = 'typing' | 'holding'

// Every number a pose changes, gathered here so the arm/head logic below never
// branches on which pose is active -- it just reads whatever POSES[pose] gives it.
interface PoseSpec {
  /** Where each mitt goes, left then right, in the resident's own frame.
      Authored as points rather than as joint angles: both poses are about what
      the hands are touching -- keys, or a phone -- and a point can be checked
      against the thing it should be touching, while an Euler triple cannot.
      A point further from the shoulder than MITT_DROP is simply aimed at, not
      reached, so keep them on the reach sphere (see `reach`). */
  hands: [Vec3, Vec3]
  /** Added to the head's animated rotation.x. Negative looks down -- the head's
      own -Z faces forward, so Rx tips its gaze the way the sign says. */
  headTilt: number
  /** Added to the head's animated rotation.y. Negative turns to the resident's
      right, which is the side the camera sees them from. */
  headTurn: number
  /** Which idle motion drives the arm group in useFrame. */
  idle: 'typing' | 'scrolling'
}

const POSES: Record<PersonPose, PoseSpec> = {
  // Both mitts on the near edge of the laptop's keyboard, a hand's width apart
  // and just proud of the keys. They have to be on the *near* edge: the seat
  // sits 0.24 from the desk and the arm is a rigid 0.40, so anything further
  // in is off the reach sphere and the mitt stops short in mid-air. The old
  // numbers put both hands at y 0.72 -- under the desk, in the lap -- which is
  // the whole reason this pose was rebuilt.
  typing: {
    hands: [
      [-0.061, 0.93, -0.43],
      [0.165, 0.93, -0.455],
    ],
    headTilt: 0,
    headTurn: 0,
    idle: 'typing',
  },
  // Both mitts on the phone, gripping its bottom corners -- solved from the
  // phone rather than guessed, which is why the two points are neither
  // symmetric nor round: the phone is turned toward the room camera, so its
  // width runs diagonally across the resident and one hand rides higher than
  // the other. Held high, roughly at shoulder height: lower reads better, but
  // the desk slab starts at y 0.92 and the whole phone would be inside it.
  // Furniture.tsx puts the phone itself wherever these two land -- see
  // PHONE_GRIP below.
  holding: {
    hands: [
      [0.029, 0.97, -0.37],
      [0.208, 0.908, -0.46],
    ],
    headTilt: -0.25,
    headTurn: -0.31,
    idle: 'scrolling',
  },
}

/** Shoulder socket in the resident's own frame -- the spine's socket carried
    out through the spine's lean. `side` is -1 for left, 1 for right. */
function shoulderAt(side: -1 | 1): Vector3 {
  return new Vector3(side * SHOULDER[0], SHOULDER[1], SHOULDER[2])
    .applyEuler(new Euler(SPINE_LEAN, 0, 0))
    .add(new Vector3(...SPINE_ORIGIN))
}

/** The Euler that swings a hanging arm until it points at `target`. Only x and
    z are needed: the arm is a straight capsule, so spinning it about its own
    length changes nothing. Rx(a)Rz(c) carries the arm's rest direction
    (0,-1,0) to (sin c, -cos a cos c, -sin a cos c), and those two lines are
    that read backwards. The target is given in the resident's frame, so the
    spine's lean comes back off it first -- the Euler is used inside the spine. */
function reach(side: -1 | 1, target: Vec3): Vec3 {
  const direction = new Vector3(...target)
    .sub(shoulderAt(side))
    .applyEuler(new Euler(-SPINE_LEAN, 0, 0))
    .normalize()
  return [Math.atan2(-direction.z, -direction.y), 0, Math.asin(direction.x)]
}

/** Where the mitt actually ends up: the arm is a fixed MITT_DROP long, so it
    lands on the ray to the authored point rather than necessarily on the point
    itself. Anything that has to sit *in* the hands reads this, not the pose. */
function mittAt(side: -1 | 1, target: Vec3): Vector3 {
  return new Vector3(0, -MITT_DROP, 0)
    .applyEuler(new Euler(...reach(side, target)))
    .add(new Vector3(side * SHOULDER[0], SHOULDER[1], SHOULDER[2]))
    .applyEuler(new Euler(SPINE_LEAN, 0, 0))
    .add(new Vector3(...SPINE_ORIGIN))
}

const ARMS: Record<PersonPose, [Vec3, Vec3]> = {
  typing: [reach(-1, POSES.typing.hands[0]), reach(1, POSES.typing.hands[1])],
  holding: [reach(-1, POSES.holding.hands[0]), reach(1, POSES.holding.hands[1])],
}

/** The point the two mitts of the holding pose close around, in the resident's
    frame. The phone hangs off this rather than the other way round, so moving
    the hands moves the phone with them and the grip can never drift off the
    glass. */
export const PHONE_GRIP: Vec3 = (() => {
  const grip = mittAt(-1, POSES.holding.hands[0])
    .add(mittAt(1, POSES.holding.hands[1]))
    .multiplyScalar(0.5)
  return [grip.x, grip.y, grip.z]
})()

// A hint of asymmetry in the feet. A figure planted perfectly square reads as a
// mannequin however soft its shapes are.
const LEGS: { x: number; z: number }[] = [
  { x: -0.13, z: 0 },
  { x: 0.13, z: 0.05 },
]

function Blob({ color, scale, position }: { color: string; scale: Vec3; position: Vec3 }) {
  return (
    <mesh castShadow receiveShadow position={position} scale={scale}>
      <sphereGeometry args={[1, 18, 12]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  )
}

interface LimbProps {
  color: string
  radius: number
  length: number
  position: Vec3
  rotation?: Vec3
}

// Capsules rather than rounded boxes: a sleeve or a trouser leg has no edges to
// catch light, and that softness is most of what makes the figure read as drawn.
function Limb({ color, radius, length, position, rotation = [0, 0, 0] }: LimbProps) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <capsuleGeometry args={[radius, length, 4, 12]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  )
}

export function Person({ pose }: { pose: PersonPose }) {
  const spine = useRef<Group>(null)
  const head = useRef<Group>(null)
  const arms = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const spec = POSES[pose]
  const armAngles = ARMS[pose]

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Breathing, plus a much slower sway. Virtual Cottage's figure barely moves,
    // so everything here stays under a couple of degrees.
    if (spine.current) {
      spine.current.rotation.x = SPINE_LEAN + Math.sin(time * 0.9) * 0.012
      spine.current.rotation.z = Math.sin(time * 0.31) * 0.018
    }

    if (head.current) {
      head.current.rotation.y = spec.headTurn + Math.sin(time * 0.23) * 0.11
      head.current.rotation.x = spec.headTilt + Math.sin(time * 0.67) * 0.02
    }

    if (arms.current) {
      if (spec.idle === 'typing') {
        // Typing comes in bursts with pauses between them; a steady bounce reads
        // as a metronome, the pauses are what make it look like thinking.
        const typing = Math.sin(time * 0.21) > -0.25
        arms.current.position.y = typing ? Math.sin(time * 9.5) * 0.008 : 0

        // Hands alternate rather than moving as one block -- two mitts dropping
        // on the keys together is a piano chord, not typing. Each arm dips from
        // its own solved angle, half a cycle apart.
        const dip = typing ? 0.03 : 0
        if (leftArm.current) leftArm.current.rotation.x = armAngles[0][0] + Math.sin(time * 9.5) * dip
        if (rightArm.current) {
          rightArm.current.rotation.x = armAngles[1][0] + Math.sin(time * 9.5 + Math.PI) * dip
        }
      } else {
        // Scrolling barely moves -- a tenth the speed and half the amplitude of
        // the typing bounce, with no bursts to break it up. Both arms move
        // together here: they are holding one object between them, so anything
        // that moves one of them alone pulls that hand off the phone.
        arms.current.position.y = Math.sin(time * 0.95) * 0.006
      }
    }
  })

  return (
    <group>
      {/* The sweater drapes over the seat, so the hips are jumper-coloured too
          and only the trousers below the knee are a different colour. */}
      <Panel size={[0.44, 0.22, 0.38]} position={[0, SEAT_Y + 0.09, 0.01]} radius={0.11} color={COTTAGE.shirt} />
      {LEGS.map(({ x, z }) => (
        <group key={x} position={[x, 0, z]}>
          <Limb color={COTTAGE.trousers} radius={0.085} length={0.2} position={[0, SEAT_Y + 0.02, -0.17]} rotation={[-Math.PI / 2, 0, 0]} />
          <Limb color={COTTAGE.trousers} radius={0.075} length={0.26} position={[0, 0.28, -0.32]} />
          <Panel size={[0.17, 0.12, 0.28]} position={[0, 0.07, -0.38]} radius={0.055} color={COTTAGE.boot} />
        </group>
      ))}

      <group ref={spine} position={SPINE_ORIGIN}>
        {/* One mass for the whole upper body. Shoulders are where it narrows,
            not a separate part. */}
        <Blob color={COTTAGE.shirt} scale={[0.27, 0.28, 0.22]} position={[0, 0.2, -0.02]} />

        {/* No neck: the head sits straight down into the sweater, and the hair
            is the bigger of the two shapes. */}
        <group ref={head} position={[0, 0.58, -0.03]}>
          <Blob color={COTTAGE.skin} scale={[0.16, 0.17, 0.16]} position={[0, -0.03, -0.05]} />
          <Blob color={COTTAGE.hair} scale={[0.215, 0.2, 0.205]} position={[0, 0, 0]} />
          <Blob color={COTTAGE.hair} scale={[0.06, 0.055, 0.06]} position={[0.03, 0.17, 0.06]} />
        </group>

        <group ref={arms}>
          {/* Paired by literal index rather than a loop variable, so each
              shoulder keeps its own arm's rotation as an exact tuple element
              instead of the possibly-undefined type a dynamic index would
              give under noUncheckedIndexedAccess. */}
          {([[-SHOULDER[0], armAngles[0], leftArm] as const, [SHOULDER[0], armAngles[1], rightArm] as const]).map(
            ([x, rotation, ref]) => (
              <group key={x} ref={ref} position={[x, SHOULDER[1], SHOULDER[2]]} rotation={rotation}>
                <Limb color={COTTAGE.shirt} radius={0.075} length={ARM_LENGTH} position={[0, -ARM_LENGTH / 2, 0]} />
                <Blob color={COTTAGE.skin} scale={[0.07, 0.06, 0.07]} position={[0, -ARM_LENGTH - 0.06, 0]} />
              </group>
            ),
          )}
        </group>
      </group>
    </group>
  )
}
