import type { Beat, PullMethod, Source } from "@/lib/types";

export type SourceResearchResult = {
  input_url: string;
  name: string;
  homepage: string;
  feed_url: string | null;
  pull_method: PullMethod;
  beat_id: string;
  enabled: boolean;
  notes: string;
  /** Human-readable findings for the review card. */
  findings: string[];
  warnings: string[];
  duplicate_of: { id: string; name: string; beat_id: string } | null;
  fetch_error: string | null;
  paywall_suspected: boolean;
  /**
   * True when the pasted URL is a Facebook post/permalink/reel/etc.
   * Not a standing page or group — desk should use Links or Events, not Sources.
   */
  facebook_post?: boolean;
};

function normalizeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(withProto);
}

function hostKey(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isFacebookHost(hostnameOrUrl: string): boolean {
  const host = hostnameOrUrl.includes("://")
    ? hostKey(hostnameOrUrl)
    : hostnameOrUrl.replace(/^www\./i, "").toLowerCase();
  return host === "facebook.com" || host.endsWith(".facebook.com");
}

/** Path segments that are content types / app routes, not page vanities. */
const FACEBOOK_RESERVED_SEGMENTS = new Set([
  "posts",
  "permalink.php",
  "story.php",
  "stories",
  "reel",
  "reels",
  "videos",
  "watch",
  "photo.php",
  "photo",
  "photos",
  "share",
  "share.php",
  "sharer",
  "sharer.php",
  "events",
  "marketplace",
  "gaming",
  "login",
  "dialog",
  "pages",
  "people",
  "pg",
  "hashtag",
  "search",
  "help",
  "settings",
  "messages",
  "notifications",
  "profile.php",
]);

/**
 * Stable page/group identity for Facebook duplicate checks.
 * Host alone is never enough — BARCinTC ≠ Overheard ≠ TraverseCityTicker.
 * Returns null when the URL has no usable page/group identity.
 * Identities are lowercased for comparison.
 */
export function facebookPageIdentity(raw: string): string | null {
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (!isFacebookHost(u.hostname)) return null;

    const profileId = u.searchParams.get("id");
    if (/\/profile\.php$/i.test(u.pathname.replace(/\/$/, "")) && profileId) {
      return `id:${profileId}`;
    }

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    if (parts[0].toLowerCase() === "groups" && parts[1]) {
      return `groups/${parts[1].toLowerCase()}`;
    }

    const first = parts[0].toLowerCase();
    if (FACEBOOK_RESERVED_SEGMENTS.has(first)) return null;
    return first;
  } catch {
    return null;
  }
}

