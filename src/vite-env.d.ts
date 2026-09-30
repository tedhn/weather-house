/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Path to a glTF cottage export, e.g. /models/cottage.glb. */
  readonly VITE_COTTAGE_MODEL?: string
  readonly VITE_COTTAGE_SCALE?: string
  /** Path to a glTF character export, e.g. /models/person.glb. */
  readonly VITE_PERSON_MODEL?: string
  readonly VITE_PERSON_SCALE?: string
  /** Degrees of Y rotation, to turn an imported character towards the desk. */
  readonly VITE_PERSON_TURN?: string
  /** Y offset from the chair seat; about -0.49 stands a figure on the floor. */
  readonly VITE_PERSON_LIFT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
