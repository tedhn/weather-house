import type { ThreeElements } from '@react-three/fiber'

export type Vec3 = [number, number, number]

export interface PanelProps extends Omit<ThreeElements['mesh'], 'ref' | 'args' | 'children'> {
  size: Vec3
  color: string
  roughness?: number
  transparent?: boolean
  opacity?: number
}

// Every solid in the diorama is a flat-shaded box. Keeping one component means
// the whole cottage shares a single material recipe and reads as one object.
export function Panel({
  size,
  color,
  roughness = 0.92,
  transparent,
  opacity,
  ...props
}: PanelProps) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        flatShading
        roughness={roughness}
        metalness={0}
        transparent={transparent ?? false}
        opacity={opacity ?? 1}
      />
    </mesh>
  )
}
