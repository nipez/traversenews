import type { SiteConfig } from "@/lib/sites/types";

/**
 * Placeholder brand until a public domain is bought.
 * Wordmark is a2.news; origin defaults to workers.dev.
 */
export const ANN_ARBOR_SITE: SiteConfig = {
  id: "ann-arbor",
  wordmarkPrimary: "a2",
  wordmarkTld: "news",
  hostname: "a2.news",
  defaultOrigin: "https://ann-arbor-news.nickperez.workers.dev",
  name: "A2 News",
  place: "Ann Arbor",
  placeState: "Michigan",
  regionPhrase: "Ann Arbor and Dexter",
  aroundLabel: "Around town",
  aroundEmoji: "🌳",
  hero: {
    src: "",
    alt: "",
    dateline: "Ann Arbor / Dexter, Michigan",
    dek: "One tab for Ann Arbor and Dexter: news, nights out, civic, and schools.",
  },
  timezone: "America/Detroit",
  cookieDomain: undefined,
  emailFromName: "A2 News",
  // Temporary verified sender until an AA domain exists. Preview only.
  emailFromAddress: "info@traverse.news",
  emailFallback: "nickperez@gmail.com",
  publicByline: "a2.news",
  userAgent: "a2.news-puller/1.0 (+https://a2.news)",
  fallbackPlace: "Ann Arbor",
  gaId: null,
  letterPreviewOnly: true,
  description:
    "Ann Arbor and Dexter local news: original reporting plus headlines from other desks, events, and civic listings.",
  localKicker: "Town",
  staffEmail: "nick@traverse.news",
  tipsEmail: "tips@traverse.news",
  reservedPlaces: ["Dexter"],
  pageCopy: {
    eventsDek:
      "Concerts, festivals, markets, library programs. Meetings live on [Civic](/civic). Something missing? [Let us know](#event-tip)",
    comingUpDek: "Concerts, markets, and things to do around town.",
    emailPageDek:
      "The town in one letter. News, events, civic, schools, sports.",
    letterGreetingLead:
      "Good morning. Here's the town, then what's coming up.",
    letterGreetingNoLead:
      "Good morning. Here's the rest of the town from other desks, then what's coming up.",
    showsDek: "Movies and live theatre around town.",
    sportsDek:
      "Area high-school games and sports headlines — not University of Michigan varsity.",
    deskAlertHint:
      "Saw an official Ann Arbor Police or Washtenaw press post? Paste the URL on the Desk — no chat needed.",
    aboutTitle: "About a2.news",
    aboutDek: "An Ann Arbor / Dexter desk. One place to read the town.",
    aboutBody: `## Why this exists

Ann Arbor and Dexter do not have a shortage of information. They have a shortage of one place to put it.

If you want to know what happened, what's tonight, and who is meeting on Tuesday, you still have to open MLive, the Michigan Daily, the Observer, WEMU, The Sun Times News, city calendars, AAPS, and a stack of venue pages. Most people do not.

a2.news exists so you do not have to do that circuit. One site. The original story when we have one. Everyone else's headline when they have one. The night out. The civic calendar. The alert when the road is closed.

That is the whole vision: be the one tab that covers Ann Arbor, Dexter, and the towns around them.

## What you will find

**Today** is the paper. An a2.news original leads when we have published one. Under that, Around town is other desks — the Daily, the Observer, WEMU, The Sun Times News, and local orgs.

[Events](/events) is concerts, markets, library programs, and nights out. [Civic](/civic) is boards and government only. [Schools](/schools) is important district dates — calendars you can trust, not every bake sale. [Sports](/sports) is area high-school games and sports headlines — not University of Michigan varsity. [Shows](/shows) is movies and live theatre. [Local](/local) is useful outbound directories.

[Alerts](/#alerts) is official only: crashes, outages, closures, and warnings.

**Morning email** is the same paper in your inbox. One pass before the day starts.

## How we write

Original reporting on this site is a2.news reporting. We do not invent people, quotes, crashes, or events. If a sentence came from another outlet, we say so and we link it.

When a story is a synthesis of the local record, the article ends with those permalinks. That is the paper trail, not a reprint.

## What we will not do

We will not scrape a paywall and paste the body. Headlines, dek, and a link.

We will not dump group-chat accusations onto the homepage.

We will not publish a calendar item we cannot point back to.

We will not treat U-M varsity as local high-school sports.`,
  },
  sportsBeatLinks: [
    {
      name: "Pioneer HS Athletics",
      href: "https://pioneerathletics.arbitersports.com/",
    },
    {
      name: "Skyline HS Athletics",
      href: "https://skylineathletics.arbitersports.com/",
    },
    {
      name: "Huron HS Athletics",
      href: "https://huronsports.arbitersports.com/",
    },
    {
      name: "Dexter HS Athletics",
      href: "https://dexterathletics.arbitersports.com/",
    },
  ],
  showsVenueLinks: [
    {
      name: "The Ark",
      href: "https://theark.org/",
    },
    {
      name: "Marquee Arts",
      href: "https://marquee-arts.org/",
    },
    {
      name: "UMS",
      href: "https://ums.org/",
    },
  ],
  eventsHandoffs: [
    {
      name: "Visit Ann Arbor",
      href: "https://www.annarbor.org/events/",
    },
    {
      name: "AADL events",
      href: "https://aadl.org/events",
    },
    {
      name: "The Ark",
      href: "https://theark.org/events/",
    },
    {
      name: "UMS season",
      href: "https://ums.org/season/",
    },
  ],
  civicHandoffs: [
    {
      name: "City of Ann Arbor — Legistar",
      href: "https://a2gov.legistar.com/Calendar.aspx",
    },
    {
      name: "Washtenaw County calendar",
      href: "https://washtenawcomi.portal.civicclerk.com",
    },
  ],
  alertSources: [
    { id: "src_a2_police_news", label: "Ann Arbor Police" },
    { id: "src_washtenaw_press", label: "Washtenaw County press" },
  ],
};
