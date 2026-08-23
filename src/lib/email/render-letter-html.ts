import {
  buildMorningLetterSubject,
  civicLabel,
  eventWhenLabel,
  letterHeaderDate,
  shortDek,
  sportsWhenLabel,
} from "@/lib/email/letter-format";
import type { EmailEditionSnapshot } from "@/lib/types";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const LINK = "#0563c1";
const INK = "#111111";
const MUTED = "#555555";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function abs(base: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const root = base.replace(/\/$/, "");
  if (!root) return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  if (pathOrUrl.startsWith("/")) return `${root}${pathOrUrl}`;
  return `${root}/${pathOrUrl}`;
}

function sectionHeading(emoji: string, label: string): string {
  return `<tr><td style="padding:28px 0 10px;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};line-height:1.3">${emoji}&nbsp;&nbsp;${esc(label)}</td></tr>`;
}

function storyBlock(opts: {
  title: string;
  url: string;
  dek?: string;
  outlet?: string;
}): string {
  const dek = opts.dek ? shortDek(opts.dek) : "";
  const outlet = opts.outlet
    ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:${MUTED};line-height:1.4">${esc(opts.outlet)}</p>`
    : "";
  const dekHtml = dek
    ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:15px;color:${INK};line-height:1.45">${esc(dek)}</p>`
    : "";
  return `<tr><td style="padding:0 0 18px;font-family:${FONT}">
  <a href="${esc(opts.url)}" style="color:${LINK};font-size:16px;font-weight:700;line-height:1.35;text-decoration:underline">${esc(opts.title)}</a>
  ${dekHtml}
  ${outlet}
</td></tr>`;
}

function lineItem(htmlInner: string): string {
  return `<tr><td style="padding:0 0 10px;font-family:${FONT};font-size:15px;color:${INK};line-height:1.45">${htmlInner}</td></tr>`;
}

export type RenderLetterOpts = {
  /** Absolute site origin for email sends. Empty = relative links (web embed). */
  siteUrl: string;
  unsubscribeUrl: string;
  /** /email or /email/YYYY-MM-DD */
  viewOnlineUrl: string;
  privacyUrl?: string;
  termsUrl?: string;
  tipsUrl?: string;
};

/**
 * Email-safe morning letter HTML (TLDR-scannable).
 * Pure string build from a snapshot — never invents copy.
 * Empty sections are omitted.
 */
