import Link from "next/link";
import { notFound } from "next/navigation";
import { AroundTheBay } from "@/components/AroundTheBay";
import { InteriorLayout } from "@/components/InteriorLayout";
import { LeadStory } from "@/components/LeadStory";
import { PublicShell } from "@/components/PublicShell";
import {
  formatEditionLabel,
  isValidEditionDate,
} from "@/lib/editions";
import { getEditionsSnapshot } from "@/lib/public-snapshots";
import type { ClusteredStory } from "@/lib/types";

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
  const snap = await getEditionsSnapshot();
  const edition = snap.editions.find((e) => e.date === date);
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

  const label = formatEditionLabel(date);

  return (
    <PublicShell active="/">
      <InteriorLayout mainClassName="editions-main">
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

        <div className="min-w-0 space-y-10">
          {lead ? <LeadStory lead={lead} /> : null}
          <hr className="rule" />
          <AroundTheBay items={around} />
        </div>
      </InteriorLayout>
    </PublicShell>
  );
}
