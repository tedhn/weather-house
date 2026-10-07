// Shared cottage dimensions. Kept in one place so furniture and shell agree.
export const W = 4.4
export const D = 4.4
export const WALL = 0.16
export const ROOM_H = 2.95 // single storey, open to the rafters
export const ROOF_RISE = 1.5

export const HALF_W = W / 2
export const HALF_D = D / 2
export const WALL_TOP = ROOM_H
export const RIDGE = WALL_TOP + ROOF_RISE
// The whole diorama is lifted so the cottage sits centred on screen.
export const BASE_Y = -0.7
// The Blender export and the weather props built on top of it share one
// space, so they scale together.
export const MODEL_SCALE = Number(import.meta.env.VITE_COTTAGE_SCALE ?? 1)
