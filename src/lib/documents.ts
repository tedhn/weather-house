/** A PDF sitting in the project's `documents/` folder, ready to sit on the desktop. */
export interface DeskDocument {
  /** Stable key, the source filename without its extension. */
  id: string
  /** Desktop label, e.g. "Weather Report". */
  name: string
  /** Served URL of the built asset. */
  url: string
}

const files = import.meta.glob<string>('/documents/*.pdf', { eager: true, query: '?url', import: 'default' })

export const DESK_DOCUMENTS: DeskDocument[] = Object.entries(files)
  .map(([path, url]) => {
    const name = path.replace(/^.*\//, '').replace(/\.pdf$/, '')
    return { id: name, name, url }
  })
  .sort((a, b) => a.name.localeCompare(b.name))
