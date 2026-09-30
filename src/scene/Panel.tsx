import { RoundedBoxGeometry } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'

export type Vec3 = [number, number, number]

export interface PanelProps extends Omit<ThreeElements['mesh'], 'ref' | 'args' | 'children'> {
  size: Vec3
  color: string
  roughness?: number
  radius?: number
  transparent?: boolean
  opacity?: number
}

// Rounding every solid by the same amount is what makes the diorama read as a
// carved wooden toy rather than a stack of CAD boxes.
const EDGE_RADIUS = 0.05

// Every solid in the diorama is a rounded box. Keeping one component means the
// whole cottage shares a single material recipe and reads as one object.
export function Panel({
  size,
  color,
  roughness = 0.92,
  radius,
  transparent,
  opacity,
  ...props
}: PanelProps) {
  // The bevel has to stay well under half the thinnest side, or a slim part --
  // a window mullion, a roof batten -- rounds itself away to nothing.
  const edge = Math.min(radius ?? EDGE_RADIUS, Math.min(...size) * 0.35)

  return (
    <mesh castShadow receiveShadow {...props}>
      {/* Low smoothness keeps the triangle count sane across ~50 panels; the
          bevel only has to catch a highlight, not survive a close-up. */}
      <RoundedBoxGeometry args={size} radius={edge} smoothness={2} bevelSegments={2} creaseAngle={0.7} />
      {/* No flatShading: the creased normals shade the bevel smoothly while the
          flat faces stay flat, which is what softens the edge. */}
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0}
        transparent={transparent ?? false}
        opacity={opacity ?? 1}
      />
    </mesh>
  )
}
