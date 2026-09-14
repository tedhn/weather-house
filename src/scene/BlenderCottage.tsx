import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import { Cottage, type CottageProps } from './Cottage'
import { BASE_Y } from './dims'

// Point VITE_COTTAGE_MODEL at a glTF export to replace the procedural cottage
// with one modelled in Blender. Everything else -- lighting, weather, camera --
// keeps working, because none of it reads the cottage geometry.
const MODEL_URL = import.meta.env.VITE_COTTAGE_MODEL
const MODEL_SCALE = Number(import.meta.env.VITE_COTTAGE_SCALE ?? 1)

function LoadedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  scene.traverse((node) => {
    if (!(node as { isMesh?: boolean }).isMesh) return
    node.castShadow = true
    node.receiveShadow = true
  })

  return <primitive object={scene} scale={MODEL_SCALE} position={[0, BASE_Y, 0]} />
}

export function CottageModel(props: CottageProps) {
  if (!MODEL_URL) return <Cottage {...props} />

  return (
    <Suspense fallback={<Cottage {...props} />}>
      <LoadedModel url={MODEL_URL} />
    </Suspense>
  )
}

if (MODEL_URL) useGLTF.preload(MODEL_URL)
