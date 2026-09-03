import { emailDateLabel, formatEventWhenParts } from "@/lib/dates";
import {
  emailDetroitDateKey,
  formatEmailEditionLabel,
  titlesLikelySameStory,
} from "@/lib/email-editions";
import {
  isImportantSchoolDate,
  selectUpcomingSchoolDays,
} from "@/lib/schools";
import type {
  EmailAlertCard,
  EmailEditionSnapshot,
  EmailEventCard,
  EmailSportsCard,
  EmailStoryCard,
  SchoolCalendarItem,
  Subscriber,
} from "@/lib/types";

import { getSite, siteOrigin, siteWordmark } from "@/lib/sites";

const DETROIT_TIME_ZONE = "America/Detroit";

function letterOrigin(): string {
  return siteOrigin();
}

function letterWordmark(): string {
  return siteWordmark();
}

/** Fallback when the signup list is empty or still has fake/example/verify addresses. */
export const DESK_LETTER_FALLBACK = "nickperez@gmail.com";

/** Subject prefix for Nick-only 8am previews (live send keeps the bare subject). */
export const PREVIEW_SUBJECT_PREFIX = "Preview · ";

/** Email-safe stack closer to TLDR’s system sans (Roboto on Android). */
const LETTER_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const LETTER_SCHOOL_TITLE_MARKERS = [
  "orientation",
  "first day",
  "1st student day",
  "first student day",
  "half day",
  "half-day",
  "halfday",
  "conference",
  "conferences",
  "parent-teacher",
  "parent teacher",
  "parent/teacher",
  "spring break",
  "winter break",
  "holiday break",
  "christmas break",
  "thanksgiving break",
  "winter recess",
  "spring recess",
  "last day",
];

type LetterSchoolDate = {
  title: string;
  starts_at: string;
  district: string;
  place?: string;
  url?: string;
  time_unknown?: true;
};

type RenderedItem = {
  html: string;
  text: string;
};

type SubjectItem = {
  text: string;
  /** Original card title — recut must use this, never an already-shortened phrase. */
  sourceTitle: string;
  kind: "lead" | "tonight" | "around" | "alert";
};

/** Regular game recap — not subject-worthy unless it is a real news story. */
function isRegularSportsRecap(title: string): boolean {
  if (
    /state (title|championship|final)|mhsaa (final|championship)|playoff/i.test(
      title,
    )
  ) {
    return false;
  }
  return /squeaks out|win vs\.?|wins vs\.?|play to (a )?(somber )?tie|sports overtime|scores and highlights|prep roundup|defeats |quad meet/i.test(
    title,
  );
}

/** Feature / night-out / anniversary — fine in the letter body, not the subject. */
function isLifestyleOrEventTitle(title: string): boolean {
  return /wine grapes|wildfire smoke|hamlet of hundreds|wings and wheels|sports overtime|scores and highlights|silent disco|artist talk|artist reception|concert|festival|fly-in|open mic|storytime|sing\s*&\s*stomp|chorus|celebrat|anniversary|opera house|exhibit|gallery opening|old neighborhood|glen eyrie|going strong for a century|library news|dog days|ski hall of fame|ready,? set,? locals/i.test(
    title,
  );
}

/** Court, crash, vote, charges, housing, FEMA — prefer these over features for the subject. */
function isHardNewsTitle(title: string): boolean {
  return /court|crash|lawsuit|\bsuit\b|vote|killed|fatal|arrest|charges|sentenc|zoning|ordinance|budget|spill(?!.*wine)|data[- ]?center|moratorium|\bban\b|housing|afford|fema|flood|treasurer|under oath|survey|parking rates?/i.test(
    title,
  );
}

/**
 * Lower is better for subject slots. Civic hard news (bans, housing, FEMA,
 * under-oath reports) beats parking-rate / crash / routine hard news.
 */
function hardNewsSubjectRank(title: string): number {
  if (
    /data[- ]?center|moratorium|\bban\b|under oath|treasurer|fema|flood|housing|afford|survey/i.test(
      title,
    )
  ) {
    return 0;
  }
  if (/parking rates?/i.test(title)) return 1;
  if (/crash|killed|fatal|arrest|charges|lawsuit|zoning|ordinance|budget|court/i.test(title)) {
    return 2;
  }
  if (isHardNewsTitle(title)) return 3;
  return 4;
}

function isFakeSubscriberEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return true;

  const domain = email.split("@")[1] ?? "";
  return (
    domain === "example.com" ||
    domain.endsWith(".example.com") ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "test" ||
    domain.endsWith(".test") ||
    domain === "invalid" ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".localhost") ||
    email.includes("desk-list-verify") ||
    /(^|[.+_-])(verify|fake|placeholder|dummy)([.+_-]|$)/.test(email) ||
    email.startsWith("noreply@") ||
    email.startsWith("no-reply@") ||
    email.startsWith("donotreply@")
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Google Drive / Docs / Sheets / Forms URLs must not become hrefs in the
 * morning letter. Gmail promotes those links into a Drive attachment chip
 * even when Resend sends multipart/alternative with no real attachments.
 * Keep the real title and dek; leave the title as plain strong text.
 */
