import Link from "next/link";
import { notFound } from "next/navigation";
import { AroundTheBay } from "@/components/AroundTheBay";
import { CivicList } from "@/components/CivicList";
import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import {
  formatEditionLabel,
  isValidEditionDate,
} from "@/lib/editions";
import { getEdition } from "@/lib/data/store";
import type { ClusteredStory, EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props) {
  const { date } = await params;
  if (!isValidEditionDate(date)) return { title: "Edition" };
  return { title: `${formatEditionLabel(date)} edition` };
}

export default async function EditionPage({ params }: Props) {
  const { date } = await params;
  if (!isValidEditionDate(date)) notFound();
  const edition = await getEdition(date);
  if (!edition) notFound();

  const lead = edition.lead
    ? ({
        id: `edition-lead-${date}`,
        title: edition.lead.title,
        dek: edition.lead.dek,
        url: edition.lead.url,
        published_at: edition.lead.published_at,
        sources: edition.lead.sources.map((name, i) => ({
          id: `s${i}`,
          name,
        })),
        is_original: edition.lead.is_original,
        byline: edition.lead.byline,
        slug: edition.lead.slug,
        image_url: null,
        body: null,
      } satisfies ClusteredStory)
    : null;

  const around: ClusteredStory[] = edition.around.map((card, i) => ({
    id: `edition-around-${date}-${i}`,
    title: card.title,
    dek: card.dek,
    url: card.url,
    published_at: card.published_at,
    sources: card.sources.map((name, j) => ({ id: `s${i}-${j}`, name })),
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
  }));

  const events: EventItem[] = edition.events.map((e, i) => ({
    id: `edition-evt-${date}-${i}`,
    title: e.title,
    starts_at: e.starts_at,
    place: e.place,
    url: e.url,
    source_id: "edition",
  }));

  const civic: EventItem[] = edition.civic.map((e, i) => ({
    id: `edition-civic-${date}-${i}`,
    title: e.title,
    starts_at: e.starts_at,
    place: e.place,
    url: e.url,
    source_id: "edition",
  }));

  const label = formatEditionLabel(date);

  return (
    <PublicShell active="/">
      <div className="mb-8 border-b border-rule pb-6">
        <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-teal uppercase">
          Edition archive
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink md:text-4xl">
          {label}
        </h1>
        <p className="mt-2 max-w-2xl text-[#444]">
          Snapshot of the homepage after the last successful pull that day
          (America/Detroit). Headlines from other desks link out; we do not
          reprint their full stories.
        </p>
        <p className="mt-2 text-sm text-muted">
          Captured{" "}
          {new Date(edition.captured_at).toLocaleString("en-US", {
            timeZone: "America/Detroit",
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          <Link href="/editions" className="text-teal">
            All editions
          </Link>
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          {lead ? (
            <article>
              <p className="kicker">traverse.news reporting</p>
              <h2 className="mt-3 max-w-3xl font-serif text-[1.85rem] leading-[1.15] text-ink md:text-[2.35rem]">
                {lead.slug ? (
                  <Link href={`/story/${lead.slug}`}>{lead.title}</Link>
                ) : (
                  lead.title
                )}
              </h2>
              <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-[#333]">
                {lead.dek}
              </p>
              <p className="mt-3 text-sm text-muted">
                {lead.byline ? `By ${lead.byline}` : "By Desk"}
              </p>
            </article>
          ) : null}
          <hr className="rule" />
          <AroundTheBay items={around} />
        </div>

        <aside className="space-y-8">
          <TonightBlock events={events} />
          <CivicList events={civic} linkLabel="Archive" />
        </aside>
      </div>
    </PublicShell>
  );
}
