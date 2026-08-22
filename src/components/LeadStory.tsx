import Link from "next/link";
import { formatRelative, formatShortDate } from "@/lib/dates";
import type { ClusteredStory, Story } from "@/lib/types";

type Lead = ClusteredStory | Story;

function isOriginal(lead: Lead): boolean {
  return Boolean(lead.is_original);
}

function sourceNames(lead: Lead): string[] {
  if ("sources" in lead && Array.isArray(lead.sources)) {
    return lead.sources.map((s) => s.name);
  }
  return [];
}

export function LeadStory({ lead }: { lead: Lead }) {
  const original = isOriginal(lead);
  const title = lead.title;
  const dek = lead.dek;
  const byline = lead.byline;
  const slug = lead.slug;
  const href = original && slug ? `/story/${slug}` : lead.url;
  const published = lead.published_at;
  const names = sourceNames(lead);

  return (
    <article className="anim-rise">
      {original ? (
        <p className="kicker">traverse.news reporting</p>
      ) : (
        <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">
          From other desks
        </p>
      )}
      <h1 className="mt-3 max-w-3xl font-serif text-[1.85rem] leading-[1.15] text-ink md:text-[2.35rem]">
        {original ? (
          <Link href={href}>{title}</Link>
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {title}
            <span className="ml-1 text-base text-muted" aria-hidden>
              ↗
            </span>
          </a>
        )}
      </h1>
      {dek ? (
        <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-[#333] md:text-[1.08rem]">
          {dek}
        </p>
      ) : null}
      {original ? (
        <p className="mt-3 text-sm text-muted">
          {byline ? `By ${byline}` : "By Desk"}
          {" · "}
          {formatShortDate(published)}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {names.map((name) => (
            <span key={name} className="source-pill">
              {name}
            </span>
          ))}
          <span className="text-xs text-muted">{formatRelative(published)}</span>
        </div>
      )}
      {original && "image_url" in lead && lead.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lead.image_url} alt="" className="mt-5 w-full object-cover" />
      ) : null}
    </article>
  );
}