/** Public href: apex host, never workers.dev. Drive/Docs URLs stay unlinked. */
export function canonicalPublicUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return `${letterOrigin()}${trimmed}`;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();
    if (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host === "forms.gle" ||
      host.endsWith(".drive.google.com") ||
      host.endsWith(".docs.google.com") ||
      host.endsWith(".googleusercontent.com")
    ) {
      return null;
    }

    const site = getSite();
    const siteHost = site.hostname.replace(/^www\./, "");
    if (
      host === siteHost ||
      host === `www.${siteHost}` ||
      host.endsWith(".workers.dev")
    ) {
      return `${letterOrigin()}${url.pathname}${url.search}`;
    }

    return trimmed;
  } catch {
    return null;
  }
}

/** Trailing function words left by a bad budget cut — never ship these. */
const TRAIL_STOP =
  /\s+(on|at|for|of|in|with|and|the|a|an|as|vs|versus|from|to|by|into|onto)$/i;

/** Record-Eagle-style ALL CAPS kicker (letters only, ≥4 chars). */
function isAllCapsKicker(phrase: string): boolean {
  const letters = phrase.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

/** Title-case an ALL CAPS kicker so it cannot ship as shouting. */
function titleCaseKicker(phrase: string): string {
  const small = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
    "versus",
    "with",
  ]);
  const words = phrase.replace(/\s+/g, " ").trim().split(" ");
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      if (!/[A-Za-z]/.test(word)) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function isInsiderShorthand(phrase: string): boolean {
  const t = phrase.trim();
  if (!t) return true;
  // Last name / one-word insider tag alone is not parseable to a stranger.
  if (!/\s/.test(t) && t.length < 12) return true;
  if (/^[A-Z][a-z]{1,14}$/.test(t)) return true;
  return false;
}

