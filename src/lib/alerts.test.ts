/**
 * Alerts strip incident dedupe.
 * Run: npx tsx --test src/lib/alerts.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alertsSameIncident,
  dedupeAlertIncidents,
  preferAlertCard,
  selectAlerts,
} from "./alerts";
import type { Source, Story } from "./types";

const sources: Source[] = [
  {
    id: "src_gt911",
    name: "Grand Traverse 911",
    homepage: "https://www.facebook.com/GrandTraverse911",
    feed_url: "https://www.facebook.com/GrandTraverse911",
    pull_method: "facebook",
    beat_id: "beat_public_safety",
    enabled: true,
    notes: "",
  },
  {
    id: "src_ticker_fb",
    name: "Ticker Facebook",
    homepage: "https://www.facebook.com/TraverseCityTicker",
    feed_url: "https://www.facebook.com/TraverseCityTicker",
    pull_method: "facebook",
    beat_id: "beat_public_safety",
    enabled: true,
    notes: "",
  },
];

function story(partial: Partial<Story> & Pick<Story, "id" | "source_id" | "title" | "url">): Story {
  return {
    dek: "",
    published_at: "2026-08-25T12:00:00.000Z",
    is_original: false,
    body: null,
    image_url: null,
    byline: null,
    slug: null,
    ...partial,
  };
}

describe("alertsSameIncident", () => {
  it("matches South Airport / Logan across thin 911, Ticker sewer, and 911 update", () => {
    const hand = {
      title: "South Airport Road Closed Near Logan's Landing",
      dek: "",
      url: "https://www.facebook.com/GrandTraverse911/posts/pfbidHAND",
    };
    const ticker = {
      title: "Sewer break closes South Airport Road near Logan's Landing",
      dek: "A sewer main break has closed South Airport Road near Logan's Landing. Crews are on scene.",
      url: "https://www.facebook.com/TraverseCityTicker/posts/pfbidTICKER",
    };
    const update = {
      title: "UPDATE: South Airport Road still closed near Logan's Landing",
      dek: "County Roads: South Airport remains closed near Logan's Landing while crews work the break.",
      url: "https://www.facebook.com/GrandTraverse911/posts/pfbidUPDATE",
    };

    assert.equal(alertsSameIncident(hand, ticker), true);
    assert.equal(alertsSameIncident(hand, update), true);
    assert.equal(alertsSameIncident(ticker, update), true);
  });

  it("does not match unrelated closures", () => {
    const a = {
      title: "South Airport Road Closed Near Logan's Landing",
      url: "https://example.com/a",
    };
    const b = {
      title: "Three Mile/Hammond intersection closure extended to Wednesday",
      url: "https://example.com/b",
    };
    assert.equal(alertsSameIncident(a, b), false);
  });
});

describe("preferAlertCard / selectAlerts", () => {
  it("keeps one public card and prefers dek + real URL", () => {
    const thin = story({
      id: "story_hand",
      source_id: "src_gt911",
      title: "South Airport Road Closed Near Logan's Landing",
      dek: "",
      url: "https://www.facebook.com/GrandTraverse911/posts/pfbidHAND",
      published_at: "2026-08-25T18:00:00.000Z",
    });
    const ticker = story({
      id: "story_ticker",
      source_id: "src_ticker_fb",
      title: "Sewer break closes South Airport Road near Logan's Landing",
      dek: "A sewer main break has closed South Airport Road near Logan's Landing.",
      url: "https://www.facebook.com/TraverseCityTicker/posts/pfbidTICKER",
      published_at: "2026-08-25T16:00:00.000Z",
    });
    const update = story({
      id: "story_update",
      source_id: "src_gt911",
      title: "South Airport Road still closed near Logan's Landing",
      dek: "Update from County Roads on the South Airport / Logan's Landing closure.",
      url: "https://www.facebook.com/GrandTraverse911/posts/pfbidUPDATE",
      published_at: "2026-08-25T17:00:00.000Z",
    });
    const other = story({
      id: "story_other",
      source_id: "src_gt911",
      title: "Power out after vehicle accident; Sixth and Spruce shut down",
      dek: "TCLP on scene.",
      url: "https://www.facebook.com/GrandTraverse911/posts/pfbidPOWER",
      published_at: "2026-08-24T12:00:00.000Z",
    });

    const preferred = preferAlertCard(thin, ticker);
    assert.equal(preferred.id, "story_ticker");

    const collapsed = dedupeAlertIncidents([thin, ticker, update, other]);
    assert.equal(collapsed.length, 2);
    assert.equal(
      collapsed.some((s) => s.id === "story_hand"),
      false,
    );

    const strip = selectAlerts([thin, ticker, update, other], sources, {
      limit: 3,
    });
    assert.equal(strip.length, 2);
    assert.equal(strip.filter((s) => /airport|logan/i.test(s.title)).length, 1);
    assert.ok(strip[0].dek.trim().length > 0);
  });
});
