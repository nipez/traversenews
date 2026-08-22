/**
 * Seed = real Desk catalog only (beats + sources with feed URLs).
 * NEVER invent Story bodies, bylines, quotes, crashes, or events here.
 * See README → Editorial.
 */
import type { AppData, Beat, EventItem, Source, Story } from "@/lib/types";

const beats: Beat[] = [
  { id: "beat_all", name: "All sources", slug: "all", sort: 0 },
  { id: "beat_general", name: "General news", slug: "general-news", sort: 1 },
  { id: "beat_government", name: "Government", slug: "government", sort: 2 },
  { id: "beat_schools", name: "Schools", slug: "schools", sort: 3 },
  { id: "beat_transit", name: "Transit", slug: "transit", sort: 4 },
  { id: "beat_events", name: "Events", slug: "events", sort: 5 },
  { id: "beat_arts", name: "Arts", slug: "arts", sort: 6 },
  { id: "beat_business", name: "Business", slug: "business", sort: 7 },
  { id: "beat_social", name: "Social", slug: "social", sort: 8 },
  { id: "beat_sports", name: "Sports", slug: "sports", sort: 9 },
  { id: "beat_hs_sports", name: "High school sports", slug: "high-school-sports", sort: 10 },
  { id: "beat_original", name: "Original", slug: "original", sort: 11 },
];

