import {
  emailDateLabel,
  formatCivicDate,
  formatEventWhenParts,
} from "@/lib/dates";
import type {
  EmailEditionSnapshot,
  EmailEventCard,
  EmailSportsCard,
} from "@/lib/types";

const DETROIT = "America/Detroit";

/** Letter header date (America/Detroit), e.g. SUN, AUG 23 · TRAVERSE CITY */
export function letterHeaderDate(letter: EmailEditionSnapshot): string {
  return emailDateLabel(letterDateObj(letter));
}

export function letterDateObj(letter: EmailEditionSnapshot): Date {
  const [y, m, d] = letter.date.split("-").map(Number);
  if (!y || !m || !d) return new Date(letter.captured_at);
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
}

export function civicLabel(startsAt: string): string {
  const d = formatCivicDate(startsAt);
  const month =
    d.monthAbbr.charAt(0) + d.monthAbbr.slice(1).toLowerCase();
  const weekday = d.day.charAt(0) + d.day.slice(1).toLowerCase();
  return `${month} ${d.label} ${weekday}`;
}

/** Weekday + clock (or —). Never invent noon. */
export function eventWhenLabel(
  startsAt: string,
  timeUnknown?: boolean,
): string {
  const parts = formatEventWhenParts(startsAt, new Date(), {
    timeUnknown,
  });
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  }).format(new Date(startsAt));
  return `${weekday} ${parts.time}`;
}

export function sportsWhenLabel(
  startsAt: string,
  timeUnknown?: boolean,
): string {
  const parts = formatEventWhenParts(startsAt, new Date(), {
    timeUnknown,
  });
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(startsAt));
  return `${weekday} · ${parts.time}`;
}

/**
 * Keep deks to 1–2 short sentences for scannability.
 * Truncates only; never invents copy.
 */
export function shortDek(dek: string, maxChars = 260): string {
  const clean = dek.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean];
  let out = "";
  for (const raw of sentences.slice(0, 2)) {
    const s = raw.trim();
    if (!s) continue;
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxChars) break;
    out = next;
  }
  if (!out) out = clean;
  if (out.length <= maxChars) return out;
  const cut = out.slice(0, maxChars);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

const WEAK_TAIL =
  /^(a|an|the|and|or|of|for|to|on|in|at|near|with|from|by|vs\.?)$/i;

/**
 * Shorten a real headline for subject bits — words from the title only.
 * Avoids cutting after weak words ("for", "the", "on").
 */
export function shortHeadline(title: string, maxLen = 48): string {
  let t = title.replace(/\s+/g, " ").trim();
  // Prefer the clause before a dash when that clause is still useful.
  const beforeDash = t.split(/\s+[—–-]\s+/)[0]?.trim();
  if (beforeDash && beforeDash.length >= 10 && beforeDash.length < t.length) {
    t = beforeDash;
  }
  const beforeColon = t.split(/\s*:\s*/)[0]?.trim();
  if (
    beforeColon &&
    beforeColon.length >= 10 &&
    beforeColon.length < t.length &&
    beforeColon.length <= maxLen + 10
  ) {
    t = beforeColon;
  }
  if (t.length <= maxLen) return t;

  const words = t.split(" ");
  const kept: string[] = [];
  for (const w of words) {
    const next = kept.length ? `${kept.join(" ")} ${w}` : w;
    if (next.length > maxLen) break;
    kept.push(w);
  }
  while (kept.length > 2 && WEAK_TAIL.test(kept[kept.length - 1] ?? "")) {
    kept.pop();
  }
  // If we still end weak or too short, allow a slightly longer cut.
  if (
    kept.length < 3 ||
    WEAK_TAIL.test(kept[kept.length - 1] ?? "") ||
    kept.join(" ").length < Math.min(24, maxLen * 0.5)
  ) {
    const loose: string[] = [];
    for (const w of words) {
      const next = loose.length ? `${loose.join(" ")} ${w}` : w;
      if (next.length > maxLen + 12) break;
      loose.push(w);
      if (next.length >= maxLen && !WEAK_TAIL.test(w)) break;
    }
    while (loose.length > 2 && WEAK_TAIL.test(loose[loose.length - 1] ?? "")) {
      loose.pop();
    }
    if (loose.join(" ").length > kept.join(" ").length) return loose.join(" ");
  }
  return kept.join(" ") || t.slice(0, maxLen).trim();
}

function alertEmoji(title: string): string {
  if (/\b(detour|closure|closed|construction|roadwork|lane)\b/i.test(title)) {
    return "🚧";
  }
  if (/\b(US-?\d+|MDOT|highway|I-\d+)\b/i.test(title)) return "🚧";
  return "🚨";
}

function tonightEmoji(title: string, place: string): string {
  const blob = `${title} ${place}`;
  if (
    /\b(concert|band|music|tour|philharmonic|symphony|orchestra|destroyers|osborne|live at|interlochen)\b/i.test(
      blob,
    )
  ) {
    return "🎸";
  }
  return "🌙";
}

function eventSubjectBit(e: EmailEventCard): string {
  const place = e.place.replace(/\s+/g, " ").trim();
  const placeOk =
    Boolean(place) && place.length <= 28 && !/\d{3,}/.test(place);
  // With a short venue, keep the name compact so "at Interlochen" fits.
  const head = shortHeadline(e.title, placeOk ? 34 : 44);
  if (placeOk) {
    const withPlace = `${head} at ${place}`;
    if (withPlace.length <= 56) return withPlace;
  }
  return head;
}

function sportsSubjectBit(g: EmailSportsCard): string {
  const head = shortHeadline(g.title, 28);
  const school = g.school.replace(/\s+/g, " ").trim();
  if (school && school.length <= 24) {
    const withSchool = `${school} ${head}`;
    if (withSchool.length <= 52) return withSchool;
  }
  return head;
}

type SubjectBit = { text: string; emoji: string };

/**
 * Subject: 2–3 concrete items from today's snapshot + emoji each,
 * comma-separated. Never invents headlines — only shortens real titles.
 */
export function buildMorningLetterSubject(
  letter: EmailEditionSnapshot,
): string {
  const bits: SubjectBit[] = [];

  if (letter.lead) {
    bits.push({
      text: shortHeadline(letter.lead.title, 46),
      emoji: "⚡️",
    });
  }

  if (letter.alerts[0] && bits.length < 3) {
    const a = letter.alerts[0];
    bits.push({
      text: shortHeadline(a.title, 46),
      emoji: alertEmoji(a.title),
    });
  }

  if (letter.tonight[0] && bits.length < 3) {
    const e = letter.tonight[0];
    bits.push({
      text: eventSubjectBit(e),
      emoji: tonightEmoji(e.title, e.place),
    });
  }

  if (letter.around[0] && bits.length < 2) {
    bits.push({
      text: shortHeadline(letter.around[0].title, 40),
      emoji: "🌊",
    });
  }

  if (letter.sports[0] && bits.length < 3) {
    bits.push({
      text: sportsSubjectBit(letter.sports[0]),
      emoji: "🏈",
    });
  }

  if (letter.civic[0] && bits.length < 2) {
    bits.push({
      text: shortHeadline(letter.civic[0].title, 40),
      emoji: "🏛️",
    });
  }

  if (bits.length === 0) {
    return `Morning scan · ${letterHeaderDate(letter)}`;
  }

  // Prefer 2–3 bits when the mix has them.
  const picked = bits.slice(0, Math.min(3, Math.max(2, bits.length)));
  if (bits.length === 1) return `${bits[0].text} ${bits[0].emoji}`;

  return picked.map((b) => `${b.text} ${b.emoji}`).join(", ");
}