/** Original path vanity casing for display names (identity stays lowercased). */
function facebookVanityLabel(raw: string): string | null {
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (!isFacebookHost(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    if (parts[0].toLowerCase() === "groups" && parts[1]) return parts[1];
    if (FACEBOOK_RESERVED_SEGMENTS.has(parts[0].toLowerCase())) return null;
    return parts[0];
  } catch {
    return null;
  }
}

/** Post / permalink / media URL — not a standing page or group source. */
export function isFacebookPostUrl(raw: string | URL): boolean {
  try {
    const u = typeof raw === "string" ? new URL(
      raw.includes("://") ? raw : `https://${raw}`,
    ) : raw;
    if (!isFacebookHost(u.hostname)) return false;
    const path = u.pathname.toLowerCase();
    const search = u.search.toLowerCase();
    if (path.includes("/posts/")) return true;
    if (path.includes("/permalink.php")) return true;
    if (path.includes("/story.php")) return true;
    if (path.includes("/reel/") || path.includes("/reels/")) return true;
    if (path.includes("/videos/")) return true;
    if (path.includes("/photo.php") || /\/photos?\//.test(path)) return true;
    if (path.includes("/share/") || path.includes("/share.php")) return true;
    if (search.includes("story_fbid")) return true;
    return false;
  } catch {
    return false;
  }
}

function facebookStandingHomepage(u: URL): string {
  const identity = facebookPageIdentity(u.toString());
  if (!identity) return u.toString().replace(/\/$/, "");
  if (identity.startsWith("id:")) {
    return `https://www.facebook.com/profile.php?id=${identity.slice(3)}`;
  }
  if (identity.startsWith("groups/")) {
    return `https://www.facebook.com/${identity}`;
  }
  return `https://www.facebook.com/${identity}`;
}

function displayNameFromFacebookUrl(raw: string): string {
  const label = facebookVanityLabel(raw);
  if (label) {
    // Keep camel/Pascal vanity as-is (BARCinTC).
    if (/[a-z]/.test(label) && /[A-Z]/.test(label) && !/[\s_-]/.test(label)) {
      return label;
    }
    return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const identity = facebookPageIdentity(raw);
  if (identity?.startsWith("id:")) return `Facebook ${identity.slice(3)}`;
  return "Facebook source";
}

function sameFeed(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return (
      hostKey(a) === hostKey(b) &&
      ua.pathname.replace(/\/$/, "") === ub.pathname.replace(/\/$/, "")
    );
  } catch {
    return a.replace(/\/$/, "") === b.replace(/\/$/, "");
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function titleFromHtml(html: string, fallback: string): string {
  const og =
    html.match(
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    );
  if (og?.[1]) return decodeEntities(og[1]);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (t) {
    const cleaned = decodeEntities(t.replace(/\s+/g, " "))
      .split(/[|\-–—]/)[0]
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return fallback;
}

function absoluteUrl(base: URL, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function looksLikeRssOrAtom(url: string, contentType = "", bodyStart = ""): boolean {
  const u = url.toLowerCase();
  const ct = contentType.toLowerCase();
  if (
    ct.includes("rss") ||
    ct.includes("atom") ||
    ct.includes("xml") ||
    ct.includes("json")
  ) {
    // json alone is weak; prefer xml-ish
    if (ct.includes("json") && !ct.includes("feed") && !u.includes("rss")) {
      /* fall through */
    } else if (ct.includes("rss") || ct.includes("atom") || ct.includes("xml")) {
      return true;
    }
  }
  if (/\.(rss|atom|xml)(\?|$)/i.test(u)) return true;
  if (/\/(feed|rss|atom)(\/|$|\?)/i.test(u)) return true;
  if (/\/news\/rss/i.test(u)) return true;
  const head = bodyStart.slice(0, 400).toLowerCase();
  return (
    head.includes("<rss") ||
    head.includes("<feed") ||
    head.includes("<rdf:rdf") ||
    head.includes("<?xml")
  );
}

function looksLikeIcs(url: string, contentType = "", bodyStart = ""): boolean {
  const u = url.toLowerCase();
  const ct = contentType.toLowerCase();
  if (ct.includes("text/calendar") || ct.includes("ics")) return true;
  if (/\.ics(\?|$)/i.test(u) || /ical=1/i.test(u) || /[?&]ical(=|&|$)/i.test(u)) {
    return true;
  }
  return bodyStart.slice(0, 200).includes("BEGIN:VCALENDAR");
}

function detectPaywall(html: string, status: number): boolean {
  if (status === 401 || status === 402 || status === 403) return true;
  const h = html.slice(0, 80_000).toLowerCase();
  return (
    h.includes("subscribe to continue") ||
    h.includes("subscribers only") ||
    h.includes("paywall") ||
    h.includes("metered") ||
    h.includes("create an account to read") ||
    h.includes("sign in to continue") ||
    h.includes("login to continue") ||
    h.includes("already a subscriber")
  );
}

function guessBeatId(url: URL, html: string, beats: Beat[]): string {
  const blob = `${url.hostname} ${url.pathname} ${html.slice(0, 5000)}`.toLowerCase();
  const pick = (slug: string) =>
    beats.find((b) => b.slug === slug)?.id ?? "beat_general";

  if (
    blob.includes("facebook.com") ||
    blob.includes("overheard") ||
    blob.includes("reddit.com")
  ) {
    return pick("social");
  }
  if (
    blob.includes("sport") ||
    blob.includes("athletics") ||
    blob.includes("/hs/") ||
    blob.includes("high-school")
  ) {
    return blob.includes("high") || blob.includes("hs")
      ? pick("high-school-sports")
      : pick("sports");
  }
  if (
    blob.includes("school") ||
    blob.includes("tcaps") ||
    blob.includes("education") ||
    blob.includes("isd")
  ) {
    return pick("schools");
  }
  if (
    blob.includes("city") ||
    blob.includes("county") ||
    blob.includes("civic") ||
    blob.includes("government") ||
    blob.includes("commission")
  ) {
    return pick("government");
  }
  if (
    blob.includes("bus") ||
    blob.includes("transit") ||
    blob.includes("bata") ||
    blob.includes("gtfs")
  ) {
    return pick("transit");
  }
  if (
    blob.includes("opera") ||
    blob.includes("museum") ||
    blob.includes("theatre") ||
    blob.includes("theater") ||
    blob.includes("concert") ||
    blob.includes("interlochen") ||
    blob.includes("arts")
  ) {
    return pick("arts");
  }
  if (
    blob.includes("event") ||
    blob.includes("calendar") ||
    blob.includes("festival") ||
    blob.includes("visit") ||
    blob.includes("tourism")
  ) {
    return pick("events");
  }
  if (
    blob.includes("business") ||
    blob.includes("chamber") ||
    blob.includes("connect")
  ) {
    return pick("business");
  }
  return pick("general-news");
}

function findAlternateFeeds(html: string, base: URL): string[] {
  const found: string[] = [];
  const re =
    /<link\b[^>]*rel=["'][^"']*alternate[^"']*["'][^>]*>/gi;
  for (const tag of html.match(re) ?? []) {
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    if (
      type.includes("rss") ||
      type.includes("atom") ||
      type.includes("xml") ||
      /rss|atom|feed/i.test(href)
    ) {
      const abs = absoluteUrl(base, href);
      if (abs) found.push(abs);
    }
  }
  // ICS / calendar links in anchors
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/ical=1|\.ics(\?|$)|webcal:/i.test(href) || /\/ical/i.test(href)) {
      const abs = absoluteUrl(base, href.replace(/^webcal:/i, "https:"));
      if (abs) found.push(abs);
    }
  }
  return [...new Set(found)];
}

const COMMON_FEED_PATHS = [
  "/feed",
  "/feed/",
  "/rss",
  "/rss/",
  "/atom.xml",
  "/index.xml",
  "/news/rss/",
  "/news/rss",
  "/news/feed/",
  "/blog/rss/",
  "/blog/feed/",
  "/?feed=rss2",
];

async function probeUrl(
  url: string,
): Promise<{ ok: boolean; status: number; contentType: string; body: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; traverse.news-desk/1.0; +https://traverse.news)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/calendar, text/html;q=0.9, */*;q=0.8",
    },
    redirect: "follow",
  });
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    contentType,
    body: body.slice(0, 200_000),
  };
}

function findDuplicate(
  homepage: string,
  feedUrl: string | null,
  existing: Source[],
): { id: string; name: string; beat_id: string } | null {
  const host = hostKey(homepage);
  const homepageIsFacebook = isFacebookHost(homepage);
  const draftFbIdentity =
    facebookPageIdentity(homepage) ||
    (feedUrl ? facebookPageIdentity(feedUrl) : null);

  for (const source of existing) {
    const sourceIsFacebook =
      isFacebookHost(source.homepage) ||
      (source.feed_url ? isFacebookHost(source.feed_url) : false);

    // Facebook: compare page/group identity only — never hostname alone.
    if (homepageIsFacebook || sourceIsFacebook) {
      if (!homepageIsFacebook || !sourceIsFacebook) continue;
      const existingIdentity =
        facebookPageIdentity(source.homepage) ||
        (source.feed_url ? facebookPageIdentity(source.feed_url) : null);
      if (
        draftFbIdentity &&
        existingIdentity &&
        draftFbIdentity === existingIdentity
      ) {
        return { id: source.id, name: source.name, beat_id: source.beat_id };
      }
      continue;
    }

    if (hostKey(source.homepage) === host) {
      return { id: source.id, name: source.name, beat_id: source.beat_id };
    }
    if (feedUrl && sameFeed(source.feed_url, feedUrl)) {
      return { id: source.id, name: source.name, beat_id: source.beat_id };
    }
  }
  return null;
}

/**
 * Research a pasted URL for Desk Smart add. Never invents a feed or stories.
 * Returns a review payload — does not write to the store.
 */
export async function researchSourceUrl(input: {
  url: string;
  beats: Beat[];
  existing: Source[];
}): Promise<SourceResearchResult> {
  const findings: string[] = [];
  const warnings: string[] = [];
  let fetchError: string | null = null;
  let paywall = false;

  let parsed: URL;
  try {
    parsed = normalizeUrl(input.url);
  } catch {
    return {
      input_url: input.url,
      name: "",
      homepage: input.url.trim(),
      feed_url: null,
      pull_method: "html",
      beat_id:
        input.beats.find((b) => b.slug === "general-news")?.id ?? "beat_general",
      enabled: false,
      notes: "Invalid URL.",
      findings: [],
      warnings: ["Could not parse that URL."],
      duplicate_of: null,
      fetch_error: "Invalid URL",
      paywall_suspected: false,
    };
  }

  const homepage = `${parsed.protocol}//${parsed.host}/`;
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

  // Facebook — no auto-scrape. Match duplicates by page/group identity, not host.
  if (isFacebookHost(host)) {
    const beatId =
      input.beats.find((b) => b.slug === "social")?.id ?? "beat_social";
    const identity = facebookPageIdentity(parsed.toString());
    const isPost = isFacebookPostUrl(parsed);

    // A post/permalink is not a standing source. Do not treat it as Overheard
    // (or any other facebook.com page) just because the host matches.
    if (isPost) {
      const standing = facebookStandingHomepage(parsed);
      const name = displayNameFromFacebookUrl(parsed.toString());
      return {
        input_url: input.url,
        name,
        homepage: standing,
        feed_url: standing,
        pull_method: "facebook",
        beat_id: beatId,
        enabled: false,
        notes:
          "Facebook post URL — not a standing source. Use Desk Links (/desk/queue) or Events, not Sources.",
        findings: [
          "This is a Facebook post/permalink (or reel/video/photo/share), not a page or group.",
          "Staff should use Desk Links (/desk/queue) or Events — not Sources.",
          identity
            ? `Page vanity from URL: ${identity}.`
            : "Could not resolve a page/group vanity from this post URL.",
        ],
        warnings: [
          "Adding a post URL as a source is the wrong door. If this should be a standing source, paste the page or group URL instead (e.g. facebook.com/BARCinTC).",
        ],
        // Prefer not treating a post as an update to an existing page source.
        duplicate_of: null,
        fetch_error: null,
        paywall_suspected: false,
        facebook_post: true,
      };
    }

    const draftHomepage = facebookStandingHomepage(parsed);
    const name = displayNameFromFacebookUrl(parsed.toString());
    const duplicate = findDuplicate(
      draftHomepage,
      draftHomepage,
      input.existing,
    );
    return {
      input_url: input.url,
      name,
      homepage: draftHomepage,
      feed_url: draftHomepage,
      pull_method: "facebook",
      beat_id: beatId,
      enabled: true,
      notes: "Tip wire. No auto-scrape in v1; staff may paste tips later.",
      findings: [
        "Detected Facebook page/group URL → pull_method facebook, beat Social.",
        identity ? `Page identity: ${identity}.` : "No page identity parsed.",
      ],
      warnings: duplicate
        ? [`Possible duplicate of “${duplicate.name}”.`]
        : [],
      duplicate_of: duplicate,
      fetch_error: null,
      paywall_suspected: false,
      facebook_post: false,
    };
  }

  let html = "";
  let finalUrl = parsed.toString();
  try {
    const page = await probeUrl(parsed.toString());
    finalUrl = parsed.toString();
    html = page.body;
    paywall = detectPaywall(html, page.status);
    if (!page.ok) {
      fetchError = `Fetch returned ${page.status}`;
      warnings.push(fetchError);
    } else {
      findings.push(`Fetched ${host} (${page.status}).`);
    }
    // If the URL itself is already a feed/calendar
    if (looksLikeIcs(finalUrl, page.contentType, html)) {
      const name = titleFromHtml(html, host);
      const beatId = guessBeatId(parsed, html, input.beats);
      const duplicate = findDuplicate(homepage, finalUrl, input.existing);
      return {
        input_url: input.url,
        name,
        homepage,
        feed_url: finalUrl,
        pull_method: "ics",
        beat_id: beatId,
        enabled: !paywall,
        notes: paywall ? "Paywall / login wall suspected." : "",
        findings: ["URL looks like an ICS calendar feed."],
        warnings: [
          ...(duplicate ? [`Possible duplicate of “${duplicate.name}”.`] : []),
          ...(paywall ? ["Paywall / login wall signals — defaulting Off."] : []),
        ],
        duplicate_of: duplicate,
        fetch_error: page.ok ? null : fetchError,
        paywall_suspected: paywall,
      };
    }
    if (looksLikeRssOrAtom(finalUrl, page.contentType, html)) {
      const name = titleFromHtml(html, host);
      const beatId = guessBeatId(parsed, html, input.beats);
      const duplicate = findDuplicate(homepage, finalUrl, input.existing);
      return {
        input_url: input.url,
        name,
        homepage,
        feed_url: finalUrl,
        pull_method: "rss",
        beat_id: beatId,
        enabled: !paywall,
        notes: paywall ? "Paywall / login wall suspected." : "",
        findings: ["URL looks like an RSS/Atom feed."],
        warnings: [
          ...(duplicate ? [`Possible duplicate of “${duplicate.name}”.`] : []),
          ...(paywall ? ["Paywall / login wall signals — defaulting Off."] : []),
        ],
        duplicate_of: duplicate,
        fetch_error: page.ok ? null : fetchError,
        paywall_suspected: paywall,
      };
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Fetch failed";
    warnings.push(fetchError);
  }

  const name = html ? titleFromHtml(html, host) : host;
  const beatId = guessBeatId(parsed, html, input.beats);
  const candidates: string[] = html ? findAlternateFeeds(html, parsed) : [];

  for (const path of COMMON_FEED_PATHS) {
    candidates.push(absoluteUrl(new URL(homepage), path)!);
  }

  let feedUrl: string | null = null;
  let pullMethod: PullMethod = "html";

  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    try {
      const probe = await probeUrl(candidate);
      if (!probe.ok) continue;
      if (looksLikeIcs(candidate, probe.contentType, probe.body)) {
        feedUrl = candidate;
        pullMethod = "ics";
        findings.push(`Found ICS: ${candidate}`);
        break;
      }
      if (looksLikeRssOrAtom(candidate, probe.contentType, probe.body)) {
        feedUrl = candidate;
        pullMethod = "rss";
        findings.push(`Found RSS/Atom: ${candidate}`);
        break;
      }
    } catch {
      // try next candidate
    }
  }

  if (!feedUrl) {
    pullMethod = "html";
    // Keep a page URL for HTML pullers (same pattern as seed sources).
    // This is not an invented feed — findings say none was discovered.
    feedUrl = finalUrl.replace(/\/$/, "") || homepage.replace(/\/$/, "");
    findings.push("No RSS/Atom/ICS feed found — pull_method html.");
  }

  const notesParts: string[] = [];
  if (paywall) notesParts.push("Paywall / login wall suspected.");
  if (pullMethod === "html") notesParts.push("No auto feed discovered; HTML pull.");
  const duplicate = findDuplicate(homepage, feedUrl, input.existing);
  if (duplicate) {
    notesParts.push(`Possible duplicate of ${duplicate.name}.`);
    warnings.push(`Possible duplicate of “${duplicate.name}”.`);
  }
  if (paywall) {
    warnings.push("Paywall / login wall signals — defaulting Off.");
  }

  return {
    input_url: input.url,
    name,
    homepage: homepage.replace(/\/$/, "") || homepage,
    feed_url: feedUrl,
    pull_method: pullMethod,
    beat_id: beatId,
    enabled: !paywall,
    notes: notesParts.join(" "),
    findings,
    warnings,
    duplicate_of: duplicate,
    fetch_error: fetchError,
    paywall_suspected: paywall,
  };
}