export function renderMorningLetterHtml(
  letter: EmailEditionSnapshot,
  opts: RenderLetterOpts,
): { subject: string; html: string; text: string; bodyHtml: string } {
  const site = opts.siteUrl.replace(/\/$/, "");
  const subject = buildMorningLetterSubject(letter);
  const dateLabel = letterHeaderDate(letter);
  const viewOnline = abs(site, opts.viewOnlineUrl);
  const unsub = abs(site, opts.unsubscribeUrl);
  const privacy = abs(site, opts.privacyUrl ?? "/privacy");
  const terms = abs(site, opts.termsUrl ?? "/terms");
  const tips = abs(site, opts.tipsUrl ?? "/tips");

  const rows: string[] = [];

  // Header
  rows.push(`<tr><td style="padding:0 0 4px;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-family:${FONT};font-size:22px;font-weight:800;color:${INK};letter-spacing:-0.02em">traverse<span style="color:${LINK}">.</span>news</td>
      <td align="right" style="font-family:${FONT};font-size:12px;color:${MUTED};white-space:nowrap">
        <a href="${esc(viewOnline)}" style="color:${LINK};text-decoration:underline">View online</a>
      </td>
    </tr>
  </table>
</td></tr>`);

  rows.push(`<tr><td style="padding:4px 0 0;font-family:${FONT};font-size:13px;color:${MUTED};border-bottom:1px solid #e5e5e5;padding-bottom:16px">${esc(dateLabel)}</td></tr>`);

  // ⚡️ The one to read
  if (letter.lead) {
    rows.push(sectionHeading("⚡️", "The one to read"));
    rows.push(
      storyBlock({
        title: letter.lead.title,
        url: abs(site, letter.lead.url),
        dek: letter.lead.dek,
        outlet: "traverse.news",
      }),
    );
  }

  // 🌊 Around the bay
  if (letter.around.length > 0) {
    rows.push(sectionHeading("🌊", "Around the bay"));
    for (const item of letter.around.slice(0, 6)) {
      const outlet = [
        item.sources.join(" · "),
        item.paywalled ? "Paywall" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      rows.push(
        storyBlock({
          title: item.title,
          url: abs(site, item.url),
          dek: item.dek,
          outlet,
        }),
      );
    }
  }

  // 🚨 Alerts
  if (letter.alerts.length > 0) {
    rows.push(sectionHeading("🚨", "Alerts"));
    for (const a of letter.alerts) {
      rows.push(
        storyBlock({
          title: a.title,
          url: abs(site, a.url),
          dek: a.dek,
          outlet: a.source_name,
        }),
      );
    }
  }

  // 🌙 Tonight / What's on
  if (letter.tonight.length > 0) {
    rows.push(sectionHeading("🌙", "Tonight / What's on"));
    for (const e of letter.tonight) {
      const when = esc(eventWhenLabel(e.starts_at, e.time_unknown));
      const title = e.url
        ? `<a href="${esc(abs(site, e.url))}" style="color:${LINK};font-weight:700;text-decoration:underline">${esc(e.title)}</a>`
        : `<strong style="font-weight:700">${esc(e.title)}</strong>`;
      rows.push(
        lineItem(
          `<strong>${when}</strong> · ${title}${e.place ? ` · ${esc(e.place)}` : ""}`,
        ),
      );
    }
  }

  // 🏛️ Civic this week
  if (letter.civic.length > 0) {
    rows.push(sectionHeading("🏛️", "Civic this week"));
    for (const e of letter.civic) {
      rows.push(
        lineItem(
          `<strong>${esc(civicLabel(e.starts_at))}</strong> · ${esc(e.title)}${e.place ? ` · ${esc(e.place)}` : ""}`,
        ),
      );
    }
  }

  // 🏈 Sports this week
  if (letter.sports.length > 0) {
    rows.push(sectionHeading("🏈", "Sports this week"));
    for (const g of letter.sports) {
      const when = esc(sportsWhenLabel(g.starts_at, g.time_unknown));
      const title = g.url
        ? `<a href="${esc(abs(site, g.url))}" style="color:${LINK};font-weight:700;text-decoration:underline">${esc(g.title)}</a>`
        : `<strong style="font-weight:700">${esc(g.title)}</strong>`;
      rows.push(
        lineItem(
          `<strong>${when}</strong> · ${esc(g.school)} · ${title}${g.place ? ` · ${esc(g.place)}` : ""}`,
        ),
      );
    }
  }

  // Footer
  rows.push(`<tr><td style="padding:28px 0 0;border-top:1px solid #e5e5e5;font-family:${FONT};font-size:13px;color:${MUTED};line-height:1.6">
  <p style="margin:0">
    <a href="${esc(unsub)}" style="color:${LINK};text-decoration:underline">Unsubscribe</a>
    &nbsp;·&nbsp;
    <a href="${esc(privacy)}" style="color:${LINK};text-decoration:underline">Privacy</a>
    &nbsp;·&nbsp;
    <a href="${esc(terms)}" style="color:${LINK};text-decoration:underline">Terms</a>
    &nbsp;·&nbsp;
    <a href="${esc(tips)}" style="color:${LINK};text-decoration:underline">Send a tip</a>
  </p>
  <p style="margin:10px 0 0;font-size:12px;color:#777">Traverse City, Michigan · Weekdays and Saturdays · Single opt-in</p>
</td></tr>`);

  const bodyHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;color:${INK}">
${rows.join("\n")}
</table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:${INK};font-family:${FONT}">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px;background:#ffffff">
    ${bodyHtml}
  </div>
</body>
</html>`;

  const text = buildPlainText(letter, {
    subject,
    dateLabel,
    viewOnline,
    unsub,
    privacy,
    terms,
    tips,
  });

  return { subject, html, text, bodyHtml };
}

function buildPlainText(
  letter: EmailEditionSnapshot,
  meta: {
    subject: string;
    dateLabel: string;
    viewOnline: string;
    unsub: string;
    privacy: string;
    terms: string;
    tips: string;
  },
): string {
  const lines: string[] = [
    "traverse.news",
    meta.dateLabel,
    `View online: ${meta.viewOnline}`,
    "",
    meta.subject,
    "",
  ];

  if (letter.lead) {
    lines.push("⚡️ The one to read", letter.lead.title, letter.lead.url);
    if (letter.lead.dek) lines.push(shortDek(letter.lead.dek));
    lines.push("");
  }

  if (letter.around.length > 0) {
    lines.push("🌊 Around the bay");
    for (const item of letter.around.slice(0, 6)) {
      lines.push(`• ${item.title}`);
      if (item.dek) lines.push(`  ${shortDek(item.dek)}`);
      lines.push(`  ${item.sources.join(" · ")}`);
      lines.push(`  ${item.url}`);
    }
    lines.push("");
  }

  if (letter.alerts.length > 0) {
    lines.push("🚨 Alerts");
    for (const a of letter.alerts) {
      lines.push(`• ${a.title} (${a.source_name})`);
      if (a.dek) lines.push(`  ${shortDek(a.dek)}`);
      lines.push(`  ${a.url}`);
    }
    lines.push("");
  }

  if (letter.tonight.length > 0) {
    lines.push("🌙 Tonight / What's on");
    for (const e of letter.tonight) {
      lines.push(
        `• ${eventWhenLabel(e.starts_at, e.time_unknown)} · ${e.title} · ${e.place}`,
      );
    }
    lines.push("");
  }

  if (letter.civic.length > 0) {
    lines.push("🏛️ Civic this week");
    for (const e of letter.civic) {
      lines.push(`• ${civicLabel(e.starts_at)} · ${e.title} · ${e.place}`);
    }
    lines.push("");
  }

  if (letter.sports.length > 0) {
    lines.push("🏈 Sports this week");
    for (const g of letter.sports) {
      lines.push(
        `• ${sportsWhenLabel(g.starts_at, g.time_unknown)} · ${g.school} · ${g.title}`,
      );
    }
    lines.push("");
  }

  lines.push(
    `Unsubscribe: ${meta.unsub}`,
    `Privacy: ${meta.privacy}`,
    `Terms: ${meta.terms}`,
    `Tips: ${meta.tips}`,
  );

  return lines.join("\n");
}
