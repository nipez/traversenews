import { renderMorningLetterHtml } from "@/lib/email/render-letter-html";
import type { EmailEditionSnapshot } from "@/lib/types";

/**
 * Morning letter body — same single HTML letter the send pipeline uses.
 * White / system-sans / blue-link TLDR layout (not the cream public site).
 * Renders exactly one letter; never stacks a second digest.
 */
export function MorningLetter({
  letter,
  mode,
  unsubscribeEmail,
}: {
  letter: EmailEditionSnapshot;
  mode: "preview" | "archive";
  /** Personalized send: one-click Unsubscribe with this address. */
  unsubscribeEmail?: string;
}) {
  const unsubscribeHref = unsubscribeEmail
    ? `/email/unsubscribe?email=${encodeURIComponent(unsubscribeEmail.trim().toLowerCase())}`
    : "/email/unsubscribe";

  const viewOnlineUrl =
    mode === "archive" ? `/email/${letter.date}` : "/email";

  // Relative links on the public site; absolute base only when env is set
  // (send path passes an absolute siteUrl separately).
  const siteUrl =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")
      : "";

  const { bodyHtml, subject } = renderMorningLetterHtml(letter, {
    siteUrl,
    unsubscribeUrl: unsubscribeHref,
    viewOnlineUrl,
  });

  return (
    <div className="morning-letter-frame" data-traverse-letter={letter.date}>
      <p className="morning-letter-subject" aria-label="Subject line preview">
        <span className="morning-letter-subject-label">Subject</span>
        {subject}
      </p>
      {/* Single letter root only — do not nest a second digest here. */}
      <div
        className="morning-letter-body"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      {mode === "archive" ? (
        <p className="morning-letter-meta">Archive copy (not sent)</p>
      ) : (
        <p className="morning-letter-meta">
          Live mix preview · same single letter as send
        </p>
      )}
    </div>
  );
}
