/**
 * Measure / document public-page KV ops before vs after compact snapshots.
 * Runs builders against seed data; counts logical gets (no Cloudflare dashboard).
 *
 *   npx tsx scripts/measure-public-kv-ops.ts
 */
import { createSeedData } from "../src/lib/data/seed";
import {
  buildAllPublicSnapshots,
  PUBLIC_KEYS,
} from "../src/lib/public-snapshots";
import { buildSitemapXml } from "../src/lib/sitemap";

type Counter = { gets: number; lists: number; puts: number; keys: string[] };

function countBefore(): Record<string, Counter> {
  // Prior public path: every page called getAppData/loadStore → 1 get of app_data.
  // No kv.list (hypothesis of list+N was wrong — verified single fat key).
  // Clustering / filtering ran on every GET (CPU risk → CF 1102).
  const fat: Counter = {
    gets: 1,
    lists: 0,
    puts: 0,
    keys: ["app_data"],
  };
  return {
    "/": { ...fat, keys: [...fat.keys] },
    "/schools": { ...fat, keys: [...fat.keys] },
    "/whats-on": { ...fat, keys: [...fat.keys] },
    "/civic": { ...fat, keys: [...fat.keys] },
    "/sports": { ...fat, keys: [...fat.keys] },
    "/email": { ...fat, keys: [...fat.keys] },
    "/editions": { ...fat, keys: [...fat.keys] },
    "/sitemap.xml (warm)": {
      gets: 1,
      lists: 0,
      puts: 0,
      keys: ["cache:sitemap.xml:v1"],
    },
    "/sitemap.xml (cold)": {
      gets: 2,
      lists: 0,
      puts: 1,
      keys: ["cache:sitemap.xml:v1", "app_data"],
    },
  };
}

function countAfter(): Record<string, Counter> {
  const one = (key: string): Counter => ({
    gets: 1,
    lists: 0,
    puts: 0,
    keys: [key],
  });
  return {
    "/": one(PUBLIC_KEYS.home),
    "/schools": one(PUBLIC_KEYS.schools),
    "/whats-on": one(PUBLIC_KEYS.events),
    "/civic": one(PUBLIC_KEYS.civic),
    "/sports": one(PUBLIC_KEYS.sports),
    "/email": one(PUBLIC_KEYS.email),
    "/editions": one(PUBLIC_KEYS.editions),
    "/sitemap.xml (warm)": one("cache:sitemap.xml:v1"),
    "/sitemap.xml (cold after deploy)": {
      gets: 1,
      lists: 0,
      puts: 0,
      keys: ["cache:sitemap.xml:v1"],
      // Warm on every saveStore / pull via writeAllPublicSnapshots.
    },
  };
}

function main() {
  const data = createSeedData();
  const all = buildAllPublicSnapshots(data);
  const sizes = Object.fromEntries(
    Object.entries({
      [PUBLIC_KEYS.home]: all.home,
      [PUBLIC_KEYS.schools]: all.schools,
      [PUBLIC_KEYS.events]: all.events,
      [PUBLIC_KEYS.civic]: all.civic,
      [PUBLIC_KEYS.sports]: all.sports,
      [PUBLIC_KEYS.email]: all.email,
      [PUBLIC_KEYS.alerts]: all.alerts,
      [PUBLIC_KEYS.editions]: all.editions,
      [PUBLIC_KEYS.emailArchive]: all.emailArchive,
      [PUBLIC_KEYS.originals]: all.originals,
      app_data: data,
    }).map(([k, v]) => [k, JSON.stringify(v).length]),
  );

  const sitemap = buildSitemapXml({
    stories: data.stories,
    editions: data.editions,
    email_editions: data.email_editions,
  });

  console.log("=== Verified access pattern ===");
  console.log(
    "BEFORE: not list+N. Each public GET did 1× kv.get(app_data) then",
  );
  console.log(
    "clustered/filtered the full store in-request (CPU → Error 1102 risk).",
  );
  console.log(
    "AFTER: 1× kv.get(public:<page>:v1) compact JSON; no list; no per-story loop.",
  );
  console.log("");
  console.log("=== KV ops per warm visitor GET (reasoned from code) ===");
  console.log("BEFORE:", JSON.stringify(countBefore(), null, 2));
  console.log("AFTER:", JSON.stringify(countAfter(), null, 2));
  console.log("");
  console.log("=== Snapshot byte sizes (seed data) ===");
  console.log(JSON.stringify(sizes, null, 2));
  console.log("sitemap.xml bytes:", sitemap.length);
  console.log(
    "home vs app_data ratio:",
    (sizes[PUBLIC_KEYS.home] / sizes.app_data).toFixed(3),
  );
}

main();
