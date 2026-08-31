import { getSite } from "@/lib/sites";
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
    blob.includes("cinema") ||
    blob.includes("movie") ||
    blob.includes("showtimes") ||
    blob.includes("playhouse") ||
    blob.includes("amc") ||
    (blob.includes("theatre") && !blob.includes("opera")) ||
    (blob.includes("theater") && !blob.includes("opera"))
  ) {
    return pick("shows");
  }
  if (
    blob.includes("opera") ||
    blob.includes("museum") ||
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
        `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
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
  for (const source of existing) {
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

  // Facebook tip wire — no auto-scrape.
  if (host === "facebook.com" || host.endsWith(".facebook.com")) {
    const name =
      parsed.pathname
        .split("/")
        .filter(Boolean)
        .slice(-1)[0]
        ?.replace(/[-_]/g, " ") || "Facebook source";
    const beatId =
      input.beats.find((b) => b.slug === "social")?.id ?? "beat_social";
    const draftHomepage = parsed.toString().replace(/\/$/, "");
    const duplicate = findDuplicate(draftHomepage, draftHomepage, input.existing);
    return {
      input_url: input.url,
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      homepage: draftHomepage,
      feed_url: draftHomepage,
      pull_method: "facebook",
      beat_id: beatId,
      enabled: true,
      notes: "Tip wire. No auto-scrape in v1; staff may paste tips later.",
      findings: ["Detected Facebook URL → pull_method facebook, beat Social."],
      warnings: duplicate
        ? [`Possible duplicate of “${duplicate.name}”.`]
        : [],
      duplicate_of: duplicate,
      fetch_error: null,
      paywall_suspected: false,
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
