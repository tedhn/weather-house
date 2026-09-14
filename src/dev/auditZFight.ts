import * as THREE from 'three'

const EPS = 1e-4
const AXES = ['x', 'y', 'z'] as const

interface Bounds {
  colour: string
  min: [number, number, number]
  max: [number, number, number]
}

export interface ZFightHit {
  plane: string
  area: number
  a: string
  b: string
}

export interface ZFightReport {
  boxes: number
  checked: number
  /** False means the drift rotation could not be straightened, so AABBs are
   *  inflated and hits may be spurious. */
  driftStraightened: boolean
  hits: ZFightHit[]
}

const describe = (box: Bounds): string =>
  `${box.colour} ${box.min.map((v) => v.toFixed(2)).join(',')} -> ${box.max.map((v) => v.toFixed(2)).join(',')}`

// Two box faces on the same plane, pointing the same way, z-fight: the GPU has
// no way to order them and you get a dithered shimmer. Faces that touch while
// pointing opposite ways are fine, because backface culling hides one of them.
//
// Static analysis of the JSX cannot see rotated groups or nested components, so
// this walks the real scene graph after it is built and measures world bounds.
export function auditZFight(scene: THREE.Object3D, { minArea = 0.002 } = {}): ZFightReport {
  const boxes: Bounds[] = []

  // The idle drift rotates the whole cottage, which inflates every world-space
  // AABB and invents overlaps that do not exist. Rotation preserves
  // coplanarity, so measuring with the drift straightened gives the real
  // answer. The roof's own tilt is left alone -- that one is genuine.
  const drift = scene.getObjectByName('drift')
  const restore = drift?.quaternion.clone()
  drift?.quaternion.identity()

  scene.updateMatrixWorld(true)
  scene.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return
    if (mesh.geometry?.type !== 'BoxGeometry') return

    const bounds = new THREE.Box3().setFromObject(mesh)
    const material = mesh.material as THREE.MeshStandardMaterial
    boxes.push({
      colour: `#${material?.color?.getHexString?.() ?? '??????'}`,
      min: [bounds.min.x, bounds.min.y, bounds.min.z],
      max: [bounds.max.x, bounds.max.y, bounds.max.z],
    })
  })

  const overlaps = (a: Bounds, b: Bounds, axis: number): boolean =>
    a.min[axis]! < b.max[axis]! - EPS && b.min[axis]! < a.max[axis]! - EPS

  const hits: ZFightHit[] = []
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!
      const b = boxes[j]!

      for (let axis = 0; axis < 3; axis += 1) {
        const others = [0, 1, 2].filter((other) => other !== axis)
        if (!others.every((other) => overlaps(a, b, other))) continue

        for (const side of ['min', 'max'] as const) {
          if (Math.abs(a[side][axis]! - b[side][axis]!) > EPS) continue

          const area = others.reduce(
            (total, other) =>
              total * (Math.min(a.max[other]!, b.max[other]!) - Math.max(a.min[other]!, b.min[other]!)),
            1,
          )

          hits.push({
            plane: `${side} ${AXES[axis]} = ${a[side][axis]!.toFixed(3)}`,
            area: Number(area.toFixed(3)),
            a: describe(a),
            b: describe(b),
          })
        }
      }
    }
  }

  if (drift && restore) {
    drift.quaternion.copy(restore)
    drift.updateMatrixWorld(true)
  }

  // Downward faces can't be seen from this camera, and slivers are a few pixels
  // at most, so neither is worth chasing.
  const visible = hits
    .filter((hit) => !hit.plane.startsWith('min y') && hit.area >= minArea)
    .sort((first, second) => second.area - first.area)

  return {
    boxes: boxes.length,
    checked: hits.length,
    driftStraightened: Boolean(drift),
    hits: visible,
  }
}
