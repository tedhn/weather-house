import type { HermesReport } from '../lib/hermes'

// The only place a signal name is tied to something visible. Adding a signal
// means adding a line here and one prop in Furniture, nothing else.
export interface Affordances {
  /** Work is waiting. */
  floorLamp: boolean
  /** Sheets stacked on the desk, 0-4. */
  papers: number
  /** A full flame once the day's digest has gone out; embers before. */
  hearth: 'flame' | 'embers'
}

// How the room looks with no Hermes connection: every light on, fire burning.
export const UNCONNECTED: Affordances = { floorLamp: true, papers: 1, hearth: 'flame' }

const MAX_PAPERS = 4

export function affordancesFor(report: HermesReport | null): Affordances {
  if (!report) return UNCONNECTED
  const { mail_pending, job_matches_today, digest_posted } = report.signals

  return {
    floorLamp: mail_pending === undefined ? UNCONNECTED.floorLamp : mail_pending > 0,
    papers:
      job_matches_today === undefined
        ? UNCONNECTED.papers
        : Math.max(0, Math.min(MAX_PAPERS, job_matches_today)),
    hearth:
      digest_posted === undefined || digest_posted === null
        ? UNCONNECTED.hearth
        : digest_posted
          ? 'flame'
          : 'embers',
  }
}
