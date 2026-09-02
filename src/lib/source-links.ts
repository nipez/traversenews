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
    "michigandaily.com": "Michigan Daily",
    "annarborobserver.com": "Ann Arbor Observer",
    "wemu.org": "WEMU",
    "thesuntimesnews.com": "The Sun Times News",
    "concentratemedia.com": "Concentrate",
    "ecurrent.com": "Current Magazine",
    "waamradio.com": "WAAM",
    "michiganpublic.org": "Michigan Public",
    "a2gov.org": "City of Ann Arbor",
    "washtenaw.org": "Washtenaw County",
    "aadl.org": "AADL",
    "a2schools.org": "AAPS",
    "dcsd.org": "Dexter Community Schools",
    "dexterschools.org": "Dexter Community Schools",
    "theark.org": "The Ark",
    "marquee-arts.org": "Marquee Arts",
    "ums.org": "UMS",
    "annarbor.org": "Visit Ann Arbor",
    "visitannarbor.org": "Visit Ann Arbor",
    "cityofypsilanti.com": "City of Ypsilanti",
    "salinemi.gov": "City of Saline",
    "city-chelsea.org": "City of Chelsea",
    "salinesummit.substack.com": "Saline Summit News",
    "washtenawvoice.com": "Washtenaw Voice",
    "ycschools.us": "Ypsilanti Community Schools",
    "salineschools.org": "Saline Area Schools",
    "chelseaschools.org": "Chelsea School District",
    "ypsilibrary.org": "YDL",
    "ypsigrizzlies.com": "Ypsilanti Athletics",
    "chelseabulldogs.org": "Chelsea Athletics",
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
