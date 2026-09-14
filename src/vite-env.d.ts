/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Path to a glTF cottage export, e.g. /models/cottage.glb. */
  readonly VITE_COTTAGE_MODEL?: string
  readonly VITE_COTTAGE_SCALE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
