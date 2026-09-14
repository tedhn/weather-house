#!/usr/bin/env node
// SIGNALS stage. Reads the other Hermes pipelines' stores and writes one file
// the cottage can fetch: public/hermes.json.
//
// This stage is a reader. It never writes, migrates, or deletes anything in
// another pipeline's workspace, and it only touches stores those pipelines
// document as their run output.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'hermes.json')
const HERMES = join(homedir(), 'Documents')

// How long a written file stays trustworthy. The page falls back to its normal
// look past this, so a dead cron shows nothing rather than yesterday's news.
const STALE_AFTER_MINUTES = 90

const die = (message) => {
  console.error(message)
  process.exit(2)
}

const today = () => new Date().toLocaleDateString('en-CA')

function readJson(path) {
  if (!existsSync(path)) return { missing: true }
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (cause) {
    return { error: `unparseable: ${cause.message}` }
  }
}

function readDb(path, query) {
  if (!existsSync(path)) return { missing: true }
  let db
  try {
    db = new DatabaseSync(path, { readOnly: true })
    return { value: query(db) }
  } catch (cause) {
    return { error: cause.message }
  } finally {
    db?.close()
  }
}

// Each source returns a partial signals object, or explains why it cannot.
const SOURCES = {
  mail(date) {
    const inbox = readJson(join(HERMES, 'mail', 'runs', date, 'inbox.json'))
    if (inbox.missing) return { status: `no run for ${date}` }
    if (inbox.error) return { status: inbox.error }

    const pending = inbox.value.pending ?? inbox.value.messages?.length
    if (typeof pending !== 'number') return { status: 'inbox.json has no pending count' }

    const digest = readDb(join(HERMES, 'mail', 'mail.db'), (db) =>
      db.prepare('select count(*) c from digest_sends where run_date = ? and ok = 1').get(date),
    )

    return {
      status: 'ok',
      signals: {
        mail_pending: pending,
        digest_posted: digest.value ? digest.value.c > 0 : null,
      },
    }
  },

  jobsearch(date) {
    const scored = readJson(join(HERMES, 'jobsearch', 'scored.json'))
    if (scored.missing) return { status: 'scored.json absent' }
    if (scored.error) return { status: scored.error }

    // scored.json is per-run scratch, so a stale one must not be reported as
    // today's result.
    if (scored.value.run_date !== date) return { status: `last run ${scored.value.run_date ?? 'unknown'}` }

    return { status: 'ok', signals: { job_matches_today: scored.value.count ?? 0 } }
  },

  facebook(date) {
    const hits = readDb(join(HERMES, 'facebook', 'posts.db'), (db) =>
      db.prepare('select count(*) c from matches where substr(found_at, 1, 10) = ?').get(date),
    )
    if (hits.missing) return { status: 'posts.db absent' }
    if (hits.error) return { status: hits.error }

    return { status: 'ok', signals: { watch_hits: hits.value.c } }
  },
}

export function collect(date = today()) {
  const signals = {}
  const sources = {}

  for (const [name, read] of Object.entries(SOURCES)) {
    const result = read(date)
    sources[name] = result.status
    Object.assign(signals, result.signals ?? {})
  }

  return {
    run_date: date,
    written_at: new Date().toISOString(),
    stale_after_minutes: STALE_AFTER_MINUTES,
    signals,
    sources,
  }
}

function write(report) {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`)
}

export function main(argv = process.argv.slice(2)) {
  const command = argv[0] ?? 'collect'
  const dateArg = argv.indexOf('--date')
  const date = dateArg === -1 ? today() : argv[dateArg + 1]

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) die('usage: signals.mjs [collect|show] [--date YYYY-MM-DD]')

  if (command === 'show') {
    const current = readJson(OUT)
    if (current.missing) die(`${OUT} has not been written yet`)
    if (current.error) die(`${OUT} ${current.error}`)
    console.log(JSON.stringify(current.value, null, 2))
    return
  }

  if (command !== 'collect') die('usage: signals.mjs [collect|show] [--date YYYY-MM-DD]')

  const report = collect(date)
  const ok = Object.values(report.sources).filter((status) => status === 'ok')

  // Every pipeline is optional -- you may not run all of them -- but if none
  // answered there is nothing to display and something is wrong.
  if (!ok.length) {
    die(`no Hermes source could be read for ${date}:\n${JSON.stringify(report.sources, null, 2)}`)
  }

  write(report)
  console.log(`${OUT}`)
  console.log(JSON.stringify(report, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
