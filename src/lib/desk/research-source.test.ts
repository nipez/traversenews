/**
 * Focused tests for Facebook Smart Add identity / post handling.
 * Run: npx tsx --test src/lib/desk/research-source.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Beat, Source } from "../types";
import {
  facebookPageIdentity,
  isFacebookPostUrl,
  researchSourceUrl,
} from "./research-source";

const beats: Beat[] = [
  { id: "beat_social", name: "Social", slug: "social", sort: 1 },
  { id: "beat_general", name: "General", slug: "general-news", sort: 2 },
];

const overheard: Source = {
  id: "src_overheard",
  name: "Overheard in TC",
  homepage: "https://www.facebook.com/groups/overheardintraversecity/",
  feed_url: "https://www.facebook.com/groups/overheardintraversecity/",
  pull_method: "facebook",
  beat_id: "beat_social",
  enabled: true,
  notes:
    "Tip wire. No Worker scrape. Paste tips via Desk Tips — do not invent posts.",
};

const ticker: Source = {
  id: "src_ticker_fb",
  name: "Traverse City Ticker",
  homepage: "https://www.facebook.com/TraverseCityTicker",
  feed_url: "https://www.facebook.com/TraverseCityTicker",
  pull_method: "facebook",
  beat_id: "beat_social",
  enabled: true,
  notes: "",
};

describe("facebookPageIdentity", () => {
  it("uses vanity for pages", () => {
    assert.equal(
      facebookPageIdentity("https://www.facebook.com/BARCinTC"),
      "barcintc",
    );
    assert.equal(
      facebookPageIdentity("https://www.facebook.com/TraverseCityTicker/"),
      "traversecityticker",
    );
  });

  it("uses groups/<slug> for groups", () => {
    assert.equal(
      facebookPageIdentity(
        "https://www.facebook.com/groups/overheardintraversecity/",
      ),
      "groups/overheardintraversecity",
    );
  });

  it("uses profile.php?id=", () => {
    assert.equal(
      facebookPageIdentity("https://www.facebook.com/profile.php?id=12345"),
      "id:12345",
    );
  });

  it("extracts vanity from a /posts/ URL", () => {
    assert.equal(
      facebookPageIdentity(
        "https://www.facebook.com/BARCinTC/posts/pfbid0EkJ2ys8x4ae8K6SFKH65bxCS11JmQFrHfYkxixyEFKxSykXzLDa8e8jh8y4CDVGEl",
      ),
      "barcintc",
    );
  });

  it("does not treat facebook.com host alone as an identity", () => {
    assert.equal(facebookPageIdentity("https://www.facebook.com/"), null);
  });
});

describe("isFacebookPostUrl", () => {
  it("detects posts, permalink, story_fbid, reel, videos, photo, share", () => {
    assert.equal(
      isFacebookPostUrl(
        "https://www.facebook.com/BARCinTC/posts/pfbid0EkJ2ys8x4ae8K6SFKH65bxCS11JmQFrHfYkxixyEFKxSykXzLDa8e8jh8y4CDVGEl",
      ),
      true,
    );
    assert.equal(
      isFacebookPostUrl(
        "https://www.facebook.com/permalink.php?story_fbid=123&id=456",
      ),
      true,
    );
    assert.equal(
      isFacebookPostUrl("https://www.facebook.com/reel/12345"),
      true,
    );
    assert.equal(
      isFacebookPostUrl("https://www.facebook.com/BARCinTC/videos/99"),
      true,
    );
    assert.equal(
      isFacebookPostUrl("https://www.facebook.com/photo.php?fbid=1"),
      true,
    );
    assert.equal(
      isFacebookPostUrl("https://www.facebook.com/share/p/abc"),
      true,
    );
  });

  it("does not flag page or group URLs", () => {
    assert.equal(
      isFacebookPostUrl("https://www.facebook.com/BARCinTC"),
      false,
    );
    assert.equal(
      isFacebookPostUrl(
        "https://www.facebook.com/groups/overheardintraversecity/",
      ),
      false,
    );
  });
});

describe("researchSourceUrl Facebook", () => {
  it("does not flag a BARC /posts/ URL as Overheard", async () => {
    const r = await researchSourceUrl({
      url: "https://www.facebook.com/BARCinTC/posts/pfbid0EkJ2ys8x4ae8K6SFKH65bxCS11JmQFrHfYkxixyEFKxSykXzLDa8e8jh8y4CDVGEl",
      beats,
      existing: [overheard, ticker],
    });
    assert.equal(r.duplicate_of, null);
    assert.equal(r.facebook_post, true);
    assert.equal(r.enabled, false);
    assert.match(r.name, /BARCinTC/i);
    assert.doesNotMatch(r.name, /Overheard/i);
    assert.doesNotMatch(r.notes, /Overheard/i);
    assert.ok(
      r.warnings.some((w) => /wrong door|not a standing source|Desk Links/i.test(w)) ||
        r.findings.some((f) => /not a page or group|Desk Links/i.test(f)),
    );
  });

  it("still matches Overheard group URL to Overheard", async () => {
    const r = await researchSourceUrl({
      url: "https://www.facebook.com/groups/overheardintraversecity/",
      beats,
      existing: [overheard, ticker],
    });
    assert.equal(r.duplicate_of?.id, "src_overheard");
    assert.equal(r.facebook_post, false);
    assert.equal(r.enabled, true);
  });

  it("does not match BARCinTC page to Overheard", async () => {
    const r = await researchSourceUrl({
      url: "https://www.facebook.com/BARCinTC",
      beats,
      existing: [overheard, ticker],
    });
    assert.equal(r.duplicate_of, null);
    assert.equal(r.facebook_post, false);
    assert.equal(r.pull_method, "facebook");
    assert.match(r.name, /BARCinTC/i);
  });

  it("matches the same page vanity as a duplicate", async () => {
    const r = await researchSourceUrl({
      url: "https://www.facebook.com/TraverseCityTicker/",
      beats,
      existing: [overheard, ticker],
    });
    assert.equal(r.duplicate_of?.id, "src_ticker_fb");
  });
});
