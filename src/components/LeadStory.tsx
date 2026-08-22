import Link from "next/link";
import { formatRelative, formatShortDate } from "@/lib/dates";
import type { ClusteredStory, Story } from "@/lib/types";

type Lead = ClusteredStory | Story;

function isCluster(lead: Lead): lead is ClusteredStory {
  return "sources" in lead;
}

export function LeadStory({ lead }: { lead: Lead }) {
  const title = lead.title;
  const dek = lead.dek;
  const byline = lead.byline;
  const slug = lead.slug;
  const href = slug ? `/story/${slug}` : lead.url;
  const published = lead.published_at;

  return (
    <article className="anim-rise">
      <p className="kicker">traverse.news reporting</p>
      <h1 className="mt-3 max-w-3xl font-serif text-[1.85rem] leading-[1.15] text-ink md:text-[2.35rem]">
        <Link href={href}>{title}</Link>
      </h1>
      <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-[#333] md:text-[1.08rem]">
        {dek}
      </p>
      <p className="mt-3 text-sm text-muted">
        {byline ? `By ${byline}` : "By Desk"}
        {" · "}
        {formatShortDate(published)}
        {" · 7 min read"}
      </p>
      {/* Photos only when an original has a real matching image_url */}
      {"image_url" in lead && lead.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.image_url}
          alt=""
          className="mt-5 w-full object-cover"
        />
      ) : null}
      {!isCluster(lead) || lead.is_original ? null : (
        <p className="mt-2 text-xs text-muted">{formatRelative(published)}</p>
      )}
    </article>
  );
}
