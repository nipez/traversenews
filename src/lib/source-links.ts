/** Friendly outlet label from a news permalink hostname. */
export function outletNameFromUrl(rawUrl: string): string {
  let host = "";
  try {
    host = new URL(rawUrl.trim()).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "Source";
  }

  const known: Record<string, string> = {
    "9and10news.com": "9&10 News",
    "traverseticker.com": "The Ticker",
    "record-eagle.com": "Record-Eagle",
    "upnorthlive.com": "WPBN",
    "reynolds-jonkhoff.com": "Reynolds-Jonkhoff",
    "interlochenpublicradio.org": "IPR News",
    "northernexpress.com": "Northern Express",
    "tcbusinessnews.com": "Traverse City Business News",
    "traversecity.com": "Visit TC",
    "nationalwritersseries.org": "National Writers Series",
    "traverseconnect.com": "Traverse Connect",
    "tadl.org": "TADL",
    "gtcountymi.gov": "Grand Traverse County",
    "traversecitymi.gov": "City of Traverse City",
  };

  if (known[host]) return known[host];

  for (const [suffix, name] of Object.entries(known)) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return name;
  }

  // Fallback: strip TLD and title-case the brand segment.
  const brand = host.split(".")[0] ?? host;
  if (!brand) return "Source";
  return brand
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function sourceLinksFromUrls(
  urls: string[] | null | undefined,
): Array<{ name: string; url: string }> {
  if (!urls?.length) return [];
  const seen = new Set<string>();
  const out: Array<{ name: string; url: string }> = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ name: outletNameFromUrl(url), url });
  }
  return out;
}
