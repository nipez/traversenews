import { emailDateLabel, formatEventWhenParts } from "@/lib/dates";
import {
  emailDetroitDateKey,
  formatEmailEditionLabel,
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

const SITE_ORIGIN = "https://traverse.news";
const DETROIT_TIME_ZONE = "America/Detroit";

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
  return /wine grapes|wildfire smoke|hamlet of hundreds|wings and wheels|sports overtime|scores and highlights|silent disco|artist talk|artist reception|concert|festival|fly-in|open mic|storytime|sing\s*&\s*stomp|chorus|celebrat|anniversary|opera house|exhibit|gallery opening|old neighborhood|glen eyrie|going strong for a century/i.test(
    title,
  );
}

/** Court, crash, vote, charges — prefer these over features for the subject. */
function isHardNewsTitle(title: string): boolean {
  return /court|crash|lawsuit|\bsuit\b|vote|killed|fatal|arrest|charges|sentenc|zoning|ordinance|budget|spill(?!.*wine)/i.test(
    title,
  );
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
  if (trimmed.startsWith("/")) return `${SITE_ORIGIN}${trimmed}`;

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

    if (
      host === "traverse.news" ||
      host === "www.traverse.news" ||
      host === "traverse-news.nickperez.workers.dev"
    ) {
      return `${SITE_ORIGIN}${url.pathname}${url.search}`;
    }

    return trimmed;
  } catch {
    return null;
  }
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

