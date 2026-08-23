import {
  emailDateLabel,
  formatCivicDate,
  formatEventWhenParts,
} from "@/lib/dates";
import { formatEmailEditionLabel } from "@/lib/email-editions";
import type { EmailEditionSnapshot } from "@/lib/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function civicLabel(startsAt: string): string {
  const d = formatCivicDate(startsAt);
  const month =
    d.monthAbbr.charAt(0) + d.monthAbbr.slice(1).toLowerCase();
  const weekday = d.day.charAt(0) + d.day.slice(1).toLowerCase();
  return `${month} ${d.label} ${weekday}`;
}

function eventWhenLabel(startsAt: string, timeUnknown?: boolean): string {
  const parts = formatEventWhenParts(startsAt, new Date(), { timeUnknown });
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
  }).format(new Date(startsAt));
  return `${weekday} ${parts.time}`;
}

function sportsWhenLabel(startsAt: string, timeUnknown?: boolean): string {
  const parts = formatEventWhenParts(startsAt, new Date(), { timeUnknown });
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(startsAt));
  return `${weekday} · ${parts.time}`;
}

function letterDateObj(letter: EmailEditionSnapshot): Date {
  const [y, m, d] = letter.date.split("-").map(Number);
  if (!y || !m || !d) return new Date(letter.captured_at);
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
}

/**
 * Email-safe HTML for the morning letter. Pure string build from a snapshot —
 * do not re-render React / the public page per recipient (Worker CPU).
 */
export function renderMorningLetterHtml(
  letter: EmailEditionSnapshot,
  opts: { siteUrl: string; unsubscribeUrl: string },
): { subject: string; html: string; text: string } {
  const site = opts.siteUrl.replace(/\/$/, "");
  const unsub = opts.unsubscribeUrl;
  const dateObj = letterDateObj(letter);
  const subject = `Morning scan · ${formatEmailEditionLabel(letter.date)}`;

  const intro = letter.lead
    ? "Good morning. Start with our reporting, then the rest of the town and what's on tonight."
    : "Good morning. Here's the rest of the town from other desks, then what's on tonight.";

  const leadBlock = letter.lead
    ? `<div style="margin-top:24px;border:1px solid #1a1a1a;background:#f7e8d8;padding:16px">
  <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#1a1a1a">The one to read</p>
  <h2 style="margin:8px 0 0;font-size:22px;line-height:1.25;font-weight:800">
    <a href="${esc(letter.lead.url)}" style="color:#1a1a1a;text-decoration:none">${esc(letter.lead.title)}</a>
  </h2>
  ${
    letter.lead.dek
      ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.45;color:#444">${esc(letter.lead.dek)}</p>`
      : ""
  }
  <p style="margin:12px 0 0;font-size:12px;font-weight:700;color:#0d6b63">traverse.news</p>
</div>`
    : "";

  const aroundItems =
    letter.around.length === 0
      ? `<li style="border-top:1px solid #ddd;padding:16px 0;font-size:14px;color:#666">No wire yet — we do not invent stories.</li>`
      : letter.around
          .map((item) => {
            const sources = esc(item.sources.join(" · "));
            const paywall = item.paywalled
              ? ` <span style="font-size:11px;font-weight:700;color:#8a4b00">Paywall</span>`
              : "";
            return `<li style="border-top:1px solid #ddd;padding:16px 0">
  <h3 style="margin:0;font-size:17px;line-height:1.3;font-weight:600">
    <a href="${esc(item.url)}" style="color:#1a1a1a;text-decoration:none">${esc(item.title)}</a>
  </h3>
  ${
    item.dek
      ? `<p style="margin:6px 0 0;font-size:14px;color:#444">${esc(item.dek)}</p>`
      : ""
  }
  <p style="margin:8px 0 0;font-size:13px;font-weight:700;color:#0d6b63">${sources}${paywall}</p>
</li>`;
          })
          .join("");

  const alertsBlock =
    letter.alerts.length === 0
      ? ""
      : `<div style="margin-top:24px;border:1px solid #1a1a1a;background:#f3f1ec;padding:16px">
  <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">Alerts</p>
  <ul style="margin:8px 0 0;padding:0;list-style:none">
    ${letter.alerts
      .map(
        (a) => `<li style="margin-top:12px">
      <span style="display:inline-block;font-size:11px;font-weight:700;border:1px solid #1a1a1a;padding:2px 6px">${esc(a.source_name)}</span>
      <p style="margin:6px 0 0;font-weight:600">
        <a href="${esc(a.url)}" style="color:#1a1a1a">${esc(a.title)}</a>
      </p>
      ${a.dek ? `<p style="margin:4px 0 0;font-size:13px;color:#444">${esc(a.dek)}</p>` : ""}
    </li>`,
      )
      .join("")}
  </ul>
