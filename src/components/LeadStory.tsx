import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import type { ClusteredStory, Story } from "@/lib/types";

type Lead = ClusteredStory | Story;

/** Homepage hero — published traverse.news originals only. */
export function LeadStory({ lead }: { lead: Lead }) {
  if (!lead.is_original) return null;

  const title = lead.title;
  const dek = lead.dek;
  const byline = lead.byline;
  const slug = lead.slug;
  const href = slug ? `/story/${slug}` : lead.url;
  const published = lead.published_at;

  return (
    <article className="anim-rise border-b border-rule pb-8">
      <p className="kicker">traverse.news reporting</p>
      <h1 className="mt-3 max-w-3xl font-serif text-[2rem] leading-[1.12] tracking-tight text-ink md:text-[2.55rem]">
        <Link href={href}>{title}</Link>
      </h1>
      {dek ? (
        <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-[#2e2e2e] md:text-[1.12rem]">
          {dek}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        {byline ? `By ${byline}` : "By Desk"}
        {" · "}
        {formatShortDate(published)}
      </p>
      {"image_url" in lead && lead.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lead.image_url} alt="" className="mt-5 w-full object-cover" />
      ) : null}
    </article>
  );
}
