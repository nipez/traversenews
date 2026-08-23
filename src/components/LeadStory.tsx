import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import type { ClusteredStory, Story } from "@/lib/types";

type Lead = ClusteredStory | Story;

/** Homepage original lead — published traverse.news originals only. Skip if none. */
export function LeadStory({ lead }: { lead: Lead }) {
  if (!lead.is_original) return null;

  const href = lead.slug ? `/story/${lead.slug}` : lead.url;

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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.image_url}
          alt=""
          className="mt-5 w-full border border-ink object-cover"
        />
      ) : null}
    </article>
  );
}
