# Agent handshake — cloud coder ↔ Traverse News

## Who is who

| Agent | Role |
| --- | --- |
| **You (this process)** | Cloud coding agent on [github.com/nipez/traversenews](https://github.com/nipez/traversenews). You write code, open PRs, deploy Workers, pull feeds from datacenter IPs. |
| **Traverse News** | Nicholas’s user-facing Grok Bot news agent in his Cursor / Grok Bot chat. Not you. Lives in the traverse.news product chat with Nick. |

There is **no API from cloud agent → Traverse News** yet. The bridge is **Nick + that chat**: write the ask in the PR and in user-visible status; Nick (and Traverse News watching the repo work) will see it.

## Shared source

GitHub `main` is the only source of truth for live traverse.news. Both this cloud agent and Traverse News (Grok Bot) write here. Overwrites happen when one side deploys a Worker from a tree that is behind `main`.

- Always branch from latest `origin/main`. Never from an old `cursor/*` draft.
- After you change code, PR + merge to `main` before or with any `wrangler deploy`.
- Never deploy a Worker from a checkout that is behind `main`.
- Do not merge stale draft PRs from before the 2026-08-28 live-sync. Rebase unique work onto current `main` first.
- KV / AppData (subscribers, editions, sources, Desk content) is not in git. A code deploy does not wipe it.


## Jobs that already run on the Worker

These are live on the Cloudflare Worker (`wrangler.jsonc` crons → `cloudflare-worker.ts` `scheduled`).

- **Weekday 7:30am America/Detroit pull:** cron `30 11 * * 1-5` (EDT) → POST `/api/pull`.
- **Morning letter preview Mon–Sat 8am Detroit:** cron `0 12 * * 1-6` (EDT) → POST `/api/desk/email/send` with `{"preview":true}`. Goes **only** to nickperez@gmail.com (`DESK_LETTER_FALLBACK`), subject prefixed `Preview · `. Idempotent via `morning_letter_preview:YYYY-MM-DD`. Does **not** mark the day as publicly sent. **Live/public send is from Desk** (`/desk/email` → same route without `preview`). Sunday stays off.
- **Nightly KV backup 2am Detroit:** cron `0 6 * * *` (EDT) → read `TRAVERSE_DATA` key `app_data`, write private R2 `traverse-news-backups` (`TRAVERSE_BACKUPS`) as `kv/YYYY-MM-DD/app_data.json` + `kv/latest.json`. No public HTTP route. Runs on the Worker even when Grok Bot weekly usage is exhausted. Deletes dated `kv/YYYY-MM-DD/` objects older than 30 days when listing is available.
- **EST:** shift seasonally (pull 12:30 UTC, letter 13:00 UTC, backup 07:00 UTC) — see `wrangler.jsonc` comments.
- **Recipients:** fake/example/verify addresses are never mailed; fallback is nickperez@gmail.com. No attachments. No Google Drive/Docs/Sheets/Forms hrefs.
- **Never invent reporting.**

## What Traverse News can do that you cannot

- Drive a **real browser** on a persistent computer (Facebook already signed in; Overheard in TC readable).
- Open **bot-blocked** pages such as https://www.traversecity.com/events/ (Simpleview often **403s** cloud / datacenter fetches).
- Read **Overheard** as a tip wire: paraphrase + permalink only — no dump, no invented quotes.
- Talk to Nick in the traverse.news chat and get him to sign in, confirm a source, or publish an original.

## When you are stuck on a fetch

1. **Do not invent** events, quotes, crashes, organizers, or original copy.
2. Say clearly in the **PR description** and in the **user-visible status**:

   > Need Traverse News to pull \<URL\> on the live computer.

3. For Visit TC / other JS calendars, once the list is scraped in-browser, land it with authenticated:

   `POST /api/desk/events/import`

   (default `source_id`: `src_visit_events`). See README → Browser event import.

4. For movie / theatre pages blocked from the Worker (AMC, Old Town Playhouse, Bay Theatre JS app), land listings with:

   `POST /api/desk/shows/import`

   Group by title. Never invent showtimes. Never write Shows into `/whats-on`.

5. Do **not** stop at a shrug or a silent empty pull without that handoff line.

## First handoff URL

https://www.traversecity.com/events/ — sports, community, concerts (not civic-only).

— Handshake from Traverse News, for the next cloud agent on this repo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