const sources: Source[] = [
  {
    id: "src_ticker",
    name: "The Ticker",
    homepage: "https://www.traverseticker.com",
    feed_url: "https://www.traverseticker.com/news/rss/",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "Primary local wire. Morning email staple.",
  },
  {
    id: "src_ticker_cal",
    name: "Ticker Calendar",
    homepage: "https://www.traverseticker.com/calendar/",
    feed_url: "https://www.traverseticker.com/calendar/",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes: "HTML calendar scrape deferred to v2.",
  },
  {
    id: "src_re",
    name: "Record-Eagle",
    homepage: "https://www.record-eagle.com",
    feed_url:
      "https://www.record-eagle.com/search/?f=rss&t=article&c=news*&l=50&s=start_time&sd=desc",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "Metered (CNHI TownNews). Headlines and short dek only — never the body.",
  },
  {
    id: "src_ipr",
    name: "IPR News",
    homepage: "https://www.interlochenpublicradio.org",
    feed_url: "https://www.interlochenpublicradio.org/news.rss",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "",
  },
  {
    id: "src_910",
    name: "9&10 News",
    homepage: "https://www.9and10news.com",
    feed_url:
      "https://www.9and10news.com/arc/outboundfeeds/rss/category/news/?outputType=xml",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "",
  },
  {
    id: "src_northern",
    name: "Northern Express",
    homepage: "https://www.northernexpress.com",
    feed_url: "https://www.northernexpress.com/news/rss/",
    pull_method: "rss",
    beat_id: "beat_arts",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcbn",
    name: "Traverse City Business News",
    homepage: "https://www.tcbusinessnews.com/",
    feed_url: "https://www.tcbusinessnews.com/",
    pull_method: "html",
    beat_id: "beat_business",
    enabled: false,
    notes: "Hard paywall. Left off.",
  },
  {
    id: "src_overheard",
    name: "Overheard in TC",
    homepage: "https://www.facebook.com/groups/overheardintraversecity/",
    feed_url: "https://www.facebook.com/groups/overheardintraversecity/",
    pull_method: "facebook",
    beat_id: "beat_social",
    enabled: true,
    notes: "Tip wire. No auto-scrape in v1; staff may paste tips later.",
  },
  {
    id: "src_gt_cal",
    name: "Grand Traverse County calendar",
    homepage: "https://www.gtcountymi.gov",
    feed_url: "https://www.gtcountymi.gov/RSSFeed.aspx?ModID=58&CID=All-0",
    pull_method: "rss",
    beat_id: "beat_events",
    enabled: true,
    notes: "County meetings and notices.",
  },
  {
    id: "src_city_news",
    name: "City of Traverse City",
    homepage: "https://www.traversecitymi.gov/news/",
    feed_url: "https://www.traversecitymi.gov/news/",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_civicweb",
    name: "City CivicWeb",
    homepage: "https://traversecitymi.civicweb.net/Portal/",
    feed_url: "https://traversecitymi.civicweb.net/Portal/",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    notes: "Agenda portal. HTML pull deferred to v2.",
  },
  {
    id: "src_connect",
    name: "Traverse Connect",
    homepage: "https://traverseconnect.com",
    feed_url: "https://traverseconnect.com/feed/",
    pull_method: "rss",
    beat_id: "beat_business",
    enabled: true,
    notes: "",
  },
  {
    id: "src_visit",
    name: "Visit TC",
    homepage: "https://www.traversecity.com",
    feed_url: "https://www.traversecity.com/blog/rss/",
    pull_method: "rss",
    beat_id: "beat_events",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tart",
    name: "TART Trails",
    homepage: "https://traversetrails.org",
    feed_url:
      "https://traversetrails.org/?post_type=tribe_events&ical=1&eventDisplay=list",
    pull_method: "ics",
    beat_id: "beat_events",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcaps",
    name: "TCAPS",
    homepage: "https://www.tcaps.net",
    feed_url:
      "https://thrillshare-cmsv2.services.thrillshare.com/api/v4/o/29929/cms/events/generate_ical?filter_ids&section_ids",
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tbaisd",
    name: "TBAISD / Northwest Ed",
    homepage: "https://www.tbaisd.org",
    feed_url:
      "https://thrillshare-cmsv2.services.thrillshare.com/api/v4/o/29783/cms/events/generate_ical?filter_ids&section_ids",
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    notes: "",
  },
  {
    id: "src_downtown",
    name: "Downtown TC",
    homepage: "https://www.downtowntc.com/events/",
    feed_url: "https://www.downtowntc.com/events/",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_opera",
    name: "City Opera House",
    homepage: "https://www.cityoperahouse.org/events",
    feed_url: "https://www.cityoperahouse.org/events",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_interlochen",
    name: "Interlochen Presenters",
    homepage: "https://www.interlochen.org/concerts-and-events",
    feed_url: "https://www.interlochen.org/concerts-and-events",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_tadl",
    name: "TADL",
    homepage: "https://www.tadl.org/events/upcoming",
    feed_url: "https://www.tadl.org/events/upcoming",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_dennos",
    name: "Dennos Museum",
    homepage: "https://www.dennosmuseum.org/events/",
    feed_url: "https://www.dennosmuseum.org/events/",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_oldtown",
    name: "Old Town Playhouse",
    homepage: "https://www.oldtownplayhouse.com/performances/all-performances.html",
    feed_url: "https://www.oldtownplayhouse.com/performances/all-performances.html",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_pride",
    name: "Up North Pride",
    homepage: "https://upnorthpride.com/events",
    feed_url: "https://upnorthpride.com/events",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_cherry",
    name: "National Cherry Festival",
    homepage: "https://www.cherryfestival.org/",
    feed_url: "https://www.cherryfestival.org/",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes: "HTML pull deferred to v2.",
  },
  {
    id: "src_bata",
    name: "BATA alerts",
    homepage: "https://batabustracker.com",
    feed_url: "https://batabustracker.com/gtfs-rt/alerts",
    pull_method: "none",
    beat_id: "beat_transit",
    enabled: true,
    notes: "GTFS-RT alerts. Parser deferred to v2.",
  },
  {
    id: "src_nws",
    name: "National Writers Series",
    homepage: "https://nationalwritersseries.org",
    feed_url: "https://nationalwritersseries.org/feed/",
    pull_method: "rss",
    beat_id: "beat_arts",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tn",
    name: "traverse.news",
    homepage: "https://traverse.news",
    feed_url: null,
    pull_method: "original",
    beat_id: "beat_original",
    enabled: true,
    notes: "Our desk. Published in full.",
  },
];

const stories: Story[] = [];

// Events come from ICS pull only. Do not invent meetings to fill the layout.
const events: EventItem[] = [];

export function createSeedData(): AppData {
  return {
    beats,
    sources,
    stories,
    events,
    subscribers: [],
    last_pull_at: null,
    editions: [],
  };
}

export function beatSourceCounts(data: AppData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const beat of data.beats) {
    if (beat.slug === "all") {
      counts[beat.id] = data.sources.length;
    } else {
      counts[beat.id] = data.sources.filter((s) => s.beat_id === beat.id).length;
    }
  }
  return counts;
}
