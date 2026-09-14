# Weather cottage signals

One stage: SIGNALS. It reads what the other Hermes pipelines have already
recorded today and writes a single file the cottage page can fetch. It does not
collect anything, judge anything, or send anything anywhere.

The `cottage-signals` profile runs this stage and nothing else. If asked to
triage mail, score jobs, or collect posts, it says that is another profile's
role and stops. It is a reader: it never writes, migrates, or deletes anything
in another pipeline's workspace.

No stage passes data through conversation context. The handoff is
`public/hermes.json`, and the page reads it the same way any other consumer
would read a store.

## Stores

| Store | Role | Write policy |
|---|---|---|
| `~/Documents/mail/runs/YYYY-MM-DD/inbox.json` | Messages awaiting a triage decision | Read-only. Owned by the mail pipeline. |
| `~/Documents/mail/mail.db` | `digest_sends`, to tell whether today's digest went out | Read-only, opened `readOnly`. Never written. |
| `~/Documents/jobsearch/scored.json` | Count of jobs scored in today's run | Read-only. Owned by the jobsearch pipeline. |
| `~/Documents/facebook/posts.db` | `matches` found today | Read-only, opened `readOnly`. Never written. |
| `public/hermes.json` | The only file this stage writes | Overwritten each run. Scratch; git-ignored. |

Each source pipeline is the system of record for its own signal. This stage
never reconciles or corrects them — it reports what they say, or says why it
could not read them.

## Running it

```bash
cd ~/Documents/projects/personal/weather-house
node scripts/signals.mjs collect          # write public/hermes.json
node scripts/signals.mjs show             # print the current file
node scripts/signals.mjs collect --date 2026-09-14
```

Every run prints the file it wrote and the report, including a per-source
status line. A source that says anything other than `ok` is telling you why
that signal is absent.

## Rules that matter

Every pipeline is optional. You may not run all three, so a missing source is
normal: that signal is omitted and the room falls back to its default look for
it. **An absent signal is never reported as zero** — zero means the pipeline ran
and found nothing, which is a different fact.

`scored.json` is per-run scratch. If its `run_date` is not today, it is a stale
run and is reported as such rather than as today's count.

If no source at all could be read, the stage exits 2 and names each one. It
does not write a file of nulls.

## What the room does with it

`src/scene/affordances.ts` is the only place a signal name is tied to something
visible:

| Signal | Room |
|---|---|
| `mail_pending > 0` | Floor lamp lit — something is waiting |
| `job_matches_today` | That many sheets stacked on the desk, capped at 4 |
| `digest_posted` | Full flame in the hearth once the digest is out; embers before |
| `watch_hits` | Shown in the readout only |

Adding a signal means one line there and one prop in `Furniture.tsx`.

`public/hermes.json` is trusted for `stale_after_minutes` (90) after it is
written. Past that, or if it is absent or malformed, the page renders exactly as
it did before any of this existed — every lamp on, fire burning. A dead
scheduler shows nothing rather than yesterday's news.
