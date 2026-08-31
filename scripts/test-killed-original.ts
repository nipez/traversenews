/**
 * Regression: unpublished Center Road / Seeburger must not auto-republish or
 * homepage-lead. Run: npx tsx scripts/test-killed-original.ts
 */
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { createSeedData } from "../src/lib/data/seed";
import {
  isKilledOriginalSlug,
  KILLED_ORIGINAL_SLUGS,
} from "../src/lib/data/scrub";
import { STAFF_PUBLISHED_ORIGINALS } from "../src/lib/data/staff-drafts";
import {
  ensurePublishedStaffOriginals,
  getOriginalBySlug,
  listDrafts,
  resetMemoryStore,
  withSkippedPublicSnapshots,
} from "../src/lib/data/store";
import {
  buildHomeSnapshot,
  buildOriginalsSnapshot,
} from "../src/lib/public-snapshots";
import type { AppData, OriginalDraft, Story } from "../src/lib/types";

const KILLED_SLUG = "center-road-seeburger";
const DRAFT_ID = "draft_center-road-seeburger";

function killedDraft(overrides: Partial<OriginalDraft> = {}): OriginalDraft {
  return {
    id: DRAFT_ID,
    status: "draft",
    title: "Central soccer player killed on Center Road near Mapleton Lane",
    dek: "Unpublished — must not auto-return.",
    body: "Desk draft body.",
    section: "Roads & safety",
    byline: "Nick Perez",
    slug: KILLED_SLUG,
    image_url: null,
    image_credit: null,
    image_caption: null,
    source_urls: [
      "https://www.9and10news.com/2026/08/18/crash-kills-one-injures-another-in-peninsula-township-alcohol-believed-to-be-a-factor/",
    ],
    based_on_story_ids: [],
    source_title: null,
    source_dek: null,
    published_story_id: null,
    created_at: "2026-08-22T14:00:00.000Z",
    updated_at: "2026-08-31T01:20:59.000Z",
    published_at: null,
    ...overrides,
  };
}

function killedStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "story_dd3e72057a3a",
    source_id: "src_original",
    title: "Central soccer player killed on Center Road near Mapleton Lane",
    dek: "Must not be homepage lead.",
    url: `https://traverse.news/story/${KILLED_SLUG}`,
    published_at: "2026-08-31T01:26:44.000Z",
    is_original: true,
    body: "Should not appear on public originals.",
    image_url: null,
    byline: "Nick Perez",
    slug: KILLED_SLUG,
    section: "Roads & safety",
    source_urls: [
      "https://www.9and10news.com/2026/08/18/crash-kills-one-injures-another-in-peninsula-township-alcohol-believed-to-be-a-factor/",
    ],
    ...overrides,
  };
}

function otherOriginal(): Story {
  return {
    id: "story_other_original",
    source_id: "src_original",
    title: "A different published original",
    dek: "Safe lead candidate.",
    url: "https://traverse.news/story/other-original",
    published_at: "2026-08-30T12:00:00.000Z",
    is_original: true,
    body: "Other body.",
    image_url: null,
    byline: "Nick Perez",
    slug: "other-original",
    section: "General",
    source_urls: ["https://www.traverseticker.com/news/example/"],
  };
}

async function main() {
  assert.ok(
    KILLED_ORIGINAL_SLUGS.has(KILLED_SLUG),
    "KILLED_ORIGINAL_SLUGS must include center-road-seeburger",
  );
  assert.equal(isKilledOriginalSlug(KILLED_SLUG), true);
  assert.equal(
    STAFF_PUBLISHED_ORIGINALS.some((d) => d.slug === KILLED_SLUG),
    false,
    "STAFF_PUBLISHED_ORIGINALS must not seed Seeburger",
  );
  assert.equal(STAFF_PUBLISHED_ORIGINALS.length, 0);

  const seed = createSeedData();
  const withKilledStory: AppData = {
    ...seed,
    stories: [killedStory(), otherOriginal(), ...seed.stories],
    drafts: [killedDraft()],
  };

  const home = buildHomeSnapshot(withKilledStory, new Date("2026-08-31T12:00:00Z"));
  assert.notEqual(home.lead?.slug, KILLED_SLUG);
  assert.equal(home.lead?.slug, "other-original");

  const homeOnlyKilled = buildHomeSnapshot(
    { ...seed, stories: [killedStory(), ...seed.stories] },
    new Date("2026-08-31T12:00:00Z"),
  );
  assert.equal(homeOnlyKilled.lead, null, "never invent a lead when only killed original exists");

  const originals = buildOriginalsSnapshot(withKilledStory);
  assert.equal(originals.bySlug[KILLED_SLUG], undefined);
  assert.ok(originals.bySlug["other-original"]);

  // Unpublished draft + ensure/listDrafts must not republish.
  await withSkippedPublicSnapshots(async () => {
    resetMemoryStore({
      ...seed,
      stories: seed.stories.filter((s) => !s.is_original),
      drafts: [killedDraft()],
    });

    await ensurePublishedStaffOriginals();
    const afterEnsure = await listDrafts();
    const draft = afterEnsure.find((d) => d.id === DRAFT_ID);
    assert.ok(draft, "draft row should remain");
    assert.equal(draft.status, "draft");
    assert.equal(draft.published_story_id, null);
    assert.equal(
      afterEnsure.filter((d) => d.slug === KILLED_SLUG && d.status === "published")
        .length,
      0,
    );

    // Public getter stays dead even if a Story row is present (stale write-back).
    resetMemoryStore({
      ...seed,
      stories: [killedStory(), ...seed.stories.filter((s) => !s.is_original)],
      drafts: [killedDraft()],
    });
    assert.equal(await getOriginalBySlug(KILLED_SLUG), undefined);
  });

  // Avoid leaving a local store.json from this script.
  try {
    await rm(join(process.cwd(), ".data", "store.json"), { force: true });
  } catch {
    // ignore
  }

  console.log("ok — killed original stays unpublished and off homepage/public story");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
