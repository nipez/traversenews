import type { OriginalDraft } from "@/lib/types";

const SEEBURGER_BODY = [
  "PENINSULA TOWNSHIP — A Traverse City Central High School student-athlete died in a two-vehicle crash about 10:20 p.m. Sunday, Aug. 16, on Center Road near Mapleton Lane.",
  "The Grand Traverse County Sheriff’s Office said a southbound Ford F-250 crossed the center line and struck a Honda CR-V. The Honda’s driver, later identified as Wilder William Seeburger, 17, was pronounced dead at the scene. The Ford’s driver, a 22-year-old Traverse City man, was taken to Munson with non-life-threatening injuries. Deputies said alcohol is believed to be a factor. The crash remains under investigation; the sheriff’s office has not released the other driver’s name or further findings.",
  "The sheriff’s office did not initially release the victim’s identity. 9&10 News and the Record-Eagle reported it was confirmed by school and community members. Reynolds-Jonkhoff Funeral Home published an obituary for Seeburger, born July 12, 2009, in Traverse City, who the funeral home said was preparing to enter his junior year at Central.",
  "Central Principal Ben Berger, in a letter to families quoted by 9&10, said counselors are available through the main office and that mental-health staff would be on hand at student registration Aug. 25–26. “Our Trojan community is grieving the tragic loss of one of our students,” Berger wrote. “Our thoughts and deepest sympathies are with Wilder’s family and loved ones during this heartbreaking time.”",
  "Seeburger’s obituary says he began soccer at 3, played TBAYS travel and North Storm, and spent a year on Central’s team. 9&10 Sports reported teammates have been wearing tape with his name on their wrists; the Trojans won a game three days after the crash, then lost their first home match to Oxford, 4–3. Coach Gavin Richmond told 9&10 that Seeburger “was more than a soccer player” and that “you’ve lost a brother.” WPBN/WGTU reported the boys hung his No. 33 jersey on a goalpost at the season opener and, according to Richmond, decided to retire the number and bring the jersey to remaining games.",
  "A friends-hosted memorial is 5–9 p.m. Wednesday, Aug. 26, at Open Space Park, open to all, the funeral home says. Visitation is 2–4 p.m. and 6–8 p.m. Thursday, Aug. 27, at Reynolds-Jonkhoff, 305 Sixth St. The funeral is 11 a.m. Friday, Aug. 28, at Trinity Lutheran Church, with church visitation at 10 a.m. and a luncheon at the funeral home at 12:30 p.m.",
].join("\n\n");

const SEEBURGER_SOURCES = [
  "https://www.9and10news.com/2026/08/18/crash-kills-one-injures-another-in-peninsula-township-alcohol-believed-to-be-a-factor/",
  "https://traverseticker.com/news/driver-killed-in-peninsula-township-crash/",
  "https://www.9and10news.com/2026/08/20/traverse-city-central-student-died-in-aug-16-peninsula-township-crash/",
  "https://www.9and10news.com/sports/2026/08/21/traverse-city-central-soccer-team-rallying-together-after-losing-a-teammate/",
  "https://www.9and10news.com/2026/08/21/services-set-for-traverse-city-central-student-wilder-seeburger/",
  "https://www.reynolds-jonkhoff.com/obituaries/wilder-seeburger",
  "https://upnorthlive.com/news/local/high-school-soccer-team-honors-teammate-killed-in-peninsula-township-crash-traverse-city-central-high-school-grand-traverse-county-wilder-seeberger",
];

/** Staff drafts that must stay Desk-only until Nick publishes. */
export const STAFF_UNPUBLISHED_DRAFTS: OriginalDraft[] = [];

/**
 * Nick already published this original. Ensure never re-seeds it as status=draft.
 * Used by ensurePublishedStaffOriginals → publishDraft.
 */
export const STAFF_PUBLISHED_ORIGINALS: OriginalDraft[] = [
  {
    id: "draft_center-road-seeburger",
    status: "published",
    title: "Central soccer player killed on Center Road near Mapleton Lane",
    dek: "Wilder William Seeburger, 17, was pronounced dead after a Sunday-night head-on crash in Peninsula Township. Teammates have been playing with his name on their wrists; a public memorial is set for Wednesday at Open Space.",
    body: SEEBURGER_BODY,
    section: "Roads & safety",
    byline: "Nick Perez",
    slug: "center-road-seeburger",
    image_url: null,
    image_credit: null,
    image_caption: null,
    source_urls: SEEBURGER_SOURCES,
    based_on_story_ids: [],
    source_title: null,
    source_dek: null,
    published_story_id: "story_center-road-seeburger",
    created_at: "2026-08-22T14:00:00.000Z",
    updated_at: "2026-08-22T14:00:00.000Z",
    published_at: "2026-08-22T14:00:00.000Z",
    go_live_at: null,
  },
];
