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

- Email: `nina@traverse.news` (or `DEV_DESK_EMAIL`)
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

Desk: `/desk/login`, `/desk`, `/desk/sources/new`, `/desk/sources/[id]`, plus stub tabs Queue / Originals / Email

API: `POST /api/subscribe`, `GET|POST /api/pull`, Desk CRUD under `/api/desk/*`

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

Without Supabase vars the app seeds beats, sources, stories, and events in memory and persists Desk edits to `.data/store.json` during `next dev` / Node. On Cloudflare Workers, use Supabase for durable Desk data.

## Supabase

1. Create a project.
2. Run `supabase/migrations/001_initial.sql` in the SQL editor.
3. Create a staff Auth user.
4. Set the env vars and redeploy.

Seed rows can be inserted from the Desk UI or by adapting `src/lib/data/seed.ts`.

## Cloudflare deploy

**Live:** [https://traverse-news.nickperez.workers.dev](https://traverse-news.nickperez.workers.dev)

Config: `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`.

```bash
npm run deploy
# runs: opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

Preview the Worker build locally:

```bash
npm run preview
```

Secrets already set on the Worker for local Desk mode: `DEV_DESK_PASSWORD`, `DEV_DESK_EMAIL`. Bind Supabase vars the same way when ready:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

OpenNext deploys this app as a **Worker with static assets** (not classic Pages). Point a custom domain at the Worker in the Cloudflare dashboard when you want traverse.news on it.

## Product rules (v1)

- Public nav: Today, What's on, Civic, plus morning email CTA
- Photos only on original stories, and only when they match
- Overheard in TC is On (Facebook tip wire, no scrape yet)
- TC Business News is Off (paywall)
- Morning email preview leads with an original when one exists
- Empty Sports / HS sports beats stay on the Desk only

## License

Private for now.
