# traverse.news

Traverse City local news: original reporting in full, aggregated headlines from other desks (headline + dek + source pills + link out), events, and civic listings. Staff Desk manages sources by beat.

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

API: `POST /api/subscribe`, `GET|POST /api/pull`, Desk CRUD under `/api/desk/*` (including `/api/desk/originals`)

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
- Payload: lead (staff original if any, else other-desk wire), around-the-bay cards, tonight/events from ICS, civic (no third-party full bodies)
- Public: `/editions`, `/editions/[date]` (linked from the footer)
- Desk: `/desk/editions`

## Editorial

**Hard rule — never invent journalism.**

- Do **not** invent quotes, events, crashes, officials, or original articles.
- Seed data may include **real source records only** (beats, outlet names, feed/ICS URLs, enable flags, notes). No fake `Story` bodies. No fake bylines on fiction. No placeholder wire cards that point at outlet homepages instead of article permalinks.
- Homepage originals / “More from us” stay **empty** until a real piece is saved in the Desk. Empty layout is correct; do not invent copy to make the page look full.
- Around the bay and civic/events listings must come from a real RSS/ICS pull (real title, dek, permalink). If a pull has not run yet, show empty — not fabricated seed stories.
- Around the bay filters lifestyle columns/briefs/calendars and **mixes desks** (about 3 slots max per outlet) so one feed cannot dominate the homepage.
- If there is no staff original, the homepage lead may be empty or the first clustered live wire card, labeled **From other desks**, never as traverse.news reporting.
- `src/lib/data/scrub.ts` strips known invented seed IDs from KV on load. Do not reintroduce those slugs or placeholder journalism.
- **Desk originals workflow:** Nick drafts from a live pulled story (real title/dek/permalink → `source_urls[]`), edits in Desk, then publishes. Status is `draft | published`. Unpublished drafts never appear on the public site. Publish writes an `is_original` story (byline Nick Perez / Desk) shown as traverse.news reporting. Optional `POST /api/desk/originals/[id]/generate` uses `OPENAI_API_KEY` when set; without it, Nick writes the body himself. Generation must not invent quotes or facts beyond the cited source.

## Desk originals

1. Pull feeds so Around the bay has live items.
2. Desk → Originals → **Draft from a pulled story**.
3. Edit title/dek/body; keep `source_urls` accurate; run the checklist.
4. Optional: **Generate from source** if `OPENAI_API_KEY` is configured (still review — no invented quotes).
5. **Publish** → public `/story/[slug]` + homepage lead / More from us.
6. **Unpublish** or delete removes it from the public site.

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