function isGenericPlace(phrase: string): boolean {
  const n = phrase
    .toLowerCase()
    .replace(/[.,’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^(the )?(grand traverse( area| county)?|leelanau( county)?|benzie( county)?|antrim( county)?|kalkaska( county)?|traverse city|northern michigan|up north|the bay|around the bay)$/.test(
    n,
  );
}

/**
 * Bare adjectives left by a budget cut — "to purchase new", "faces life-threatening".
 * Object must follow; ending here is not stranger-parseable.
 */
const TRAIL_BARE_ADJECTIVE =
  /\b(new|old|young|big|small|major|local|serious|critical|fatal|severe|life-threatening)$/i;

/**
 * Verbs / participles that need an object or complement — "boy faces",
 * "office looking", "to purchase", "driver charged". OK mid-phrase when the
 * object is present; never as the last word.
 */
const TRAIL_DANGLING_VERB =
  /\b(looking|seeking|searching|investigating|asking|asks|calling|urging|hoping|planning|working|trying|charged|arrested|faces|facing|purchase|purchases|purchasing|seeks|seek|wants|needs)$/i;

/**
 * Truncated / dangling phrases a stranger cannot parse — "Sheriff's office
 * looking", "North Ed to purchase new", "1-year-old Acme boy faces",
 * "Driver Charged in Center", "Teaching Kids in the Age".
 */
function isIncompleteSubjectPhrase(phrase: string): boolean {
  const t = phrase.replace(/\s+/g, " ").trim();
  if (!t) return true;
  // Trailing preposition / article left after a bad cut.
  if (TRAIL_STOP.test(t)) return true;
  // Bare adjective with no noun after it.
  if (TRAIL_BARE_ADJECTIVE.test(t)) return true;
  // Dangling verb / participle with no object ("looking", "faces", "purchase").
  if (TRAIL_DANGLING_VERB.test(t)) return true;
  // Truncated road / street name: "… in Center" / "… on Main" without Road/St.
  if (
    /\b(in|on|at|near|along)\s+(Center|Main|Front|State|Union|Division|Eighth|Fourteenth|Peninsula|Airport|Boardman)$/i.test(
      t,
    )
  ) {
    return true;
  }
  // "in Center" shorthand for Center Road — never ship that alone mid-phrase.
  if (/\bin Center$/i.test(t) && !/\bCenter Road\b/i.test(t)) return true;
  // Classroom-AI era cut: "… in the Age", "… in the Age of", "… of Artificial".
  if (/\bin the Age(?:\s+of)?$/i.test(t)) return true;
  if (/\bof Artificial$/i.test(t)) return true;
  // Cut mid-complement: "… for student" (needs transportation / students).
  if (/\bfor (student|child|resident|driver)$/i.test(t)) return true;
  // Gerund cut: "… After Falling" / "… After Being".
  if (/\bAfter (Falling|Being|Getting|Leaving|Hitting)\b$/i.test(t)) return true;
  return false;
}

/** True when a stranger can parse the phrase (place + what, or full name). */
export function usableSubjectPhrase(phrase: string): boolean {
  if (!phrase || isInsiderShorthand(phrase) || isGenericPlace(phrase)) return false;
  if (isIncompleteSubjectPhrase(phrase)) return false;
  // Never ship an ALL CAPS org kicker as a subject phrase.
  if (isAllCapsKicker(phrase)) return false;
  // "Grand Traverse Area Genealogical" is still just a place + one leftover word.
  const n = phrase
    .toLowerCase()
    .replace(/[.,’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const prefixes = [
    "grand traverse area",
    "grand traverse county",
    "grand traverse",
    "leelanau county",
    "benzie county",
    "antrim county",
    "kalkaska county",
    "traverse city",
    "northern michigan",
  ];
  for (const prefix of prefixes) {
    if (n === prefix) return false;
    if (n.startsWith(`${prefix} `)) {
      const rest = n.slice(prefix.length).trim();
      if (rest.split(/\s+/).filter(Boolean).length < 2) return false;
    }
  }
  return true;
}

/** Acme / pond / toddler rewrite signals for same-story subject dedupe. */
function toddlerIncidentSignals(text: string): {
  toddler: boolean;
  acme: boolean;
  pond: boolean;
  hospital: boolean;
} {
  const t = text.toLowerCase();
  return {
    toddler:
      /1[- ]?year[- ]?old|one[- ]?year[- ]?old|toddler|infant|\bbaby\b/.test(t),
    acme: /\bacme\b/.test(t),
    pond: /\bpond\b/.test(t),
    hospital: /hospitaliz|injur/.test(t),
  };
}

/**
 * Same toddler / pond / Acme incident across desks — even when one head is
 * "1-year-old Acme boy faces …" and the other is "One-Year-Old Hospitalized".
 */
function looksLikeSameToddlerIncident(a: string, b: string): boolean {
  const sa = toddlerIncidentSignals(a);
  const sb = toddlerIncidentSignals(b);
  if (!sa.toddler || !sb.toddler) return false;
  if (sa.acme && sb.acme) return true;
  if (sa.pond && sb.pond) return true;
  if (sa.hospital && sb.hospital) return true;
  // Cross-desk rewrite: Acme toddler + hospitalized / pond on the other.
  if (
    (sa.acme || sb.acme) &&
    (sa.pond || sb.pond || sa.hospital || sb.hospital)
  ) {
    return true;
  }
  return false;
}

/** Same-story subject candidates — fuzzy, not title-exact only. */
function isSameSubjectStory(
  a: { text: string; sourceTitle: string },
  b: { text: string; sourceTitle: string },
): boolean {
  if (a.text === b.text) return true;
  if (titlesLikelySameStory(a.sourceTitle, b.sourceTitle)) return true;
  if (titlesLikelySameStory(a.text, b.text)) return true;
  if (titlesLikelySameStory(a.sourceTitle, b.text)) return true;
  if (titlesLikelySameStory(a.text, b.sourceTitle)) return true;
  if (looksLikeSameToddlerIncident(a.sourceTitle, b.sourceTitle)) return true;
  if (looksLikeSameToddlerIncident(a.text, b.text)) return true;
  if (looksLikeSameToddlerIncident(a.sourceTitle, b.text)) return true;
  if (looksLikeSameToddlerIncident(a.text, b.sourceTitle)) return true;
  return false;
}

function stripTrailingStops(s: string): string {
  let out = s.trim();
  for (let i = 0; i < 6; i += 1) {
    const next = out.replace(TRAIL_STOP, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Prefer a complete sense unit under budget. Never return a dangling verb
 * phrase or a truncated "in Center" (Center Road) cut.
 */
function phraseFromTitle(title: string, budget = 40): string {
  let t = title.replace(/\s+/g, " ").trim().replace(/[?]+$/, "");
  t = t.replace(/\s+except\s+near\s+.+$/i, "").trim();
  // Keep "near Cadillac" on crash heads so subject compress can use the real place.
  if (!/\b(crash|collision)\b/i.test(t)) {
    t = t.replace(/\s+near\s+.+$/i, "").trim();
  }
  t = t.replace(/\s+except$/i, "").trim();
  t = t.replace(/\b(Township|County)\b/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(could|would|will|how|why|what|is|are)\s+/i, "");
  if (/wildfire smoke/i.test(t) && /wine grapes/i.test(t)) {
    return "Smoke and wine grapes";
  }
  if (/stimson street/i.test(t) && /reconstruction|project|begins/i.test(t)) {
    return "Stimson Street Project";
  }
  if (/rabies/i.test(t) && /bat|tests positive|health/i.test(t)) {
    return "Bat tests positive for rabies";
  }
  if (/garfield/i.test(t) && /data[- ]?center/i.test(t) && /ban|moratorium/i.test(t)) {
    return "Garfield data-center ban";
  }
  if (/leelanau/i.test(t) && /hous|afford|live there/i.test(t)) {
    return "Leelanau housing survey";
  }
  if (/fema/i.test(t) && /flood|aid|million/i.test(t)) {
    return "FEMA deadline Monday";
  }
  if (/treasurer/i.test(t) && /under oath|report/i.test(t)) {
    return "GT treasurer under oath";
  }
  if (/parking rates?/i.test(t) && /decrease|labor day|coming/i.test(t)) {
    return "Decrease in Parking Rates";
  }
  // North Ed bus purchase — keep the object; never "to purchase new".
  if (/north ed/i.test(t) && /purchase|buy/i.test(t) && /buses?\b/i.test(t)) {
    return "North Ed new buses";
  }
  // Acme / pond toddler — one short complete phrase across desk rewrites.
  if (
    /(1[- ]?year[- ]?old|one[- ]?year[- ]?old|toddler)/i.test(t) &&
    /(acme|pond)/i.test(t) &&
    /(hospitaliz|injur|faces|falling|fell)/i.test(t)
  ) {
    return "Acme toddler hospitalized";
  }
  // South Airport reopen — keep the verb; never ship a bare place stump.
  if (/south airport/i.test(t) && /reopen|opens?/i.test(t)) {
    return /westbound/i.test(t)
      ? "Westbound South Airport reopens"
      : "South Airport reopens";
  }
  // Deputy SUV rescue — complete phrase; trailing "from" alone is refused.
  if (
    /deputy/i.test(t) &&
    /rescues?/i.test(t) &&
    /suv|submerged|vehicle/i.test(t)
  ) {
    return "Deputy rescues two from SUV";
  }
  // Center Road crash — never stop at "in Center".
  if (/driver charged/i.test(t) && /center road/i.test(t)) {
    const phrase = "Driver charged in Center Road crash";
    if (phrase.length <= Math.max(budget, 40)) return phrase;
    return "Center Road crash";
  }
  if (/center road/i.test(t) && /crash|collision|killed|charged/i.test(t)) {
    return "Center Road crash";
  }
  // Drop Record-Eagle ALL CAPS kickers ("LEAGUE OF WOMEN VOTERS: Local ballot…").
  t = t.replace(/^([A-Z][A-Z0-9 /&'.-]{2,}):\s+/, (full, kicker: string) =>
    isAllCapsKicker(kicker) ? "" : full,
  );
  // Classroom AI — never ship "Teaching Kids in the Age" / "of Artificial".
  if (
    /teaching kids|classroom|students?/i.test(t) &&
    /artificial intelligence|\bage of (?:artificial|ai)\b|\bA\.?I\.?\b/i.test(t)
  ) {
    if (/\btcaps\b/i.test(t)) return "TCAPS on classroom AI";
    const full = "Teaching kids in the age of AI";
    if (full.length <= Math.max(budget, 29)) return full;
    // Tight recut budget: still a complete phrase, never "in the Age".
    return "Teaching kids on AI";
  }
  // Sheriff looking / seeking — keep a stranger-parseable tip ask.
  if (/sheriff/i.test(t) && /\b(looking|seeking|searching)\b/i.test(t)) {
    if (/burglar|break[- ]?in|theft|stolen/i.test(t)) {
      return "Sheriff seeks burglary tips";
    }
    if (/witness/i.test(t)) {
      return "Sheriff seeks crash witnesses";
    }
    if (/information|tips?|public'?s help/i.test(t)) {
      return "Sheriff seeks tips";
    }
  }

  const finalize = (raw: string): string | null => {
    let cleaned = stripTrailingStops(raw);
    // Title-case leftover ALL CAPS; usableSubjectPhrase still refuses shouting.
    if (isAllCapsKicker(cleaned)) {
      cleaned = titleCaseKicker(cleaned);
    }
    return usableSubjectPhrase(cleaned) ? cleaned : null;
  };

  if (t.length <= budget) {
    // Never fall back to a raw stump when finalize refuses.
    return finalize(t) ?? "";
  }
  for (const sep of [": ", " — ", " – ", " - ", "; ", ", "]) {
    const i = t.indexOf(sep);
    if (i >= 12 && i <= budget) {
      const before = t.slice(0, i);
      // Never take an ALL CAPS kicker as the colon cut.
      if (isAllCapsKicker(before)) continue;
      const cut = finalize(before);
      if (cut) return cut;
    }
  }

  // Word-budget cut: refuse incomplete endings. Soft-overflow a few words when
  // that completes an object ("new" → "new buses", "faces" → "faces surgery")
  // or a road name — never ship a dangling stump just to hit the budget.
  const words = t.split(" ");
  const softCap = budget + 16;
  let out = "";
  let cutAt = 0;
  for (let i = 0; i < words.length; i += 1) {
    const next = out ? `${out} ${words[i]}` : words[i];
    if (next.length > budget) {
      // Prefer completing "Center Road" / "… Road crash" just over budget.
      const peek1 = words[i];
      const peek2 = words[i + 1];
      if (peek1 && /^(Road|Street|Ave|Avenue|Drive|Hwy|Highway)$/i.test(peek1)) {
        const withRoad = `${out} ${peek1}`;
        if (withRoad.length <= budget + 8) {
          const withCrash =
            peek2 && /^(crash|collision)$/i.test(peek2)
              ? `${withRoad} ${peek2}`
              : withRoad;
          const done = finalize(
            withCrash.length <= budget + 14 ? withCrash : withRoad,
          );
          if (done) return done;
        }
      }
      const closer = t.slice(out.length).trim().match(
        /^(for a year|for a month|for a week|for a day)\b/i,
      );
      if (closer && `${out} ${closer[1]}`.length <= budget + 10) {
        const done = finalize(`${out} ${closer[1]}`);
        if (done) return done;
      }
      cutAt = i;
      break;
    }
    out = next;
    cutAt = i + 1;
  }

  // If the budget cut left a dangling adjective/verb, keep adding words until
  // the phrase parses (within softCap) — else drop the phrase entirely.
  if (out && isIncompleteSubjectPhrase(stripTrailingStops(out))) {
    let extended = out;
    for (let i = cutAt; i < words.length; i += 1) {
      const next = `${extended} ${words[i]}`;
      if (next.length > softCap) break;
      extended = next;
      const done = finalize(extended);
      if (done) return done;
    }
  }

  const cut = finalize(out);
  if (cut) return cut;

  // Last resort: try shorter complete prefixes from the full title.
  // Prefer the longest complete phrase that still fits — never a stump.
  for (let n = words.length; n >= 3; n -= 1) {
    const candidate = finalize(words.slice(0, n).join(" "));
    if (candidate && candidate.length <= Math.max(softCap, 48)) {
      return candidate;
    }
  }
  // Unusable under budget — empty so callers skip via usableSubjectPhrase.
  // Never ship an incomplete stump after finalize refused.
  return "";
}

function isDuplicateBoardmanTitle(title: string): boolean {
  return /no[- ]?body[- ]contact advisory|issued for boardman|boardman advisory|level 2 advisory|sewage spill/i.test(
    title,
  );
}

function isSportsSourceCard(card: {
  sources?: string[] | null;
}): boolean {
  return (card.sources ?? []).some((s) =>
    /sports|athletics|local sports/i.test(s),
  );
}

function pickAroundNews(
  around: EmailEditionSnapshot["around"],
  limit = 2,
  already: SubjectItem[] = [],
): SubjectItem[] {
  const ranked = [...around].sort((a, b) => {
    const ta = a.title || "";
    const tb = b.title || "";
    return hardNewsSubjectRank(ta) - hardNewsSubjectRank(tb);
  });
  const out: SubjectItem[] = [];
  const seen = [...already];
  for (const card of ranked) {
    const title = (card.title || "").replace(/\s+/g, " ").trim();
    if (
      !title ||
      isDuplicateBoardmanTitle(title) ||
      isLifestyleOrEventTitle(title) ||
      isRegularSportsRecap(title) ||
      isSportsSourceCard(card)
    ) {
      continue;
    }
    const text = phraseFromTitle(title, 44);
    if (!usableSubjectPhrase(text)) continue;
    const item: SubjectItem = { text, sourceTitle: title, kind: "around" };
    if (seen.some((p) => isSameSubjectStory(p, item))) continue;
    out.push(item);
    seen.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function pickAlertNews(
  alerts: EmailEditionSnapshot["alerts"],
  limit: number,
  already: SubjectItem[],
): SubjectItem[] {
  const ranked = [...alerts].sort((a, b) => {
    const ta = a.title || "";
    const tb = b.title || "";
    const ra = isHardNewsTitle(ta) || /rabies|health/i.test(ta) ? 0 : 1;
    const rb = isHardNewsTitle(tb) || /rabies|health/i.test(tb) ? 0 : 1;
    return ra - rb;
  });
  const out: SubjectItem[] = [];
  const seen = [...already];
  for (const alert of ranked) {
    const title = (alert.title || "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    if (/lifts? |lifted|back open|reopened/i.test(title)) continue;
    if (isLifestyleOrEventTitle(title) || isRegularSportsRecap(title)) continue;
    const text = phraseFromTitle(title, 36);
    if (!usableSubjectPhrase(text)) continue;
    const item: SubjectItem = { text, sourceTitle: title, kind: "alert" };
    if (seen.some((p) => isSameSubjectStory(p, item))) continue;
    out.push(item);
    seen.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * News-only 2–3 parseable phrases. Deterministic from snapshot fields only.
 * Prefer 3 when they still parse. Never a last name, lifestyle/tonight item,
 * or regular sports recap. Soft cap ~80 on phrases (emoji not counted); drop
 * to 2 only if still over 84 after shortening.
 */
export function buildMorningLetterSubject(snapshot: EmailEditionSnapshot): string {
  const parts: SubjectItem[] = [];
  if (snapshot.lead?.title) {
    const sourceTitle = snapshot.lead.title.replace(/\s+/g, " ").trim();
    const text = phraseFromTitle(sourceTitle, 48);
    if (usableSubjectPhrase(text)) {
      parts.push({ text, sourceTitle, kind: "lead" });
    }
  }

  // Pull a wider pool so we can pack 3 complete phrases under the soft cap
  // when the top-ranked three are too long together.
  const aroundPool = pickAroundNews(snapshot.around, 5, parts);
  for (const item of aroundPool) {
    if (parts.some((p) => isSameSubjectStory(p, item))) continue;
    parts.push(item);
  }

  if (parts.length < 5) {
    for (const item of pickAlertNews(
      snapshot.alerts,
      5 - parts.length,
      parts,
    )) {
      parts.push(item);
    }
  }

  if (parts.length === 0) {
    return `🗞️ ${letterWordmark()} · ${emailDetroitDateKey()}`;
  }

  const render = (items: SubjectItem[]): string => {
    const bits = items.map((i) =>
      i.kind === "tonight" ? `🌙 ${i.text}` : i.text,
    );
    return `🗞️ ${bits.join(" · ")}`;
  };

  const compressItem = (p: SubjectItem): SubjectItem => {
    let text = p.text.replace(/\s+for a (year|month|week|day)$/i, "").trim();
    text = text.replace(/\bheads back to court\b/i, "back in court");
    text = text.replace(/\bPark back in court\b/i, "back in court");
    text = text.replace(/\bsqueaks out (?:a )?win vs\.?\s+/i, "over ");
    text = text.replace(/\bsqueaks out (?:a )?win\b/i, "wins");
    text = text.replace(/\bwins? vs\.?\s+/i, "over ");
    text = text.replace(
      /^(?:three-vehicle |head-on )?crash on (M-\d+) near ([A-Za-z][A-Za-z .]+)$/i,
      "$1 crash near $2",
    );
    text = stripTrailingStops(text);
    // Never keep a post-compress incomplete phrase ("looking", "in Center").
    return { ...p, text: usableSubjectPhrase(text) ? text : p.text };
  };

  const pool: SubjectItem[] = [];
  for (const raw of parts.map(compressItem)) {
    if (!usableSubjectPhrase(raw.text)) continue;
    if (pool.some((p) => isSameSubjectStory(p, raw))) continue;
    pool.push(raw);
  }
  if (pool.length === 0) {
    return `🗞️ ${letterWordmark()} · ${emailDetroitDateKey()}`;
  }

  const phraseLen = (s: string) => s.replace(/^🗞️\s*/, "").length;

  // Pack up to 3 complete phrases under 84 — skip a long card when a later
  // shorter one still fits rather than stump-recutting.
  const packUnderCap = (ordered: SubjectItem[]): SubjectItem[] => {
    const packed: SubjectItem[] = [];
    for (const item of ordered) {
      if (packed.length >= 3) break;
      if (packed.some((p) => isSameSubjectStory(p, item))) continue;
      const trial = [...packed, item];
      if (phraseLen(render(trial)) <= 84) packed.push(item);
    }
    return packed;
  };

  // Prefer hard-news rank order; if that yields fewer than 3, retry packing
  // shortest-first so three complete phrases still fit when they can.
  let chosen = packUnderCap(pool);
  if (chosen.length < 3 && pool.length > chosen.length) {
    const byShort = [...pool].sort((a, b) => a.text.length - b.text.length);
    const packed = packUnderCap(byShort);
    if (packed.length > chosen.length) chosen = packed;
  }

  if (chosen.length === 0) {
    return `🗞️ ${letterWordmark()} · ${emailDetroitDateKey()}`;
  }

  let subject = render(chosen);

  // Soft cap ~80 (emoji not counted). Never recut a complete phrase into a
  // char-budget stump ("to purchase new", "boy faces") — if three complete
  // phrases still run past 84, drop to 2 instead of truncating mid-thought.
  if (phraseLen(subject) > 84 && chosen.length >= 3) {
    chosen = chosen.slice(0, 2);
    subject = render(chosen);
  }
  // Final guard: never slice mid-phrase into an incomplete stump with "…".
  // Prefer dropping a phrase over a hard character cut.
  if (phraseLen(subject) > 84 && chosen.length > 1) {
    chosen = chosen.slice(0, Math.max(1, chosen.length - 1));
    subject = render(chosen);
  }
  if (phraseLen(subject) > 84) {
    // Last resort only when a single phrase is still over — trim at a word
    // boundary, then refuse if the result is incomplete.
    const trimmed = `${subject.slice(0, 81).replace(/\s+\S*$/, "").replace(/[·,\s]+$/, "")}`;
    const body = trimmed.replace(/^🗞️\s*/, "");
    if (usableSubjectPhrase(body)) {
      subject = `🗞️ ${body}`;
    } else {
      return `🗞️ ${letterWordmark()} · ${emailDetroitDateKey()}`;
    }
  }
  return subject;
}

/**
 * Outlet credit for a letter card. Never print our own masthead as the
 * reporting source — staff originals that synthesize other desks should
 * credit those desks (e.g. "9&10 News · Record-Eagle · UpNorthLive").
 * Returns "" when nothing remains after filtering (omit the source line).
 */
export function letterSourceCredit(sources: string[] | undefined): string {
  return (sources ?? [])
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      return lower !== "traverse.news" && lower !== "traverse news";
    })
    .join(" · ");
}

function renderStory(story: EmailStoryCard): RenderedItem {
  const url = canonicalPublicUrl(story.url);
  const title = escapeHtml(story.title);
  const dek = story.dek?.trim() ? escapeHtml(story.dek.trim()) : "";
  const source = letterSourceCredit(story.sources);

  return {
    html: `<p style="margin:0;font-family:${LETTER_FONT};font-size:16px;line-height:1.35;">${
      url
        ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
        : `<strong>${title}</strong>`
    }</p>
${dek ? `<p style="margin:12px 0 6px;font-family:${LETTER_FONT};font-size:14px;line-height:1.5;color:#333333;">${dek}</p>` : ""}
${source ? `<p style="margin:0 0 18px;font-family:${LETTER_FONT};font-size:12px;color:#666666;">${escapeHtml(source)}${story.paywalled ? " · Paywall" : ""}</p>` : '<p style="margin:0 0 18px;"></p>'}`,
    text: [
      url ? `${story.title} ${url}` : story.title,
      story.dek?.trim() || "",
      source ? `${source}${story.paywalled ? " · Paywall" : ""}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function renderAlert(alert: EmailAlertCard): RenderedItem {
  const url = canonicalPublicUrl(alert.url);
  const title = escapeHtml(alert.title);
  const dek = alert.dek?.trim() ? escapeHtml(alert.dek.trim()) : "";

  return {
    html: `<p style="margin:0;font-family:${LETTER_FONT};font-size:16px;line-height:1.35;">${
      url
        ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
        : `<strong>${title}</strong>`
    }</p>
${dek ? `<p style="margin:12px 0 6px;font-family:${LETTER_FONT};font-size:14px;line-height:1.5;color:#333333;">${dek}</p>` : ""}
<p style="margin:0 0 18px;font-family:${LETTER_FONT};font-size:12px;color:#666666;">${escapeHtml(alert.source_name)}</p>`,
    text: [
      url ? `${alert.title} ${url}` : alert.title,
      alert.dek?.trim() || "",
      alert.source_name,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function renderEvent(
  event: EmailEventCard | EmailSportsCard,
  context?: string,
): RenderedItem {
  const whenParts = formatEventWhenParts(event.starts_at, new Date(), {
    timeUnknown: event.time_unknown,
  });
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(event.starts_at));
  const time =
    event.time_unknown || whenParts.time === "-" ? "" : whenParts.time;
  const when = time ? `${day} ${time}` : day;
  const url = canonicalPublicUrl(event.url);
  const title = escapeHtml(event.title);
  const titleHtml = url
    ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
    : `<strong>${title}</strong>`;
  const place = event.place?.trim() ? escapeHtml(event.place.trim()) : "";
  const details = [context ? escapeHtml(context) : "", place]
    .filter(Boolean)
    .join(" · ");

  return {
    html: `<p style="margin:0 0 4px;font-family:${LETTER_FONT};font-size:13px;color:#555555;">${escapeHtml(when)}</p>
<p style="margin:0 0 6px;font-family:${LETTER_FONT};font-size:16px;line-height:1.35;">${titleHtml}</p>
${details ? `<p style="margin:0 0 18px;font-family:${LETTER_FONT};font-size:13px;color:#555555;">${details}</p>` : '<p style="margin:0 0 18px;"></p>'}`,
    text: [
      when,
      url ? `${event.title} ${url}` : event.title,
      [context, event.place].filter(Boolean).join(" · "),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function sectionHeading(emoji: string, label: string, url?: string): string {
  const content = `${emoji} ${escapeHtml(label)}`;
  return `<h2 style="margin:28px 0 12px;font-family:${LETTER_FONT};font-size:15px;letter-spacing:0.04em;text-transform:uppercase;font-weight:800;">${
    url
      ? `<a href="${escapeHtml(url)}" style="color:#111111;text-decoration:none;">${content}</a>`
      : content
  }</h2>`;
}

function textSectionHeading(emoji: string, label: string): string {
  return `${emoji} ${label.toUpperCase()}`;
}

/** Absolute unsubscribe URL for the morning letter footer. */
export function unsubscribeUrl(email?: string | null): string {
  const base = `${letterOrigin()}/email/unsubscribe`;
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized || !normalized.includes("@")) return base;
  return `${base}?email=${encodeURIComponent(normalized)}`;
}

export function buildMorningLetter(
  letter: EmailEditionSnapshot,
  options: {
    school?: LetterSchoolDate | null;
    /** Personalized one-click opt-out when sending to a single address. */
    unsubscribeEmail?: string | null;
  } = {},
): { subject: string; html: string; text: string } {
  const subject = buildMorningLetterSubject(letter);
  const editionLabel = formatEmailEditionLabel(letter.date);
  const dateLabel = emailDateLabel(
    (() => {
      const [year, month, day] = letter.date.split("-").map(Number);
      return new Date(
        year && month && day
          ? Date.UTC(year, month - 1, day, 17, 0, 0)
          : letter.captured_at,
      );
    })(),
  );
  const html: string[] = [];
  const text: string[] = [];
  const unsubscribeHref = unsubscribeUrl(options.unsubscribeEmail);

  html.push(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:${LETTER_FONT};">
<div style="max-width:560px;margin:0 auto;padding:28px 20px 40px;">
<p style="margin:0;text-align:center;font-family:${LETTER_FONT};font-size:24px;font-weight:800;letter-spacing:-0.02em;"><a href="${letterOrigin()}" style="color:#111111;text-decoration:none;">${letterWordmark()}</a></p>
<p style="margin:10px 0 0;text-align:center;font-family:${LETTER_FONT};font-size:15px;font-weight:600;color:#111111;">${escapeHtml(editionLabel)}</p>
<p style="margin:4px 0 8px;text-align:center;font-family:${LETTER_FONT};font-size:13px;letter-spacing:0.04em;color:#333333;">${
    letter.weather_line
      ? `<span style="letter-spacing:0.08em;text-transform:uppercase;color:#666666;">${escapeHtml(dateLabel)}</span> · <span style="font-weight:700;color:#111111;">${escapeHtml(letter.weather_line)}</span>`
      : `<span style="letter-spacing:0.08em;text-transform:uppercase;color:#888888;">${escapeHtml(dateLabel)}</span>`
  }</p>`);
  text.push(letterWordmark());
  text.push(editionLabel);
  text.push(
    letter.weather_line
      ? `${dateLabel} · ${letter.weather_line}`
      : dateLabel,
  );
  text.push("");

  if (letter.lead) {
    html.push(sectionHeading("📰", "The one to read"));
    text.push(textSectionHeading("📰", "The one to read"));
    // Desk originals synthesize local desks — credit those outlets from
    // story.sources, never override to "traverse.news" as the reporting line.
    const rendered = renderStory(letter.lead);
    html.push(rendered.html);
    text.push(rendered.text, "");
  }

  if (letter.around.length > 0) {
    html.push(
      sectionHeading(getSite().aroundEmoji, getSite().aroundLabel, letterOrigin()),
    );
    text.push(textSectionHeading(getSite().aroundEmoji, getSite().aroundLabel));
    for (const story of letter.around) {
      const rendered = renderStory(story);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.alerts.length > 0) {
    html.push(sectionHeading("🚨", "Alerts"));
    text.push(textSectionHeading("🚨", "Alerts"));
    for (const alert of letter.alerts) {
      const rendered = renderAlert(alert);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.tonight.length > 0) {
    html.push(sectionHeading("🌙", "What's on", `${letterOrigin()}/events`));
    text.push(textSectionHeading("🌙", "What's on"));
    for (const event of letter.tonight) {
      const rendered = renderEvent(event);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.civic.length > 0) {
    html.push(sectionHeading("🏛", "Civic", `${letterOrigin()}/civic`));
    text.push(textSectionHeading("🏛", "Civic"));
    for (const event of letter.civic) {
      const rendered = renderEvent(event);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.sports.length > 0) {
    html.push(sectionHeading("🏈", "Sports", `${letterOrigin()}/sports`));
    text.push(textSectionHeading("🏈", "Sports"));
    for (const event of letter.sports) {
      const school = "school" in event ? event.school : "";
      const rendered = renderEvent(event, school);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  const school = options.school ?? null;
  if (school) {
    html.push(sectionHeading("🎒", "Schools", `${letterOrigin()}/schools`));
    text.push(textSectionHeading("🎒", "Schools"));
    const rendered = renderEvent(
      {
        title: school.title,
        starts_at: school.starts_at,
        place: school.place || school.district,
        url: school.url || `${letterOrigin()}/schools`,
        time_unknown: school.time_unknown ?? true,
      },
      school.district,
    );
    html.push(rendered.html);
    text.push(rendered.text, "");
  }

  html.push(`<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eeeeee;font-family:${LETTER_FONT};font-size:12px;line-height:1.5;color:#888888;text-align:center;">
${letterWordmark()} · ${getSite().place}, ${getSite().placeState}<br>
<a href="${letterOrigin()}/tips" style="color:#555555;">Send a tip</a> · <a href="${letterOrigin()}/email/${escapeHtml(letter.date)}" style="color:#555555;">Archive</a> · <a href="${escapeHtml(unsubscribeHref)}" style="color:#555555;">Unsubscribe</a>
</p>
</div>
</body>
</html>`);
  text.push(`${letterWordmark()} · ${getSite().place}, ${getSite().placeState}`);
  text.push(`Send a tip: ${letterOrigin()}/tips`);
  text.push(`Archive: ${letterOrigin()}/email/${letter.date}`);
  text.push(`Unsubscribe: ${unsubscribeHref}`);

  return {
    subject,
    html: html.join("\n"),
    text: text.join("\n").replace(/\n{3,}/g, "\n\n"),
  };
}

export function isDetroitSunday(at = new Date()): boolean {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: DETROIT_TIME_ZONE,
      weekday: "short",
    }).format(at) === "Sun"
  );
}

export function morningLetterSentKvKey(date: string): string {
  return `morning_letter_sent:${date}`;
}

/** Nick-only preview idempotency (separate from public `morning_letter_sent`). */
export function morningLetterPreviewKvKey(date: string): string {
  return `morning_letter_preview:${date}`;
}

export function previewLetterSubject(subject: string): string {
  return `${PREVIEW_SUBJECT_PREFIX}${subject}`;
}

export function pickLetterSchoolDate(
  schools: SchoolCalendarItem[] | null | undefined,
  at = new Date(),
): LetterSchoolDate | null {
  if (!schools?.length) return null;

  const selected = selectUpcomingSchoolDays(schools, at).find((school) => {
    const title = school.title.toLowerCase();
    return (
      isImportantSchoolDate(school.title) &&
      LETTER_SCHOOL_TITLE_MARKERS.some((marker) => title.includes(marker))
    );
  });
  if (!selected) return null;

  const result: LetterSchoolDate = {
    title: selected.title,
    starts_at: selected.starts_at,
    district: selected.district,
  };
  if (selected.place) result.place = selected.place;
  if (selected.url) result.url = selected.url;
  if (selected.time_unknown) result.time_unknown = true;
  return result;
}

export function resolveLetterRecipients(subscribers: Subscriber[]): string[] {
  const emails = [
    ...new Set(
      subscribers
        .map((subscriber) => subscriber.email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (emails.some(isFakeSubscriberEmail)) {
    return [DESK_LETTER_FALLBACK];
  }

  const realEmails = emails.filter((email) => !isFakeSubscriberEmail(email));
  return realEmails.length > 0 ? realEmails : [DESK_LETTER_FALLBACK];
}

/** 8am preview always goes only to Nick — never the public list. */
export function resolvePreviewLetterRecipients(): string[] {
  return [DESK_LETTER_FALLBACK];
}
