import { useEffect, useState } from 'react'
import { fetchSignals, type HermesReport } from '../lib/hermes'

const POLL_MS = 60_000

/** Null until a fresh signals file is found; stays null when there is none. */
export function useHermes(): HermesReport | null {
  const [report, setReport] = useState<HermesReport | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        setReport(await fetchSignals(controller.signal))
      } catch {
        // Aborted on unmount.
      }
    }

    void load()
    const timer = setInterval(() => void load(), POLL_MS)

    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [])

  return report
}
