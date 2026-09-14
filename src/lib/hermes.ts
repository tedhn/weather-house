// Reads the file written by scripts/signals.mjs. The cottage treats this as a
// store, not an API: if it is absent, stale, or malformed the room simply looks
// the way it always did.

export interface HermesSignals {
  /** Messages awaiting a triage decision. */
  mail_pending?: number
  /** Whether today's digest has gone out. */
  digest_posted?: boolean | null
  /** Jobs scored in today's run. */
  job_matches_today?: number
  /** Watch-list hits found on Facebook today. */
  watch_hits?: number
}

export interface HermesReport {
  run_date: string
  written_at: string
  stale_after_minutes: number
  signals: HermesSignals
  /** Per-pipeline status: "ok", or why that source could not be read. */
  sources: Record<string, string>
}

const SIGNALS_URL = '/hermes.json'

export function isStale(report: HermesReport, now = Date.now()): boolean {
  const written = Date.parse(report.written_at)
  if (Number.isNaN(written)) return true
  return now - written > report.stale_after_minutes * 60_000
}

/** Null means "not connected to Hermes", which is a normal state, not an error. */
export async function fetchSignals(signal?: AbortSignal): Promise<HermesReport | null> {
  try {
    const response = await fetch(SIGNALS_URL, signal ? { signal, cache: 'no-store' } : { cache: 'no-store' })
    if (!response.ok) return null

    const report = (await response.json()) as HermesReport
    if (!report?.signals || typeof report.written_at !== 'string') return null

    return isStale(report) ? null : report
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    return null
  }
}
