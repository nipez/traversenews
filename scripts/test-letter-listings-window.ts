/**
 * Morning letter sports / events / civic must stay filled while the site still
 * has upcoming items — even when those same cards already mailed earlier in
 * the week. Covers Mon–Sat send mornings and the UTC ↔ America/Detroit day
 * boundary for athletics week bounds.
 *
 *   npm run test:letter-listings-window
 */
import assert from "node:assert/strict";
import {
  ATHLETICS_WEEK_DAYS,
  athleticsWeekDayBounds,
  selectThisWeekAthletics,
} from "../src/lib/athletics";
import { detroitDayKey, detroitWallToUtc } from "../src/lib/dates";
import {
  buildEmailEditionSnapshot,
  collectPastBayExclusion,
  wasInPriorLetter,
} from "../src/lib/email-editions";
import type {
  AppData,
  AthleticsGame,
  EmailEditionSnapshot,
  EventItem,
  Source,
  Story,
} from "../src/lib/types";

const sources: Source[] = [
  {
    id: "src_ticker",
    name: "The Ticker",
    beat_id: "beat_news",
    homepage: "https://www.traverseticker.com",
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcc_ath",
    name: "TC Central Athletics",
    beat_id: "beat_hs_sports",
    homepage: "https://arbiterlive.com/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcw_ath",
    name: "TC West Athletics",
    beat_id: "beat_hs_sports",
    homepage: "https://arbiterlive.com/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcsf_ath",
    name: "TC St. Francis Athletics",
    beat_id: "beat_hs_sports",
    homepage: "https://arbiterlive.com/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
  {
    id: "src_tcch_ath",
    name: "TC Christian Athletics",
    beat_id: "beat_hs_sports",
    homepage: "https://arbiterlive.com/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
  {
    id: "src_gt_cal",
    name: "Grand Traverse County Calendar",
    beat_id: "beat_government",
    homepage: "https://www.grandtraverse.org/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
  {
    id: "src_visit_events",
    name: "Visit Traverse City",
    beat_id: "beat_events",
    homepage: "https://www.traversecity.com/events/",
    feed_url: null,
    pull_method: "html",
    enabled: true,
    notes: "",
  },
];

const GAME_CENTRAL =
  "Varsity Girls Volleyball vs. Petoskey — Central";
const GAME_WEST = "Varsity Girls Volleyball vs. Cadillac — West";
const GAME_SF = "Varsity Girls Volleyball vs. Gaylord — St. Francis";
const GAME_TCC = "Varsity Girls Volleyball vs. Bellaire — TC Christian";
const CIVIC_TITLE = "City Commission";
const EVENT_TITLE = "Sara Hardy Downtown Farmers Market Night";

function game(
  partial: Pick<AthleticsGame, "id" | "title" | "starts_at" | "source_id" | "school">,
): AthleticsGame {
  return {
    place: "Home",
    url: `https://arbiterlive.com/game/${partial.id}`,
    ...partial,
  };
}

function event(
  partial: Pick<EventItem, "id" | "title" | "starts_at" | "source_id" | "url"> &
    Partial<EventItem>,
): EventItem {
  return {
    place: partial.place ?? "Traverse City",
    time_unknown: partial.time_unknown ?? false,
    ...partial,
  };
}

function story(
  partial: Partial<Story> & Pick<Story, "id" | "title" | "url" | "source_id">,
): Story {
  return {
    dek: partial.dek ?? "Wire dek.",
    published_at: partial.published_at ?? "2026-10-19T10:00:00.000Z",
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
    ...partial,
  };
}

/** Tue Oct 20 + Thu Oct 22 volleyball — the live slate that emptied Oct 19. */
const athletics: AthleticsGame[] = [
  game({
    id: "ath_central",
    title: GAME_CENTRAL,
    starts_at: detroitWallToUtc(2026, 10, 20, 19, 0, 0).toISOString(),
    source_id: "src_tcc_ath",
    school: "Central",
  }),
  game({
    id: "ath_west",
    title: GAME_WEST,
    starts_at: detroitWallToUtc(2026, 10, 20, 19, 0, 0).toISOString(),
    source_id: "src_tcw_ath",
    school: "West",
  }),
  game({
    id: "ath_sf",
    title: GAME_SF,
    starts_at: detroitWallToUtc(2026, 10, 22, 19, 0, 0).toISOString(),
    source_id: "src_tcsf_ath",
    school: "TC St. Francis",
  }),
  game({
    id: "ath_tcc",
    title: GAME_TCC,
    starts_at: detroitWallToUtc(2026, 10, 22, 19, 0, 0).toISOString(),
    source_id: "src_tcch_ath",
    school: "TC Christian",
  }),
];

const events: EventItem[] = [
  event({
    id: "ev_civic",
    title: CIVIC_TITLE,
    starts_at: detroitWallToUtc(2026, 10, 20, 19, 0, 0).toISOString(),
    source_id: "src_gt_cal",
    url: "https://www.traversecitymi.gov/meeting-1",
    place: "City Hall",
  }),
  event({
    id: "ev_market",
    title: EVENT_TITLE,
    starts_at: detroitWallToUtc(2026, 10, 21, 17, 0, 0).toISOString(),
    source_id: "src_visit_events",
    url: "https://www.traversecity.com/events/farmers-market",
    place: "Sara Hardy Downtown Farmers Market",
  }),
];

/** Prior letters earlier in the week already listed these same cards. */
const priorLetterOct13: EmailEditionSnapshot = {
  date: "2026-10-13",
  captured_at: "2026-10-13T12:00:00.000Z",
  lead: {
    title: "Harbor fees rise for fall",
    dek: "Already mailed.",
    url: "https://www.9and10news.com/2026/10/13/harbor/",
    published_at: "2026-10-13T10:00:00.000Z",
    sources: ["9&10 News"],
    byline: null,
    slug: null,
    is_original: false,
  },
  around: [],
  alerts: [],
  tonight: [
    {
      title: EVENT_TITLE,
      starts_at: events[1]!.starts_at,
      place: "Sara Hardy Downtown Farmers Market",
      url: "https://www.traversecity.com/events/farmers-market",
    },
  ],
  civic: [
    {
      title: CIVIC_TITLE,
      starts_at: events[0]!.starts_at,
      place: "City Hall",
      url: "https://www.traversecitymi.gov/meeting-1",
    },
  ],
  sports: athletics.map((g) => ({
    title: g.title,
    starts_at: g.starts_at,
    place: g.place,
    url: g.url,
    school: g.school,
  })),
};

const priorLetterOct16: EmailEditionSnapshot = {
  ...priorLetterOct13,
  date: "2026-10-16",
  captured_at: "2026-10-16T12:00:00.000Z",
};

function baseData(email_editions: EmailEditionSnapshot[]): AppData {
  return {
    beats: [],
    sources,
    stories: [
      story({
        id: "s_fresh",
        title: "Boardman bridge work shifts overnight",
        url: "https://www.traverseticker.com/2026/10/19/bridge/",
        source_id: "src_ticker",
        published_at: "2026-10-19T09:00:00.000Z",
      }),
    ],
    events,
    athletics,
    schools: [],
    shows: [],
    drafts: [],
    tips: [],
    event_tips: [],
    subscribers: [],
    unsubscribed: [],
    last_pull_at: null,
    editions: [],
    email_editions,
  } as unknown as AppData;
}

/** Mon–Sat morning letter cron: 8:00 America/Detroit → 12:00 UTC in EDT. */
const SEND_MORNINGS_EDT: Array<{ label: string; at: Date; date: string }> = [
  { label: "Mon", at: new Date("2026-10-19T12:00:00.000Z"), date: "2026-10-19" },
  { label: "Tue", at: new Date("2026-10-20T12:00:00.000Z"), date: "2026-10-20" },
  { label: "Wed", at: new Date("2026-10-21T12:00:00.000Z"), date: "2026-10-21" },
  { label: "Thu", at: new Date("2026-10-22T12:00:00.000Z"), date: "2026-10-22" },
  { label: "Fri", at: new Date("2026-10-23T12:00:00.000Z"), date: "2026-10-23" },
  { label: "Sat", at: new Date("2026-10-24T12:00:00.000Z"), date: "2026-10-24" },
];

// --- Athletics week bounds: Detroit calendar, not raw UTC ms ---
{
  const monMorning = new Date("2026-10-19T12:00:00.000Z");
  assert.equal(detroitDayKey(monMorning), "2026-10-19");
  const bounds = athleticsWeekDayBounds(monMorning, 0);
  assert.equal(bounds.startKey, "2026-10-19");
  assert.equal(
    bounds.endKey,
    "2026-10-26",
    "this-week end is today + ATHLETICS_WEEK_DAYS Detroit days",
  );
  assert.equal(ATHLETICS_WEEK_DAYS, 7);

  const week = selectThisWeekAthletics(athletics, monMorning);
  assert.equal(week.length, 4, "Tue + Thu core volleyball stay in Mon window");
}

// UTC just after Detroit midnight Mon (04:00 UTC = Sun 00:00 EDT? Wait:
// EDT = UTC-4, so Mon 00:00 Detroit = Mon 04:00 UTC.
// Sun 23:30 Detroit = Mon 03:30 UTC — Detroit day still Sunday.
{
  const sunNightUtc = new Date("2026-10-19T03:30:00.000Z"); // Sun 11:30pm EDT Oct 18
  assert.equal(detroitDayKey(sunNightUtc), "2026-10-18");
  const sunBounds = athleticsWeekDayBounds(sunNightUtc, 0);
  assert.equal(sunBounds.startKey, "2026-10-18");
  assert.equal(sunBounds.endKey, "2026-10-25");

  const monJustAfterMidnightDetroit = new Date("2026-10-19T04:05:00.000Z");
  assert.equal(detroitDayKey(monJustAfterMidnightDetroit), "2026-10-19");
  const monBounds = athleticsWeekDayBounds(monJustAfterMidnightDetroit, 0);
  assert.equal(monBounds.startKey, "2026-10-19");
  assert.equal(monBounds.endKey, "2026-10-26");
}

// --- Letter: prior-mailed listings still ship while upcoming ---
const data = baseData([priorLetterOct13, priorLetterOct16]);

for (const send of SEND_MORNINGS_EDT) {
  const letter = buildEmailEditionSnapshot(data, send.at);
  assert.equal(letter.date, send.date, `${send.label} letter date is Detroit`);

  // Sports: still upcoming games from the live slate (until they fall past).
  const weekGames = selectThisWeekAthletics(athletics, send.at);
  if (weekGames.length > 0) {
    assert.ok(
      letter.sports.length > 0,
      `${send.label}: sports block must not empty while /sports still has this-week games`,
    );
    for (const card of letter.sports) {
      assert.ok(
        athletics.some((g) => g.title === card.title),
        `${send.label}: sports card comes from live athletics`,
      );
    }
  }

  // Civic / events while still in upcoming window.
  if (send.date <= "2026-10-20") {
    assert.ok(
      letter.civic.some((c) => c.title === CIVIC_TITLE),
      `${send.label}: civic meeting still lists after prior letters`,
    );
  }
  if (send.date <= "2026-10-21") {
    assert.ok(
      letter.tonight.some((e) => e.title === EVENT_TITLE),
      `${send.label}: What's on still lists after prior letters`,
    );
  }
}

// Explicit Oct 19 repro: 0 sports was the live bug with prior-week identities.
{
  const oct19 = new Date("2026-10-19T12:00:00.000Z");
  const letter = buildEmailEditionSnapshot(data, oct19);
  assert.ok(letter.sports.length >= 4, "Oct 19 letter includes the four volleyball games");
  assert.ok(
    letter.sports.some((g) => g.title === GAME_CENTRAL),
    "Central volleyball on Oct 19 letter",
  );
  assert.ok(
    letter.sports.some((g) => g.title === GAME_WEST),
    "West volleyball on Oct 19 letter",
  );
  assert.ok(
    letter.sports.some((g) => g.title === GAME_SF),
    "St. Francis volleyball on Oct 19 letter",
  );
  assert.ok(
    letter.sports.some((g) => g.title === GAME_TCC),
    "TC Christian volleyball on Oct 19 letter",
  );
  assert.equal(letter.civic.length, 1);
  assert.equal(letter.tonight.length, 1);
}

// Mailed sports / civic / tonight identities still block Around reuse.
{
  const oct19 = new Date("2026-10-19T12:00:00.000Z");
  const corpus = collectPastBayExclusion(
    data.email_editions,
    data.editions,
    oct19,
  );
  assert.equal(
    wasInPriorLetter({ title: GAME_CENTRAL, url: athletics[0]!.url }, corpus.identities),
    true,
    "prior sports identity stays in bay exclusion corpus",
  );
  assert.equal(
    wasInPriorLetter(
      { title: CIVIC_TITLE, url: "https://www.traversecitymi.gov/meeting-1" },
      corpus.identities,
    ),
    true,
    "prior civic identity stays in bay exclusion corpus",
  );
  assert.equal(
    wasInPriorLetter(
      {
        title: EVENT_TITLE,
        url: "https://www.traversecity.com/events/farmers-market",
      },
      corpus.identities,
    ),
    true,
    "prior tonight identity stays in bay exclusion corpus",
  );
}

console.log("test-letter-listings-window: ok");
