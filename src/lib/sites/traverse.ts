import type { SiteConfig } from "@/lib/sites/types";

export const TRAVERSE_SITE: SiteConfig = {
  id: "traverse",
  wordmarkPrimary: "traverse",
  wordmarkTld: "news",
  hostname: "traverse.news",
  defaultOrigin: "https://traverse.news",
  name: "Traverse News",
  place: "Traverse City",
  placeState: "Michigan",
  regionPhrase: "the bay",
  aroundLabel: "Around the bay",
  aroundEmoji: "🌊",
  hero: {
    src: "/art/bay-hero.jpg",
    alt: "Grand Traverse Bay at sunset",
    dateline: "Traverse City, Michigan",
    dek: "One tab for the bay: news, nights out, civic, and schools.",
  },
  timezone: "America/Detroit",
  // Downtown / bay — NWS APX grid (Cherry Capital area). Not KTTC observations.
  weather: {
    lat: 44.7631,
    lon: -85.6206,
    gridId: "APX",
    gridX: 29,
    gridY: 46,
  },
  cookieDomain: ".traverse.news",
  emailFromName: "Traverse News",
  emailFromAddress: "info@traverse.news",
  emailFallback: "nickperez@gmail.com",
  publicByline: "traverse.news",
  userAgent: "traverse.news-puller/1.0 (+https://traverse.news)",
  fallbackPlace: "Traverse City",
  gaId: "G-H554KXZD5B",
  letterPreviewOnly: false,
  description:
    "Traverse City local news: original reporting plus headlines from other desks, events, and civic listings.",
  localKicker: "Bay side",
  staffEmail: "nick@traverse.news",
  tipsEmail: "tips@traverse.news",
  reservedPlaces: [],
  pageCopy: {
    eventsDek:
      "Concerts, festivals, markets, library programs. Meetings live on [Civic](/civic). Something missing? [Let us know](#event-tip)",
    comingUpDek: "Concerts, markets, and things to do around the bay.",
    emailPageDek: "The bay in one letter. News, events, civic, schools, sports.",
    letterGreetingLead:
      "Good morning. Here's the bay, then what's coming up.",
    letterGreetingNoLead:
      "Good morning. Here's the rest of the town from other desks, then what's coming up.",
    showsDek: "Movies and live theatre around the bay.",
    sportsDek:
      "Headlines from 9&10 Sports, Record-Eagle Sports, and local prep across the greater bay.",
    deskAlertHint:
      "Saw a Grand Traverse 911 or Ticker Facebook post? Paste the URL on the Desk — no chat needed.",
    aboutTitle: "About traverse.news",
    aboutDek: "A Traverse City desk. One place to read the bay.",
    aboutBody: `## Why this exists

Traverse City does not have a shortage of information. It has a shortage of one place to put it.

If you want to know what happened, what's tonight, and who is meeting on Tuesday, you still have to open the Record-Eagle, the Ticker, TCBN, Northern Express, IPR, 9&10, Visit TC, CivicWeb, the library, Interlochen, Facebook groups, and a stack of org calendars. Most people do not. They miss the meeting, the detour, and the show.

traverse.news exists so you do not have to do that circuit. One site. The original story when we have one. Everyone else's headline when they have one. The night out. The civic calendar. The alert when the road is closed.

That is the whole vision: be the one tab that covers Traverse City and the towns around the bay.

## What you will find

**Today** is the paper. A traverse.news original leads when we have published one. Under that, Around the bay is other desks — Record-Eagle, the Ticker, IPR, 9&10, Northern Express, and local orgs.

[Events](/events) is concerts, markets, library programs, and nights out. [Civic](/civic) is boards and government only. [Schools](/schools) is important district dates — calendars you can trust, not every bake sale. [Sports](/sports) is area games and sports headlines. [Shows](/shows) is movies and live theatre. [Local](/local) is useful outbound directories: where to look when you need a number, a map, or an office. We pull from public listings. If a source does not print a time, we leave it blank.

[Alerts](/#alerts) is official only: crashes, outages, closures, and warnings.

**Morning email** is the same paper in your inbox. One pass before the day starts.

## How we write

Original reporting on this site is traverse.news reporting. We do not invent people, quotes, crashes, or events. If a sentence came from another outlet, we say so and we link it.

When a story is a synthesis of the local record, the article ends with those permalinks. That is the paper trail, not a reprint.

## What we will not do

We will not scrape a paywall and paste the body. Record-Eagle and anyone else with a wall stay as headline, dek, and a link.

We will not dump group-chat accusations onto the homepage. Complaint pile-ons, doxxing, and unverified claims stay off the public site.

We will not publish a calendar item we cannot point back to.`,
  },
  sportsBeatLinks: [
    {
      name: "9&10 Sports",
      href: "https://www.9and10news.com/sports/",
    },
    {
      name: "Record-Eagle Sports",
      href: "https://www.record-eagle.com/sports/",
    },
    {
      name: "Record-Eagle Local Sports",
      href: "https://www.record-eagle.com/sports/local_sports/",
    },
  ],
  showsVenueLinks: [
    {
      name: "State Theatre / Bijou",
      href: "https://stateandbijou.org/",
    },
    {
      name: "The Bay Theatre",
      href: "https://thebaytheatre.org/",
    },
    {
      name: "Elk Rapids Cinema",
      href: "https://www.elkrapidscinema.com/",
    },
    {
      name: "AMC Cherry Blossom 14",
      href: "https://www.amctheatres.com/movie-theatres/traverse-city-mi/amc-cherry-blossom-14",
    },
    {
      name: "Old Town Playhouse",
      href: "https://www.oldtownplayhouse.com/",
    },
    {
      name: "City Opera House",
      href: "https://www.cityoperahouse.org/",
    },
    {
      name: "The Alluvion",
      href: "https://www.thealluvion.org/",
    },
  ],
  eventsHandoffs: [
    {
      name: "Visit TC events",
      href: "https://www.traversecity.com/events/",
    },
    {
      name: "TADL upcoming",
      href: "https://www.tadl.org/events/upcoming",
    },
  ],
  civicHandoffs: [
    {
      name: "City CivicWeb",
      href: "https://traversecitymi.civicweb.net/Portal/",
    },
    {
      name: "Grand Traverse County",
      href: "https://www.gtcountymi.gov",
    },
  ],
  alertSources: [
    { id: "src_gt911", label: "Grand Traverse 911" },
    { id: "src_ticker_fb", label: "Ticker Facebook" },
  ],
};
