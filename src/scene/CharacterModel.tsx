import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import { Person, SEAT_Y, type PersonPose } from './Person'

// Point VITE_PERSON_MODEL at a glTF character -- a free3d download, a Blender
// figure, anything -- to replace the procedural resident. The three knobs exist
// because no two downloaded rigs agree on scale, facing or where the floor is.
const MODEL_URL = import.meta.env.VITE_PERSON_MODEL
const MODEL_SCALE = Number(import.meta.env.VITE_PERSON_SCALE ?? 1)
const MODEL_TURN = (Number(import.meta.env.VITE_PERSON_TURN ?? 0) * Math.PI) / 180
// Measured from the chair seat, because that is where a seated figure belongs.
// A model authored standing wants about -0.49, which puts it back on the floor.
const MODEL_LIFT = Number(import.meta.env.VITE_PERSON_LIFT ?? 0)

function LoadedCharacter({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  scene.traverse((node) => {
    if (!(node as { isMesh?: boolean }).isMesh) return
    node.castShadow = true
    node.receiveShadow = true
  })

  // The procedural figure faces the desk at -Z; most exported characters face
  // +Z, which is what MODEL_TURN is usually correcting.
  return (
    <primitive
      object={scene}
      scale={MODEL_SCALE}
      rotation={[0, MODEL_TURN, 0]}
      position={[0, SEAT_Y + MODEL_LIFT, 0]}
    />
  )
}

export function CharacterModel({ pose }: { pose: PersonPose }) {
  if (!MODEL_URL) return <Person pose={pose} />

  return (
    // A downloaded rig brings its own animation, so pose has nothing to drive
    // once LoadedCharacter takes over -- it only reaches the procedural
    // fallback above and below.
    <Suspense fallback={<Person pose={pose} />}>
      <LoadedCharacter url={MODEL_URL} />
    </Suspense>
  )
}

if (MODEL_URL) useGLTF.preload(MODEL_URL)