</div>`;

  const tonightItems =
    letter.tonight.length === 0
      ? `<li style="font-size:14px;color:#666">No night-out listings yet.</li>`
      : letter.tonight
          .map((e) => {
            const when = esc(eventWhenLabel(e.starts_at, e.time_unknown));
            const title = e.url
              ? `<a href="${esc(e.url)}" style="color:#1a1a1a">${esc(e.title)}</a>`
              : esc(e.title);
            return `<li style="margin-top:8px;font-size:14px"><strong>${when}</strong> — ${title}. ${esc(e.place)}</li>`;
          })
          .join("");

  const civicItems =
    letter.civic.length === 0
      ? `<li style="font-size:14px;color:#666">No meetings in the pull yet.</li>`
      : letter.civic
          .map(
            (e) =>
              `<li style="margin-top:8px;font-size:14px"><strong>${esc(civicLabel(e.starts_at))}</strong> — <span style="color:#0d6b63">${esc(e.title)}</span>. ${esc(e.place)}</li>`,
          )
          .join("");

  const sportsBlock =
    letter.sports.length === 0
      ? ""
      : `<div style="margin-top:24px;border:1px solid #1a1a1a;padding:16px">
  <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">Sports this week</p>
  <ul style="margin:8px 0 0;padding:0;list-style:none">
    ${letter.sports
      .map((g) => {
        const when = esc(sportsWhenLabel(g.starts_at, g.time_unknown));
        const title = g.url
          ? `<a href="${esc(g.url)}" style="color:#1a1a1a">${esc(g.title)}</a>`
          : esc(g.title);
        const place = g.place ? `. ${esc(g.place)}` : "";
        return `<li style="margin-top:8px;font-size:14px"><strong>${when}</strong> · <span style="font-weight:700;color:#0d6b63">${esc(g.school)}</span> — ${title}${place}</li>`;
      })
      .join("")}
  </ul>
</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f4ef;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="border:1px solid #1a1a1a;background:#fffaf3;padding:24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #1a1a1a;padding-bottom:12px">
        <tr>
          <td style="font-size:22px;font-weight:800;font-family:Arial,Helvetica,sans-serif">traverse<span style="color:#0d6b63">.</span>news</td>
          <td align="right" style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#666;font-family:Arial,Helvetica,sans-serif">${esc(emailDateLabel(dateObj))}</td>
        </tr>
      </table>

      <p style="margin:20px 0 0;font-size:16px;line-height:1.5;color:#444">${esc(intro)}</p>

      ${leadBlock}

      <p style="margin:32px 0 0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#666;font-family:Arial,Helvetica,sans-serif">The rest of the town</p>
      <ul style="margin:8px 0 0;padding:0;list-style:none">${aroundItems}</ul>

      ${alertsBlock}

      <div style="margin-top:24px;border:1px solid #1a1a1a;background:#f7e8d8;padding:16px">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif">Tonight</p>
        <ul style="margin:8px 0 0;padding:0;list-style:none">${tonightItems}</ul>
      </div>

      <div style="margin-top:24px">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0d6b63;font-family:Arial,Helvetica,sans-serif">Civic this week</p>
        <ul style="margin:8px 0 0;padding:0;list-style:none">${civicItems}</ul>
      </div>

      ${sportsBlock}

      <div style="margin-top:32px;border-top:2px solid #1a1a1a;padding-top:16px;font-size:14px;color:#666">
        <p style="margin:0">Send us a tip: <a href="${esc(site)}/tips" style="color:#0d6b63;font-weight:700">traverse.news/tips</a></p>
        <p style="margin:8px 0 0;font-size:12px">
          Traverse City, Michigan ·
          <a href="${esc(unsub)}" style="color:#0d6b63">Unsubscribe</a>
          · Weekdays and Saturdays
        </p>
        <p style="margin:8px 0 0;font-size:12px">
          <a href="${esc(site)}/email" style="color:#0d6b63;font-weight:700">Read on the web →</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textLines = [
    `traverse.news — ${emailDateLabel(dateObj)}`,
    "",
    intro,
    "",
  ];
  if (letter.lead) {
    textLines.push("THE ONE TO READ", letter.lead.title, letter.lead.url);
    if (letter.lead.dek) textLines.push(letter.lead.dek);
    textLines.push("");
  }
  textLines.push("THE REST OF THE TOWN");
  for (const item of letter.around) {
    textLines.push(`• ${item.title} (${item.sources.join(" · ")})`);
    textLines.push(`  ${item.url}`);
  }
  if (letter.around.length === 0) {
    textLines.push("No wire yet — we do not invent stories.");
  }
  textLines.push(
    "",
    `Unsubscribe: ${unsub}`,
    `Web: ${site}/email`,
  );

  return { subject, html, text: textLines.join("\n") };
}
