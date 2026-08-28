import Link from "next/link";
import { formatShortDate } from "@/lib/dates";

/** Fields LeadStory actually renders (full Story / ClusteredStory / public snapshot). */
type Lead = {
  title: string;
  dek: string;
  url: string;
  published_at: string;
  is_original: boolean;
  byline: string | null;
  slug: string | null;
  image_url?: string | null;
  image_credit?: string | null;
  image_caption?: string | null;
};

function leadCaption(lead: Lead): string | null {
  const caption = lead.image_caption?.trim() ?? "";
  const credit = lead.image_credit?.trim() ?? "";
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
      <h1 className="lead-hed">
        <Link href={href}>{lead.title}</Link>
      </h1>
      {lead.dek ? <p className="lead-dek">{lead.dek}</p> : null}
      <p className="lead-byline">{formatShortDate(lead.published_at)}</p>
      {lead.image_url ? (
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