function usableSubjectPhrase(phrase: string): boolean {
  if (!phrase || isInsiderShorthand(phrase) || isGenericPlace(phrase)) return false;
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

const TRAIL_STOP = /\s+(on|at|for|of|in|with|and|the|a|an|as|vs|versus)$/i;

function stripTrailingStops(s: string): string {
  let out = s.trim();
  for (let i = 0; i < 6; i += 1) {
    const next = out.replace(TRAIL_STOP, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

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
  if (t.length <= budget) return stripTrailingStops(t);
  for (const sep of [": ", " — ", " – ", " - ", "; ", ", "]) {
    const i = t.indexOf(sep);
    if (i >= 12 && i <= budget) return stripTrailingStops(t.slice(0, i));
  }
  const words = t.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > budget) {
      const rest = t.slice(out.length).trim();
      const closer = rest.match(/^(for a year|for a month|for a week|for a day)\b/i);
      if (closer && `${out} ${closer[1]}`.length <= budget + 10) {
        out = `${out} ${closer[1]}`;
      }
      break;
    }
    out = next;
  }
  return stripTrailingStops(out) || t.slice(0, budget).trim();
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
): string[] {
  const ranked = [...around].sort((a, b) => {
    const ta = a.title || "";
    const tb = b.title || "";
    const ra = isHardNewsTitle(ta) ? 0 : 1;
    const rb = isHardNewsTitle(tb) ? 0 : 1;
    return ra - rb;
  });
  const out: string[] = [];
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
    if (out.includes(text)) continue;
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function pickAlertNews(
  alerts: EmailEditionSnapshot["alerts"],
  limit: number,
  already: string[],
): string[] {
  const ranked = [...alerts].sort((a, b) => {
    const ta = a.title || "";
    const tb = b.title || "";
    const ra = isHardNewsTitle(ta) || /rabies|health/i.test(ta) ? 0 : 1;
    const rb = isHardNewsTitle(tb) || /rabies|health/i.test(tb) ? 0 : 1;
    return ra - rb;
  });
  const out: string[] = [];
  for (const alert of ranked) {
    const title = (alert.title || "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    if (/lifts? |lifted|back open|reopened/i.test(title)) continue;
    if (isLifestyleOrEventTitle(title) || isRegularSportsRecap(title)) continue;
    const text = phraseFromTitle(title, 36);
    if (!usableSubjectPhrase(text)) continue;
    if (already.includes(text) || out.includes(text)) continue;
    out.push(text);
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
    const text = phraseFromTitle(snapshot.lead.title, 48);
    if (usableSubjectPhrase(text)) parts.push({ text, kind: "lead" });
  }

  // Prefer three news phrases. No usable lead → take three from around.
  const aroundNeed = Math.max(0, 3 - parts.length);
  for (const text of pickAroundNews(snapshot.around, aroundNeed)) {
    parts.push({ text, kind: "around" });
  }

  // Fill remaining slots from news alerts (e.g. rabies) when around is thin.
  const alertNeed = Math.max(0, 3 - parts.length);
  if (alertNeed > 0) {
    for (const text of pickAlertNews(
      snapshot.alerts,
      alertNeed,
      parts.map((p) => p.text),
    )) {
      parts.push({ text, kind: "alert" });
    }
  }

  let chosen = parts.slice(0, 3);
  if (chosen.length === 0) {
    return `🗞️ traverse.news · ${emailDetroitDateKey()}`;
  }

  const render = (items: SubjectItem[]): string => {
    const bits = items.map((i) =>
      i.kind === "tonight" ? `🌙 ${i.text}` : i.text,
    );
    return `🗞️ ${bits.join(" · ")}`;
  };

  chosen = chosen.map((p) => {
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
    return { ...p, text: usableSubjectPhrase(text) ? text : p.text };
  });
  const phraseLen = (s: string) => s.replace(/^🗞️\s*/, "").length;
  let subject = render(chosen);

  // Soft cap ~80 (emoji not counted). Shorten first; drop to 2 only if still >84.
  if (phraseLen(subject) > 80) {
    chosen = chosen
      .map((p) => ({
        ...p,
        text: phraseFromTitle(p.text, 28),
      }))
      .filter((p) => usableSubjectPhrase(p.text));
    if (chosen.length === 0) {
      return `🗞️ traverse.news · ${emailDetroitDateKey()}`;
    }
    subject = render(chosen);
  }
  if (phraseLen(subject) > 84 && chosen.length === 3) {
    chosen = chosen.slice(0, 2);
    subject = render(chosen);
  }
  if (phraseLen(subject) > 84) {
    subject = `${subject.slice(0, 81).replace(/\s+\S*$/, "").replace(/[·,\s]+$/, "")}…`;
  }
  return subject;
}

function renderStory(
  story: EmailStoryCard,
  sourceOverride?: string,
): RenderedItem {
  const url = canonicalPublicUrl(story.url);
  const title = escapeHtml(story.title);
  const dek = story.dek?.trim() ? escapeHtml(story.dek.trim()) : "";
  const source =
    sourceOverride || (story.sources?.length ? story.sources.join(" · ") : "");

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
  const base = `${SITE_ORIGIN}/email/unsubscribe`;
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized || !normalized.includes("@")) return base;
  return `${base}?email=${encodeURIComponent(normalized)}`;
}

/** Default opening line when Desk has not saved a custom greeting. */
export function defaultMorningLetterGreeting(hasLead: boolean): string {
  return hasLead
    ? "Good morning. Here's the bay, then what's on tonight."
    : "Good morning. Here's the rest of the town from other desks, then what's on tonight.";
}

/**
 * Greeting shown on /email, archives, and Resend. Uses Nick's Desk edit when
 * present; otherwise the lead/no-lead default. Never invents new copy.
 */
export function resolveMorningLetterGreeting(
  letter: Pick<EmailEditionSnapshot, "lead" | "greeting">,
): string {
  const saved = letter.greeting?.replace(/\s+/g, " ").trim();
  if (saved) return saved;
  return defaultMorningLetterGreeting(Boolean(letter.lead));
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
  const greeting = resolveMorningLetterGreeting(letter);
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
<p style="margin:0;text-align:center;font-family:${LETTER_FONT};font-size:24px;font-weight:800;letter-spacing:-0.02em;"><a href="${SITE_ORIGIN}" style="color:#111111;text-decoration:none;">traverse.news</a></p>
<p style="margin:10px 0 0;text-align:center;font-family:${LETTER_FONT};font-size:15px;font-weight:600;color:#111111;">${escapeHtml(editionLabel)}</p>
<p style="margin:4px 0 8px;text-align:center;font-family:${LETTER_FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888888;">${escapeHtml(dateLabel)}</p>
<p style="margin:18px 0 8px;font-family:${LETTER_FONT};font-size:16px;line-height:1.5;color:#333333;">${escapeHtml(greeting)}</p>`);
  text.push("traverse.news");
  text.push(editionLabel);
  text.push("");
  text.push(greeting);
  text.push("");

  if (letter.lead) {
    html.push(sectionHeading("📰", "The one to read"));
    text.push(textSectionHeading("📰", "The one to read"));
    const rendered = renderStory(
      letter.lead,
      letter.lead.desk_original ? "traverse.news" : undefined,
    );
    html.push(rendered.html);
    text.push(rendered.text, "");
  }

  if (letter.around.length > 0) {
    html.push(sectionHeading("🌊", "Around the bay", SITE_ORIGIN));
    text.push(textSectionHeading("🌊", "Around the bay"));
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
    html.push(sectionHeading("🌙", "What's on", `${SITE_ORIGIN}/events`));
    text.push(textSectionHeading("🌙", "What's on"));
    for (const event of letter.tonight) {
      const rendered = renderEvent(event);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.civic.length > 0) {
    html.push(sectionHeading("🏛", "Civic", `${SITE_ORIGIN}/civic`));
    text.push(textSectionHeading("🏛", "Civic"));
    for (const event of letter.civic) {
      const rendered = renderEvent(event);
      html.push(rendered.html);
      text.push(rendered.text, "");
    }
  }

  if (letter.sports.length > 0) {
    html.push(sectionHeading("🏈", "Sports", `${SITE_ORIGIN}/sports`));
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
    html.push(sectionHeading("🎒", "Schools", `${SITE_ORIGIN}/schools`));
    text.push(textSectionHeading("🎒", "Schools"));
    const rendered = renderEvent(
      {
        title: school.title,
        starts_at: school.starts_at,
        place: school.place || school.district,
        url: school.url || `${SITE_ORIGIN}/schools`,
        time_unknown: school.time_unknown ?? true,
      },
      school.district,
    );
    html.push(rendered.html);
    text.push(rendered.text, "");
  }

  html.push(`<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eeeeee;font-family:${LETTER_FONT};font-size:12px;line-height:1.5;color:#888888;text-align:center;">
traverse.news · Traverse City, Michigan<br>
<a href="${SITE_ORIGIN}/tips" style="color:#555555;">Send a tip</a> · <a href="${SITE_ORIGIN}/email/${escapeHtml(letter.date)}" style="color:#555555;">Archive</a> · <a href="${escapeHtml(unsubscribeHref)}" style="color:#555555;">Unsubscribe</a>
</p>
</div>
</body>
</html>`);
  text.push("traverse.news · Traverse City, Michigan");
  text.push(`Send a tip: ${SITE_ORIGIN}/tips`);
  text.push(`Archive: ${SITE_ORIGIN}/email/${letter.date}`);
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
