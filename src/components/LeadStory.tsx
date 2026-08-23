import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import type { ClusteredStory, Story } from "@/lib/types";

type Lead = ClusteredStory | Story;

function leadCaption(lead: Lead): string | null {
  const caption =
    "image_caption" in lead && typeof lead.image_caption === "string"
      ? lead.image_caption.trim()
      : "";
  const credit =
    "image_credit" in lead && typeof lead.image_credit === "string"
      ? lead.image_credit.trim()
      : "";
  const line = [caption, credit].filter(Boolean).join(" · ");
  return line || null;
}

/** Homepage original lead — published traverse.news originals only. Skip if none. */
export function LeadStory({ lead }: { lead: Lead }) {
  if (!lead.is_original) return null;

  const href = lead.slug ? `/story/${lead.slug}` : lead.url;
  const caption = leadCaption(lead);

  return (
    <article className="lead-original anim-rise">
      <div className="lead-kicker-row">
        <span className="lead-sq" aria-hidden />
        <p className="lead-kicker">traverse.news reporting</p>
      </div>
      <h1 className="lead-hed">
        <Link href={href}>{lead.title}</Link>
      </h1>
      {lead.dek ? <p className="lead-dek">{lead.dek}</p> : null}
      <p className="lead-byline">
        {lead.byline ? `By ${lead.byline}` : "By Desk"}
        {" · "}
        {formatShortDate(lead.published_at)}
      </p>
      {"image_url" in lead && lead.image_url ? (
        <figure className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.image_url}
            alt=""
            className="w-full border border-ink object-cover"
          />
          {caption ? (
            <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>
          ) : null}
        </figure>
      ) : null}
    </article>
  );
}
