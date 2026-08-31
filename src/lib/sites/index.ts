import { ANN_ARBOR_SITE } from "@/lib/sites/ann-arbor";
import { TRAVERSE_SITE } from "@/lib/sites/traverse";
import type { NetworkCity, SiteConfig, SiteId } from "@/lib/sites/types";

export type {
  NetworkCity,
  SiteAlertSource,
  SiteConfig,
  SiteId,
  SiteOutboundLink,
  SourceLane,
} from "@/lib/sites/types";

const SITES: Record<SiteId, SiteConfig> = {
  traverse: TRAVERSE_SITE,
  "ann-arbor": ANN_ARBOR_SITE,
};

let cachedId: SiteId | null = null;
let cached: SiteConfig | null = null;

export function parseSiteId(raw: string | undefined | null): SiteId {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "ann-arbor" || v === "annarbor" || v === "a2") return "ann-arbor";
  return "traverse";
}

export function getSiteId(): SiteId {
  return parseSiteId(
    process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "traverse",
  );
}

function overlayOrigin(site: SiteConfig): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  return site.defaultOrigin;
}

function overlayCookieDomain(site: SiteConfig, origin: string): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".workers.dev") || host === "localhost") return undefined;
    if (site.id === "traverse") return ".traverse.news";
    // Custom AA domain when it exists: share apex + www.
    const parts = host.split(".");
    if (parts.length >= 2) return `.${parts.slice(-2).join(".")}`;
  } catch {
    // fall through
  }
  return site.cookieDomain;
}

function buildSite(id: SiteId): SiteConfig {
  const base = SITES[id];
  const origin = overlayOrigin(base);
  let hostname = base.hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    hostname = base.hostname;
  }
  return {
    ...base,
    hostname,
    defaultOrigin: origin,
    cookieDomain: overlayCookieDomain(base, origin),
  };
}

/** Active city instance. Cached per isolate; call resetSiteCache() in tests. */
export function getSite(): SiteConfig {
  const id = getSiteId();
  if (cached && cachedId === id) return cached;
  cachedId = id;
  cached = buildSite(id);
  return cached;
}

export function resetSiteCache(): void {
  cached = null;
  cachedId = null;
}

export function siteOrigin(): string {
  return getSite().defaultOrigin.replace(/\/$/, "");
}

export function siteWordmark(): string {
  const site = getSite();
  return `${site.wordmarkPrimary}.${site.wordmarkTld}`;
}

/**
 * Network list for the Desk Cities switcher.
 * Origins come from env so a local AA preview can point at workers.dev.
 */
export function networkCities(): NetworkCity[] {
  const aaOrigin =
    process.env.NEXT_PUBLIC_ANN_ARBOR_ORIGIN?.replace(/\/$/, "") ||
    ANN_ARBOR_SITE.defaultOrigin;
  const traverseOrigin =
    process.env.NEXT_PUBLIC_TRAVERSE_ORIGIN?.replace(/\/$/, "") ||
    TRAVERSE_SITE.defaultOrigin;
  return [
    { id: "traverse", label: "Traverse City", origin: traverseOrigin },
    { id: "ann-arbor", label: "Ann Arbor / Dexter", origin: aaOrigin },
  ];
}

/**
 * Sites this staff session may open. `STAFF_SITES=traverse,ann-arbor` (default: all).
 * A city-only cultivator later: STAFF_SITES=ann-arbor on that Worker.
 */
export function getAllowedSiteIds(): SiteId[] {
  const raw = process.env.STAFF_SITES?.trim();
  if (!raw) return ["traverse", "ann-arbor"];
  const allowed = raw
    .split(",")
    .map((s) => parseSiteId(s))
    .filter((id, i, arr) => arr.indexOf(id) === i);
  return allowed.length > 0 ? allowed : ["traverse", "ann-arbor"];
}

export function allowedNetworkCities(): NetworkCity[] {
  const allowed = new Set(getAllowedSiteIds());
  return networkCities().filter((c) => allowed.has(c.id));
}

export function isSiteAllowed(id: SiteId = getSiteId()): boolean {
  return getAllowedSiteIds().includes(id);
}
