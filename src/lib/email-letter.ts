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
const DEFAULT_TEST_RECIPIENT = "nickperez@gmail.com";

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
function letterUrl(value: string | null | undefined): string | null {
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

function isWeakSubjectTitle(value: string): boolean {
  const title = value.trim();
  return Boolean(
    !title ||
      (!/\s/.test(title) && title.length < 12) ||
      /^[A-Z][a-z]{1,14}$/.test(title),
  );
}

function shortenSubjectTitle(value: string, maxLength = 40): string {
  let title = value.replace(/\s+/g, " ").trim();
  title = title.replace(/\s+near\s+.+$/i, "").trim();
  if (title.length <= maxLength) return title;

  for (const separator of [": ", " - ", " - ", " - ", "; ", ", "]) {
    const index = title.indexOf(separator);
    if (index >= 12 && index <= maxLength) {
      return title.slice(0, index).trim();
    }
  }

  let shortened = "";
  for (const word of title.split(" ")) {
    const candidate = shortened ? `${shortened} ${word}` : word;
    if (candidate.length > maxLength) break;
    shortened = candidate;
  }

  shortened = shortened
    .replace(/\s+(on|at|for|of|in|with|and|the|a|an)$/i, "")
    .trim();
  return shortened || title.slice(0, maxLength).trim();
}

function buildSubject(letter: EmailEditionSnapshot): string {
  const candidates: SubjectItem[] = [];

  if (letter.lead?.title) {
    const title = shortenSubjectTitle(letter.lead.title, 44);
    if (title && !isWeakSubjectTitle(title)) {
      candidates.push({ text: title, kind: "lead" });
    }
  }

  if (letter.tonight[0]?.title) {
    const title = letter.tonight[0].title.replace(/\s+/g, " ").trim();
    if (title && !isWeakSubjectTitle(title)) {
      candidates.push({ text: title, kind: "tonight" });
    }
  }

  if (letter.around[0]?.title) {
    const title = shortenSubjectTitle(letter.around[0].title, 36);
    if (title && !isWeakSubjectTitle(title)) {
      candidates.push({ text: title, kind: "around" });
    }
  }

  if (candidates.length < 2 && letter.alerts[0]?.title) {
    const title = shortenSubjectTitle(letter.alerts[0].title, 36);
    if (title && !isWeakSubjectTitle(title)) {
      candidates.push({ text: title, kind: "alert" });
    }
  }

  let selected = candidates.slice(0, 3);
  if (selected.length === 0) {
    return `🗞️ traverse.news · ${emailDetroitDateKey()}`;
  }

  const format = (items: SubjectItem[]): string =>
    `🗞️ ${items
      .map((item) =>
        item.kind === "tonight" ? `🌙 ${item.text}` : item.text,
      )
      .join(" · ")}`;

  let subject = format(selected);
  if (subject.length > 80 && selected.length === 3) {
    selected = selected.slice(0, 2);
    subject = format(selected);
  }
  if (subject.length > 80) {
    selected = selected.map((item) => ({
      ...item,
      text: shortenSubjectTitle(item.text, 28),
    }));
    subject = format(selected);
  }
  if (subject.length > 84) {
    subject = `${subject
      .slice(0, 81)
      .replace(/\s+\S*$/, "")
      .replace(/[·,\s]+$/, "")}…`;
  }

  return subject;
}

function renderStory(
  story: EmailStoryCard,
  sourceOverride?: string,
): RenderedItem {
  const url = letterUrl(story.url);
  const title = escapeHtml(story.title);
  const dek = story.dek?.trim() ? escapeHtml(story.dek.trim()) : "";
  const source =
    sourceOverride || (story.sources?.length ? story.sources.join(" · ") : "");

  return {
    html: `<p style="margin:0 0 4px;font-size:16px;line-height:1.35;">${
      url
        ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
        : `<strong>${title}</strong>`
    }</p>
${dek ? `<p style="margin:0 0 4px;font-size:14px;line-height:1.45;color:#333333;">${dek}</p>` : ""}
${source ? `<p style="margin:0 0 16px;font-size:12px;color:#666666;">${escapeHtml(source)}${story.paywalled ? " · Paywall" : ""}</p>` : '<p style="margin:0 0 16px;"></p>'}`,
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
  const url = letterUrl(alert.url);
  const title = escapeHtml(alert.title);
  const dek = alert.dek?.trim() ? escapeHtml(alert.dek.trim()) : "";

  return {
    html: `<p style="margin:0 0 4px;font-size:16px;line-height:1.35;">${
      url
        ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
        : `<strong>${title}</strong>`
    }</p>
${dek ? `<p style="margin:0 0 4px;font-size:14px;line-height:1.45;color:#333333;">${dek}</p>` : ""}
<p style="margin:0 0 16px;font-size:12px;color:#666666;">${escapeHtml(alert.source_name)}</p>`,
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
  const url = letterUrl(event.url);
  const title = escapeHtml(event.title);
  const titleHtml = url
    ? `<a href="${escapeHtml(url)}" style="color:#111111;font-weight:700;text-decoration:underline;">${title}</a>`
    : `<strong>${title}</strong>`;
  const place = event.place?.trim() ? escapeHtml(event.place.trim()) : "";
  const details = [context ? escapeHtml(context) : "", place]
    .filter(Boolean)
    .join(" · ");

  return {
    html: `<p style="margin:0 0 2px;font-size:13px;color:#555555;">${escapeHtml(when)}</p>
<p style="margin:0 0 2px;font-size:16px;line-height:1.35;">${titleHtml}</p>
${details ? `<p style="margin:0 0 16px;font-size:13px;color:#555555;">${details}</p>` : '<p style="margin:0 0 16px;"></p>'}`,
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
  return `<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.04em;text-transform:uppercase;font-weight:800;">${
    url
      ? `<a href="${escapeHtml(url)}" style="color:#111111;text-decoration:none;">${content}</a>`
      : content
  }</h2>`;
}

function textSectionHeading(emoji: string, label: string): string {
  return `${emoji} ${label.toUpperCase()}`;
}

export function buildMorningLetter(
  letter: EmailEditionSnapshot,
  options: { school?: LetterSchoolDate | null } = {},
): { subject: string; html: string; text: string } {
  const subject = buildSubject(letter);
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

  html.push(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px 40px;">
<p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em;"><a href="${SITE_ORIGIN}" style="color:#111111;text-decoration:none;">traverse.news</a></p>
<p style="margin:6px 0 0;font-size:13px;color:#555555;">${escapeHtml(editionLabel)}</p>
<p style="margin:2px 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888888;">${escapeHtml(dateLabel)}</p>`);
  text.push("traverse.news");
  text.push(editionLabel);
  text.push("");

  if (letter.lead) {
    html.push(sectionHeading("📰", "The one to read"));
    text.push(textSectionHeading("📰", "The one to read"));
    const rendered = renderStory(letter.lead, "traverse.news");
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
    html.push(sectionHeading("🌙", "What's on", `${SITE_ORIGIN}/whats-on`));
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

  html.push(`<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#888888;">
traverse.news · Traverse City, Michigan<br>
<a href="${SITE_ORIGIN}/tips" style="color:#555555;">Send a tip</a> · <a href="${SITE_ORIGIN}/email/${escapeHtml(letter.date)}" style="color:#555555;">Archive</a>
</p>
</div>
</body>
</html>`);
  text.push("traverse.news · Traverse City, Michigan");
  text.push(`Send a tip: ${SITE_ORIGIN}/tips`);
  text.push(`Archive: ${SITE_ORIGIN}/email/${letter.date}`);

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
    return [DEFAULT_TEST_RECIPIENT];
  }

  const realEmails = emails.filter((email) => !isFakeSubscriberEmail(email));
  return realEmails.length > 0 ? realEmails : [DEFAULT_TEST_RECIPIENT];
}
