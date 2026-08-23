# traverse.news

Traverse City local news: original reporting in full, aggregated headlines from other desks (headline + dek + source pills + link out), events, and civic listings. Staff Desk manages sources by beat.

## Talk to Traverse News

Cloud coding agents on this repo are **not** Traverse News. Traverse News is Nick’s user-facing Grok Bot in the traverse.news Cursor chat: real browser, signed-in Facebook / Overheard tip wire, pages that **403 from datacenters** (e.g. Visit TC Simpleview).

**When a fetch is blocked:** do not invent events or quotes. Say in the PR and in user-visible status: **Need Traverse News to pull \<URL\> on the live computer.** There is no cloud→bot API yet — Nick + that chat is the bridge. Full handshake: [`AGENTS.md`](./AGENTS.md). Event lists land via `POST /api/desk/events/import`.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase (optional) for Postgres + Desk auth
- Cloudflare via `@opennextjs/cloudflare` + Wrangler
- Local JSON/memory seed when Supabase env vars are missing

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Desk (local mode): [http://localhost:3000/desk/login](http://localhost:3000/desk/login)

- Email: `nick@traverse.news` (or `DEV_DESK_EMAIL`)
- Password: `desk` (or `DEV_DESK_PASSWORD`)

### Pull feeds

Enabled RSS and ICS sources:

```bash
# in the browser or with curl
curl -X POST http://localhost:3000/api/pull

# or
npm run pull
```

HTML, Facebook, and original sources are stored but not auto-fetched in v1. Aggregated cards never store full bodies from other desks.

## Routes

Public: `/`, `/whats-on`, `/civic`, `/story/[slug]`, `/email`

Desk: `/desk/login`, `/desk`, `/desk/sources/new`, `/desk/sources/[id]`, `/desk/originals`, `/desk/originals/new`, `/desk/originals/[id]`, plus Queue / Email / Editions

API: `POST /api/subscribe`, `GET|POST /api/pull`, Desk CRUD under `/api/desk/*` (including `/api/desk/originals`, `POST /api/desk/sources/research`, `POST /api/desk/events/import`)

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key for Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional admin key |
| `DEV_DESK_PASSWORD` | Local Desk password when Supabase is unset |
| `DEV_DESK_EMAIL` | Local Desk email |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

Without Supabase vars the app seeds **beats and sources** only (empty stories/events), then fills the public site from `/api/pull`. Desk edits persist to `.data/store.json` during `next dev` / Node. On Cloudflare Workers, `TRAVERSE_DATA` KV holds the durable store.

## Supabase

1. Create a project.
2. Run `supabase/migrations/001_initial.sql` in the SQL editor.
3. Create a staff Auth user.
4. Set the env vars and redeploy.

Source catalog lives in `src/lib/data/seed.ts` (feeds and beats only). Do not paste invented journalism into seed — write real pieces in Desk when ready.

## Cloudflare deploy

**Live:** [https://traverse-news.nickperez.workers.dev](https://traverse-news.nickperez.workers.dev)

Config: `wrangler.jsonc`, `cloudflare-worker.ts` (custom OpenNext entry + cron), `open-next.config.ts`, `public/_headers`.

```bash
npm run deploy
# runs: opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

You must run `npx wrangler deploy` / `npm run deploy` after changing bindings in `wrangler.jsonc` so the Worker picks up the new KV namespace and cron.

Preview the Worker build locally:

```bash
npm run preview
```

### Persistent store (KV)

Pulled stories, events, Desk source edits, and email subscribers persist in Cloudflare KV. Binding name: **`TRAVERSE_DATA`**. Key: `app_data`.

This does **not** require Supabase. Local `next dev` still uses `.data/store.json` (or in-memory seed) when the binding is unavailable.

Create namespaces (once per account):

```bash
npx wrangler kv namespace create traverse-news-data
npx wrangler kv namespace create traverse-news-data --preview
```

Put the returned ids into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "TRAVERSE_DATA",
    "id": "<production id>",
    "preview_id": "<preview id>"
  }
]
```

Then regenerate types and deploy:

```bash
npx wrangler types --env-interface CloudflareEnv
npm run deploy
```

Verify a pull lands in KV and shows on the homepage:

```bash
curl -X POST https://traverse-news.nickperez.workers.dev/api/pull
# response includes "persisted":"kv"
curl https://traverse-news.nickperez.workers.dev/
# Around the bay should be live RSS (Ticker / IPR / 9&10), not seed placeholders
```

### Morning cron

Weekdays at **11:30 UTC** (7:30am EDT): `30 11 * * 1-5` in `wrangler.jsonc` → `cloudflare-worker.ts` `scheduled` handler POSTs `/api/pull` via the self service binding.

Test locally:

```bash
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=30+11+*+*+1-5"
```

Secrets already set on the Worker for Desk demo mode: `DEV_DESK_PASSWORD`, `DEV_DESK_EMAIL`. Bind Supabase vars the same way when ready (optional):

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

OpenNext deploys this app as a **Worker with static assets** (not classic Pages). Point a custom domain at the Worker in the Cloudflare dashboard when you want traverse.news on it.

## Editions archive

Each successful `/api/pull` writes (or refreshes) today's edition snapshot in the same `TRAVERSE_DATA` KV blob (`app_data.editions[]`).

- Date key: `YYYY-MM-DD` in **America/Detroit**
- One edition per day; later pulls the same day overwrite that day's snapshot so the archive matches the last homepage readers saw
- Payload: lead (staff original only — empty if none), around-the-bay cards, tonight/community events, civic meetings (no third-party full bodies)
- Public: `/editions`, `/editions/[date]` (linked from the footer)
- Desk: `/desk/editions`

## Editorial

**Hard rule — never invent journalism.**

- Do **not** invent quotes, events, crashes, officials, or original articles.
- Seed data may include **real source records only** (beats, outlet names, feed/ICS URLs, enable flags, notes). No fake `Story` bodies. No fake bylines on fiction. No placeholder wire cards that point at outlet homepages instead of article permalinks.
- Homepage originals / “More from us” stay **empty** until a real piece is saved in the Desk. Empty layout is correct; do not invent copy to make the page look full.
- Around the bay and civic/events listings must come from a real RSS/ICS pull (real title, dek, permalink). If a pull has not run yet, show empty — not fabricated seed stories.
- Around the bay filters lifestyle columns/briefs/calendars and **mixes desks** (about 3 slots max per outlet) so one feed cannot dominate the homepage.
- **Tonight & What's on** = night-out (concerts, markets, festivals, Visit TC, Interlochen, TADL). **Civic** = government + school board only. Meeting titles never lead What's on.
- If there is no staff original, the homepage hero stays empty and **Around the bay** starts the page. Never promote another desk's crime story to the hero.
- `src/lib/data/scrub.ts` strips known invented seed IDs from KV on load. Do not reintroduce those slugs or placeholder journalism.
- **Desk originals workflow:** Nick drafts from a live pulled story (real title/dek/permalink → `source_urls[]`), edits in Desk, then publishes. Status is `draft | published`. Unpublished drafts never appear on the public site. Publish writes an `is_original` story (byline Nick Perez / Desk) shown as traverse.news reporting. Optional `POST /api/desk/originals/[id]/generate` uses `OPENAI_API_KEY` when set; without it, Nick writes the body himself. Generation must not invent quotes or facts beyond the cited source.

## Desk originals

1. Pull feeds so Around the bay has live items.
2. Desk → Originals → **Draft from a pulled story**.
3. Edit title/dek/body; keep `source_urls` accurate; run the checklist.
4. Optional: **Generate from source** if `OPENAI_API_KEY` is configured (still review — no invented quotes).
5. **Publish** → public `/story/[slug]` + homepage lead / More from us.
6. **Unpublish** or delete removes it from the public site.

### Smart add (sources)

On `/desk` and `/desk/sources/new`: paste a URL → **Research** → review card (name, homepage, feed, method, beat, enabled, notes) → confirm. Never silent insert. Detects RSS/Atom/ICS when present; otherwise `html`. Facebook → tip wire. Duplicates flagged by host/feed — actions are **Update existing source** (keep id/name/beat; replace homepage/feed/method/notes), **Add source**, or **Skip**.

### Browser event import (Visit TC / bot walls)

Cloud Agents cannot fetch bot-blocked calendars (e.g. Visit TC Simpleview → 403). **Do not invent events.** **Need Traverse News to pull this URL on the live computer** (see [`AGENTS.md`](./AGENTS.md) — Talk to Traverse News). Nick relays; there is no cloud→bot API yet.

```bash
# After Desk login cookie, or with Bearer token:
curl -X POST https://traverse-news.nickperez.workers.dev/api/desk/events/import \
  -H "Authorization: Bearer $DESK_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "src_visit_events",
    "replace": true,
    "events": [
      {
        "title": "Concert example",
        "starts_at": "2026-08-23T23:00:00.000Z",
        "place": "Downtown Traverse City",
        "url": "https://www.traversecity.com/event/example/123/"
      }
    ]
  }'
```

- Auth: Desk session cookie **or** `Authorization: Bearer` (`DESK_IMPORT_TOKEN` if set, else `DEV_DESK_PASSWORD`).
- Default `source_id`: `src_visit_events` (Visit TC Events — sports, community, concerts).
- `starts_at`: ISO with `Z`/offset, **or** naive `YYYY-MM-DDTHH:mm` treated as **America/Detroit** wall time (not Worker UTC). Relative words (`tomorrow`) are rejected.
- Recurring markets/brunches: prefer `{ "recurrence_weekdays": ["Wed","Sat"], "recurrence_time": "07:30" }` — expands next Detroit occurrences. Do not invent a next-day one-off.
- Replaces that source’s rows in KV when `replace: true` (default). Never invents missing titles/times — invalid rows are skipped.
- First handoff URL: https://www.traversecity.com/events/
- Do **not** re-import wrong Sunday rows for Saturday markets (Sara Hardy, Bubbly Brunch, etc.).

### Browser story import (Facebook alerts)

Cloud Agents do not scrape Facebook. **Do not invent posts.** Traverse News pulls Grand Traverse 911 (and similar alert pages) on the live computer and POSTs here. The homepage **Alerts** strip shows `src_gt911` stories only; it stays hidden when empty.

```bash
curl -X POST https://traverse-news.nickperez.workers.dev/api/desk/stories/import \
  -H "Authorization: Bearer $DESK_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "src_gt911",
    "replace": true,
    "stories": [
      {
        "title": "Power outage — west side TC",
        "dek": "Crews on scene. Avoid downed lines.",
        "url": "https://www.facebook.com/GrandTraverse911/posts/example",
        "published_at": "2026-08-23T18:00:00-04:00"
      }
    ]
  }'
```

- Auth: same as events import (`DESK_IMPORT_TOKEN` or `DEV_DESK_PASSWORD`).
- Default `source_id`: `src_gt911`.
- Replaces that source’s story rows when `replace: true` (default). Does not wipe RSS / originals.
- RSS pulls preserve browser-imported alert stories for other source ids.

## Product rules (v1)

- Public nav: Today, What's on, Civic, plus morning email CTA
- Photos only on original stories, and only when they match
- Overheard in TC is On (Facebook tip wire, no scrape yet)
- TC Business News is Off (paywall)
- Morning email preview leads with an original when one exists; otherwise a live wire card
- Empty Sports / HS sports beats stay on the Desk only
- Editorial rule above is non-negotiable for seed, homepage, and Desk originals

## License

Private for now.
