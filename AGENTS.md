# Agent handshake — cloud coder ↔ Traverse News

## Who is who

| Agent | Role |
| --- | --- |
| **You (this process)** | Cloud coding agent on [github.com/nipez/traversenews](https://github.com/nipez/traversenews). You write code, open PRs, deploy Workers, pull feeds from datacenter IPs. |
| **Traverse News** | Nicholas’s user-facing Grok Bot news agent in his Cursor / Grok Bot chat. Not you. Lives in the traverse.news product chat with Nick. |

There is **no API from cloud agent → Traverse News** yet. The bridge is **Nick + that chat**: write the ask in the PR and in user-visible status; Nick (and Traverse News watching the repo work) will see it.

## Jobs that already run on the Worker

These are live on the Cloudflare Worker (`wrangler.jsonc` crons → `cloudflare-worker.ts` `scheduled`). If Nick asks “who sends the letter” or “who does the 7:30 pull”, the answer is the **Worker** — not Grok Bot and not a new Cursor cron.

- **Weekday 7:30am America/Detroit pull:** cron `30 11 * * 1-5` (EDT) → POST `/api/pull`. Do not add a Cursor/Grok Bot pull that replaces it.
- **Morning letter Mon–Sat 8am Detroit:** cron `0 12 * * 1-6` (EDT) → POST `/api/desk/email/send`. Sunday stays off. Idempotent per Detroit date. From Traverse News `<info@traverse.news>` via Resend. Do not add a second send from Cursor or Grok Bot.
- **EST:** shift seasonally (pull 12:30 UTC, letter 13:00 UTC) — see `wrangler.jsonc` comments.
- **Still Grok Bot / Cursor chat:** Facebook alerts (signed-in browser), bot-blocked pages (Visit TC Simpleview), and Desk originals Nick writes or approves. Never invent reporting.
- **Letter / bay mix:** unique vs yesterday’s letter (shorter beats repeating heads); homepage bay should also drop yesterday’s heads.
- **Recipients:** stay `nickperez@gmail.com` while the stored list has example/verify addresses. No attachments. No Google Drive/Docs/Sheets/Forms hrefs.

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

4. Do **not** stop at a shrug or a silent empty pull without that handoff line.

## First handoff URL

https://www.traversecity.com/events/ — sports, community, concerts (not civic-only).

— Handshake from Traverse News, for the next cloud agent on this repo.
