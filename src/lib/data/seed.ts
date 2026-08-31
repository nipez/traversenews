/**
 * Seed = real Desk catalog only (beats + sources with feed URLs).
 * NEVER invent Story bodies, bylines, quotes, crashes, or events here.
 * See README → Editorial.
 *
 * Traverse catalog lives here. Ann Arbor / Dexter: sites/ann-arbor/seed.ts.
 * createSeedData() picks by SITE_ID.
 */
import { withSectionHeaderSeeds } from "@/lib/section-headers";
import { getSiteId } from "@/lib/sites";
import { createAnnArborSeedData } from "@/lib/sites/ann-arbor/seed";
import { applySourceMeta } from "@/lib/sites/traverse/source-meta";
import type { AppData, Beat, EventItem, Source, Story } from "@/lib/types";

const beats: Beat[] = [
  { id: "beat_all", name: "All sources", slug: "all", sort: 0 },
  { id: "beat_general", name: "General news", slug: "general-news", sort: 1 },
  { id: "beat_government", name: "Government", slug: "government", sort: 2 },
  { id: "beat_public_safety", name: "Public safety", slug: "public-safety", sort: 3 },
  { id: "beat_schools", name: "Schools", slug: "schools", sort: 4 },
  { id: "beat_transit", name: "Transit", slug: "transit", sort: 5 },
  { id: "beat_events", name: "Events", slug: "events", sort: 6 },
  { id: "beat_shows", name: "Shows", slug: "shows", sort: 7 },
  { id: "beat_arts", name: "Arts", slug: "arts", sort: 8 },
  { id: "beat_business", name: "Business", slug: "business", sort: 9 },
  { id: "beat_social", name: "Social", slug: "social", sort: 10 },
  { id: "beat_sports", name: "Sports", slug: "sports", sort: 11 },
  { id: "beat_hs_sports", name: "High school sports", slug: "high-school-sports", sort: 12 },
  { id: "beat_original", name: "Original", slug: "original", sort: 13 },
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
    notes:
      "No Worker scrape. Traverse News pulls the Ticker calendar on the box → POST /api/desk/events/import (/whats-on).",
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
    notes:
      "Tip wire. No Worker scrape. Paste tips via Desk Tips — do not invent posts.",
  },
  {
    id: "src_gt_cal",
    name: "Grand Traverse County calendar",
    homepage: "https://www.gtcountymi.gov",
    feed_url: "https://www.gtcountymi.gov/RSSFeed.aspx?ModID=58&CID=All-0",
    pull_method: "rss",
    beat_id: "beat_government",
    enabled: true,
    notes:
      "County board meetings and notices. Civic Calendar only — import via POST /api/desk/civic/import, never Events.",
  },
  {
    id: "src_city_news",
    name: "City of Traverse City",
    homepage: "https://www.traversecitymi.gov/news/",
    feed_url: "https://www.traversecitymi.gov/news/",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    notes:
      "Official city news. No RSS — Traverse News pulls on the box via POST /api/desk/stories/import. Headline and link only.",
  },
  {
    id: "src_upnorth",
    name: "UpNorthLive",
    homepage: "https://upnorthlive.com/",
    feed_url: "https://upnorthlive.com/news/local/",
    pull_method: "html",
    beat_id: "beat_general",
    enabled: true,
    notes:
      "TV newsroom WPBN/WGTU (7&4). No public RSS — Traverse News pulls on the box from /news/local/. Cap on Around the bay so this wire does not eat the bay.",
  },
  {
    id: "src_leelanau_ent",
    name: "Leelanau Enterprise",
    homepage: "https://leelanaunews.com/",
    feed_url: "https://leelanaunews.com/",
    pull_method: "html",
    beat_id: "beat_general",
    enabled: true,
    notes: "No public RSS — Traverse News pulls on the box.",
  },
  {
    id: "src_omp_gazette",
    name: "Old Mission Gazette",
    homepage: "https://www.oldmission.net/",
    feed_url: "https://www.oldmission.net/feed/",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "",
  },
  {
    id: "src_glenarbor_sun",
    name: "Glen Arbor Sun",
    homepage: "https://glenarborsun.com/",
    feed_url: "https://glenarborsun.com/feed/",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes: "",
  },
  {
    id: "src_elk_news",
    name: "Elk Rapids News",
    homepage: "https://www.elkrapidsnews.com/",
    feed_url: "https://www.elkrapidsnews.com/",
    pull_method: "html",
    beat_id: "beat_general",
    enabled: true,
    notes:
      "Weekly print/PDF editions — no article RSS. Traverse News pulls on the box (headline + link only).",
  },
  {
    id: "src_benzie_rp",
    name: "Benzie Record Patriot",
    homepage: "https://www.recordpatriot.com/",
    feed_url: "https://www.recordpatriot.com/news/",
    pull_method: "html",
    beat_id: "beat_general",
    enabled: true,
    notes: "No public RSS — Traverse News pulls on the box from /news/.",
  },
  {
    id: "src_betsie",
    name: "The Betsie Current",
    homepage: "https://betsiecurrent.com/",
    feed_url: "https://betsiecurrent.com/feed/",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes:
      "Independent Benzie paper (Frankfort / Beulah / Sleeping Bear west). Still publishing 2026.",
  },
  {
    id: "src_antrim_review",
    name: "Antrim Review",
    homepage: "https://www.antrimreview.net/",
    feed_url: "https://antrimreview.net/rss.xml",
    pull_method: "rss",
    beat_id: "beat_general",
    enabled: true,
    notes:
      "Kalkaska Review is the same shop — do not add a duplicate source unless they publish a separate live URL.",
  },
  {
    id: "src_leelanau_co",
    name: "Leelanau County",
    homepage: "https://www.leelanau.gov/",
    feed_url: "https://www.leelanau.gov/newslist.php",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    calendar_url: "https://www.leelanau.gov/calendar.php",
    notes:
      "News list → POST /api/desk/stories/import. Calendar → POST /api/desk/civic/import (/civic, never Events). Traverse News pulls on the box.",
  },
  {
    id: "src_gtb",
    name: "Grand Traverse Band",
    homepage: "https://www.gtbindians.org/",
    feed_url: "https://www.gtbindians.org/",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    notes:
      "Monthly GTB News PDFs. Headline and link only — do not invent body. Traverse News pulls on the box.",
  },
  {
    id: "src_civicweb",
    name: "City CivicWeb",
    homepage: "https://traversecitymi.civicweb.net/Portal/",
    feed_url: "https://traversecitymi.civicweb.net/Portal/",
    pull_method: "html",
    beat_id: "beat_government",
    enabled: true,
    notes:
      "Agenda portal. No Worker scrape. Traverse News pulls on the box → POST /api/desk/civic/import (/civic, never Events).",
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
    notes: "Blog RSS for Around the bay. Public events calendar is a separate source.",
  },
  {
    id: "src_visit_events",
    name: "Visit TC Events",
    homepage: "https://www.traversecity.com/events/",
    feed_url: "https://www.traversecity.com/events/",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes:
      "Community/concerts calendar (Simpleview). Cloud pulls often 403/empty JS — never invent listings. Need Traverse News to pull https://www.traversecity.com/events/ on the live computer and POST to /api/desk/events/import. Recurring rows: send recurrence_weekdays + recurrence_time (Detroit) or explicit occurrence ISO — never invent Sunday from a Saturday market.",
  },
  {
    id: "src_reader_events",
    name: "Reader nights out",
    homepage: "https://traverse.news/whats-on",
    feed_url: null,
    pull_method: "none",
    beat_id: "beat_events",
    enabled: true,
    notes:
      "Hand-confirmed reader submissions from /whats-on (Something missing?). Desk confirms one row at a time into events. Never auto-import. Concerts, markets, nights out — not civic meetings.",
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
    notes:
      "No Worker scrape. Traverse News pulls https://www.downtowntc.com/events/ on the box → POST /api/desk/events/import (/whats-on).",
  },
  {
    id: "src_opera",
    name: "City Opera House",
    homepage: "https://www.cityoperahouse.org/events",
    feed_url: "https://www.cityoperahouse.org/events",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes:
      "No Worker scrape. Traverse News pulls on the box → POST /api/desk/events/import (/whats-on).",
  },
  {
    id: "src_tcphil",
    name: "Traverse City Philharmonic",
    homepage: "https://tcphil.org/concerts/",
    feed_url: "https://tcphil.org/concerts/",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes:
      "Concerts on /whats-on, never Civic. No Worker scrape. Traverse News pulls https://tcphil.org/concerts/ on the box → POST /api/desk/events/import.",
  },
  {
    id: "src_interlochen",
    name: "Interlochen Presenters",
    homepage: "https://www.interlochen.org/concerts-and-events/all-events?search=",
    feed_url: "https://www.interlochen.org/concerts-and-events/all-events?search=",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes:
      "Worker tries HTML listing for concerts (/whats-on). If bot-blocked or empty, Traverse News pulls on the box → POST /api/desk/events/import. Prefer all-events listing over the Presenters stub.",
  },
  {
    id: "src_tadl",
    name: "TADL",
    homepage: "https://www.tadl.org/events/upcoming",
    feed_url: "https://www.tadl.org/events/upcoming",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes:
      "Worker tries HTML upcoming list (JSON-LD times). Never invent noon; CLOSED/renovation listings dropped. If empty, Traverse News pulls on the box → POST /api/desk/events/import.",
  },
  {
    id: "src_dennos",
    name: "Dennos Museum",
    homepage: "https://www.dennosmuseum.org/events/",
    feed_url: "https://www.dennosmuseum.org/events/",
    pull_method: "html",
    beat_id: "beat_arts",
    enabled: true,
    notes:
      "No Worker scrape. Traverse News pulls on the box → POST /api/desk/events/import (/whats-on).",
  },
  {
    id: "src_oldtown",
    name: "Old Town Playhouse",
    homepage: "https://www.oldtownplayhouse.com/",
    feed_url: "https://www.oldtownplayhouse.com/allshows/all-shows.html",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Shows (/shows), never Events. IP-blocked from datacenter. Traverse News pulls on the box → POST /api/desk/shows/import. Never invent titles or dates.",
  },
  {
    id: "src_city_opera",
    name: "City Opera House",
    homepage: "https://www.cityoperahouse.org/",
    feed_url: "https://www.cityoperahouse.org/events",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Shows (/shows), never Events. If Worker empty, Traverse News → POST /api/desk/shows/import. Never invent titles, dates, or times.",
  },
  {
    id: "src_alluvion",
    name: "The Alluvion",
    homepage: "https://www.thealluvion.org/",
    feed_url: "https://www.thealluvion.org/tickets",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Shows (/shows), never Events. Worker tries Squarespace /tickets HTML. Never invent titles, dates, or times. If Worker HTML is empty, Traverse News → POST /api/desk/shows/import.",
  },
  {
    id: "src_state_theatre",
    name: "State Theatre / Bijou",
    homepage: "https://stateandbijou.org/",
    feed_url: "https://stateandbijou.org/",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Worker tries homepage HTML for Now Playing times (/shows). RSS feed has no showtimes. Never invent clocks. If empty, Traverse News → POST /api/desk/shows/import.",
  },
  {
    id: "src_bay_theatre",
    name: "The Bay Theatre",
    homepage: "https://thebaytheatre.org/",
    feed_url: "https://thebaytheatre.org/",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "JS ticket app — Worker usually gets nothing. Shows via POST /api/desk/shows/import. Never invent showtimes.",
  },
  {
    id: "src_elk_cinema",
    name: "Elk Rapids Cinema",
    homepage: "https://www.elkrapidscinema.com/",
    feed_url: "https://www.elkrapidscinema.com/",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Worker tries homepage HTML showtimes (/shows). Group by title; only times printed on the page. No RSS.",
  },
  {
    id: "src_amc_cherry",
    name: "AMC Cherry Blossom 14",
    homepage:
      "https://www.amctheatres.com/movie-theatres/traverse-city-mi/amc-cherry-blossom-14",
    feed_url:
      "https://www.amctheatres.com/movie-theatres/traverse-city-mi/amc-cherry-blossom-14",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes:
      "Cloudflare blocks Worker. Do not scrape a 14-screen grid into dozens of rows. Traverse News browser import → POST /api/desk/shows/import (group by title).",
  },
  {
    id: "src_pride",
    name: "Up North Pride",
    homepage: "https://upnorthpride.com/events",
    feed_url: "https://upnorthpride.com/events",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes:
      "No Worker scrape. Traverse News pulls on the box → POST /api/desk/events/import (/whats-on).",
  },
  {
    id: "src_cherry",
    name: "National Cherry Festival",
    homepage: "https://www.cherryfestival.org/",
    feed_url: "https://www.cherryfestival.org/",
    pull_method: "html",
    beat_id: "beat_events",
    enabled: true,
    notes:
      "No Worker scrape. Traverse News pulls on the box → POST /api/desk/events/import (/whats-on).",
  },
  {
    id: "src_bata",
    name: "BATA alerts",
    homepage: "https://batabustracker.com",
    feed_url: "https://batabustracker.com/gtfs-rt/alerts",
    pull_method: "none",
    beat_id: "beat_transit",
    enabled: true,
    notes:
      "No Worker GTFS-RT parser. Official service alerts via POST /api/desk/stories/import (source_id src_bata) when printed — headline + link only. Do not invent outages.",
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
    id: "src_gt911",
    name: "Grand Traverse 911",
    homepage: "https://www.facebook.com/GrandTraverse911",
    feed_url: "https://www.facebook.com/GrandTraverse911",
    pull_method: "facebook",
    beat_id: "beat_public_safety",
    enabled: true,
    notes:
      "Official alerts only (outages, crashes, closures). Browser-pulled by Traverse News on the live computer → POST /api/desk/stories/import. Do not dump the Facebook feed. No memes, hiring fluff, or unverified pile-ons. Empty Worker pull is OK.",
  },
  {
    id: "src_ticker_fb",
    name: "Ticker (Facebook)",
    homepage: "https://www.facebook.com/TraverseCityTicker",
    feed_url: "https://www.facebook.com/TraverseCityTicker",
    pull_method: "facebook",
    beat_id: "beat_public_safety",
    enabled: true,
    notes:
      "Browser-pulled → POST /api/desk/stories/import. Alerts/breaking only (crashes, outages, closures, developing). Not a dump of every Ticker FB post. Worker does not scrape FB. Separate from The Ticker RSS (src_ticker) — do not duplicate that firehose into Around the bay.",
  },
  {
    id: "src_910_sports",
    name: "9&10 Sports",
    homepage: "https://www.9and10news.com/sports/",
    feed_url:
      "https://www.9and10news.com/arc/outboundfeeds/rss/category/sports/?outputType=xml",
    pull_method: "rss",
    beat_id: "beat_sports",
    enabled: true,
    notes: "Headlines only. Local and regional sports including TC Central.",
  },
  {
    id: "src_re_sports",
    name: "Record-Eagle Sports",
    homepage: "https://www.record-eagle.com/sports/",
    feed_url:
      "https://www.record-eagle.com/search/?f=rss&t=article&c=sports",
    pull_method: "rss",
    beat_id: "beat_sports",
    enabled: true,
    notes:
      "Metered. Headlines and short dek only — never the body.",
  },
  {
    id: "src_re_prep",
    name: "Record-Eagle Local Sports",
    homepage: "https://www.record-eagle.com/sports/local_sports/",
    feed_url:
      "https://www.record-eagle.com/search/?f=rss&t=article&c=sports/local_sports",
    pull_method: "rss",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Prep/local (Trojans, TCSF, Glen Lake). Headlines and short dek only — never the body.",
  },
  {
    id: "src_tcc_ath",
    name: "TC Central Athletics",
    homepage: "https://tcctrojans.net/main/calendar",
    feed_url: "https://tcctrojans.net/main/calendar",
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Trojans (tcctrojans.net / tccathletics). Sports This week via POST /api/desk/athletics/import. Never import into events/KV.",
  },
  {
    id: "src_tcw_ath",
    name: "TC West Athletics",
    homepage: "https://tcwathletics.com/",
    feed_url: "https://tcwathletics.com/main/calendar",
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Titans (tcwathletics.com, same Big Teams family as tcctrojans.net). Sports This week via POST /api/desk/athletics/import. Never invent games or import into events/KV.",
  },
  {
    id: "src_tcsf_ath",
    name: "St. Francis Athletics",
    homepage: "https://stfrancisgladiators.bigteams.com/main/calendar",
    feed_url: "https://stfrancisgladiators.bigteams.com/main/calendar",
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Gladiators. Sports This week via POST /api/desk/athletics/import. Never import into events/KV.",
  },
  {
    id: "src_tcch_ath",
    name: "TC Christian Athletics",
    homepage: "https://www.tcchristian.org/athletics",
    feed_url: null,
    pull_method: "none",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Sabres. Calendar URL TBD. Games via POST /api/desk/athletics/import only. Do not invent games.",
  },
  {
    id: "src_elk_ath",
    name: "Elk Rapids Athletics",
    homepage: "https://www.elkrapidsschools.org/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Elks. Feed URL TBD. Sports This week via POST /api/desk/athletics/import. Never invent games or stuff into events.",
  },
  {
    id: "src_suttons_ath",
    name: "Suttons Bay Athletics",
    homepage: "https://www.suttonsbayschools.com/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Norsemen. Feed URL TBD. Sports This week via POST /api/desk/athletics/import.",
  },
  {
    id: "src_leland_ath",
    name: "Leland Athletics",
    homepage: "https://www.lelandschools.com/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Comets. Feed URL TBD. Sports This week via POST /api/desk/athletics/import.",
  },
  {
    id: "src_glenlake_ath",
    name: "Glen Lake Athletics",
    homepage: "https://www.glenlakeschools.org/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Lakers. Feed URL TBD. Sports This week via POST /api/desk/athletics/import.",
  },
  {
    id: "src_kingsley_ath",
    name: "Kingsley Athletics",
    homepage: "https://www.kingsleyschools.org/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes:
      "Stags. Feed URL TBD. Sports This week via POST /api/desk/athletics/import.",
  },
  {
    id: "src_tcaps_cal",
    name: "TCAPS calendar",
    homepage: "https://www.tcaps.net/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url: "https://www.tcaps.net/page/district-board-calendar",
    calendar_pdf_url:
      "https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/5656/Tcaps/634b1fa5-4fd0-445c-8504-16ecf5f8a427/25-26-REVISED-Calendars-1.28.26.pdf?disposition=inline",
    notes:
      "District academic calendar (no-school, half days, conferences). /schools via POST /api/desk/schools/import. Never Events. Full calendar: board page + year PDF (prefer 26–27 when posted).",
  },
  {
    id: "src_gtacs_cal",
    name: "GTACS calendar",
    homepage: "https://www.gtacs.org/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://gtacs.org/wp-content/uploads/2026/07/Academic-Calendar-2026-27.pdf",
    notes:
      "Grand Traverse Area Catholic Schools district calendar. /schools import only. Do not invent half days. Not Grand Traverse Academy (src_gta_cal / mygta.us).",
  },
  {
    id: "src_gta_cal",
    name: "Grand Traverse Academy calendar",
    homepage: "https://www.mygta.us/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url: "https://www.mygta.us/",
    notes:
      "Charter school (mygta.us). Not GTACS Catholic. /schools via POST /api/desk/schools/import. Do not invent dates.",
  },
  {
    id: "src_elk_cal",
    name: "Elk Rapids schools calendar",
    homepage: "https://www.elkrapidsschools.org/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://elkrapids-cdn.fxbrt.com/downloads/district_files/final_year_at_a_glance_26-27_with_dates.pdf",
    notes: "District academic calendar. /schools via POST /api/desk/schools/import.",
  },
  {
    id: "src_suttons_cal",
    name: "Suttons Bay schools calendar",
    homepage: "https://www.suttonsbayschools.com/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://suttonsbayschools.com/en-US/school-academic-calendar-1da89303",
    notes: "District academic calendar. /schools via POST /api/desk/schools/import.",
  },
  {
    id: "src_leland_cal",
    name: "Leland schools calendar",
    homepage: "https://www.lelandschools.com/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://files.smartsites.parentsquare.com/11216/lps_academic_calendar_2026-2027.pdf",
    notes: "District academic calendar. /schools via POST /api/desk/schools/import.",
  },
  {
    id: "src_glenlake_cal",
    name: "Glen Lake schools calendar",
    homepage: "https://www.glenlakeschools.org/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://www.glenlakeschools.org/documents/school/district-calendar/269495",
    notes: "District academic calendar. /schools via POST /api/desk/schools/import.",
  },
  {
    id: "src_kingsley_cal",
    name: "Kingsley schools calendar",
    homepage: "https://www.kingsleyschools.org/",
    feed_url: null,
    pull_method: "ics",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url:
      "https://www.kingsleyschools.org/_files/ugd/0f375c_05a1e9ae39684525acde9690e13c96e9.pdf",
    notes: "District academic calendar. /schools via POST /api/desk/schools/import.",
  },
  {
    id: "src_tcch_cal",
    name: "TC Christian calendar",
    homepage: "https://www.tcchristian.org/",
    feed_url: null,
    pull_method: "html",
    beat_id: "beat_schools",
    enabled: true,
    calendar_url: "https://www.tcchristian.org/parents/",
    notes:
      "Academic calendar (not athletics). /schools via POST /api/desk/schools/import.",
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

export function createTraverseSeedData(): AppData {
  return {
    beats,
    sources: sources.map((s) => applySourceMeta(s)),
    stories,
    events,
    athletics: [],
    schools: [],
    shows: [],
    subscribers: [],
    unsubscribed: [],
    tips: [],
    event_tips: [],
    last_pull_at: null,
    editions: [],
    email_editions: [],
    drafts: [],
    section_headers: withSectionHeaderSeeds(null),
    page_copy: undefined,
  };
}

export function createSeedData(): AppData {
  if (getSiteId() === "ann-arbor") return createAnnArborSeedData();
  return createTraverseSeedData();
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
