import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { CivicList } from "@/components/CivicList";
import { formatShortDate } from "@/lib/dates";
import { getAppData, getOriginalBySlug } from "@/lib/data/store";
import { civicEvents } from "@/lib/queries";
import { clusterStories } from "@/lib/pull/cluster";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await getOriginalBySlug(slug);
  if (!story) return { title: "Story" };
  return { title: story.title, description: story.dek };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await getOriginalBySlug(slug);
  if (!story) notFound();

  const data = await getAppData();
  const civic = civicEvents(data.events, data.sources).slice(0, 4);
  const also = clusterStories(data.stories, data.sources)
    .filter((c) => !c.is_original)
    .slice(0, 5);

  const paragraphs = (story.body ?? "").split(/\n\n+/).filter(Boolean);
  const quote = paragraphs.find((p) => p.includes("It has never been that"));

  return (
    <PublicShell active="/">
      <div className="grid gap-10 lg:grid-cols-[88px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block">
          <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Share
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#444]">
            <li>
              <a href={`/story/${story.slug}`}>Copy link</a>
            </li>
            <li>
              <a
                href={`mailto:?subject=${encodeURIComponent(story.title)}&body=${encodeURIComponent(`https://traverse.news/story/${story.slug}`)}`}
              >
                Email
              </a>
            </li>
            <li>
              <Link href={`/story/${story.slug}`}>Print</Link>
            </li>
          </ul>
        </aside>

        <article className="min-w-0">
          <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-teal uppercase">
            ● Roads & safety · traverse.news reporting
          </p>
          <h1 className="mt-3 font-serif text-[2rem] leading-[1.12] text-ink md:text-[2.6rem]">
            {story.title.replace(/\.\s*Here's what the plan actually says\.?$/, "")}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-[#333]">
            {story.dek}
          </p>
          <p className="mt-4 text-sm text-muted">
            By <strong className="text-ink">{story.byline ?? "Desk"}</strong>
            {" · "}
            {formatShortDate(story.published_at)}, 6:40 a.m. · 7 min read
          </p>

          {story.image_url ? (
            <figure className="mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.image_url} alt="" className="w-full" />
            </figure>
          ) : null}

          <div className="prose-article mt-8 max-w-2xl">
            {paragraphs.map((p) =>
              quote && p === quote ? (
                <blockquote key={p.slice(0, 24)} className="pull-quote">
                  {p.replace(/^"|"$/g, "")}
                </blockquote>
              ) : (
                <p key={p.slice(0, 24)}>{p}</p>
              ),
            )}
          </div>

          <div className="mt-10 max-w-2xl border border-rule bg-paper-2 p-4">
            <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">
              Corrections & tips
            </p>
            <p className="mt-2 text-sm text-[#333]">
              Know this corridor? Nina is at{" "}
              <a className="text-teal" href="mailto:nina@traverse.news">
                nina@traverse.news
              </a>
              .
            </p>
          </div>
        </article>

        <aside className="space-y-6">
          <div className="border border-rule bg-white/60 p-4">
            <CivicList events={civic} />
          </div>
          <div className="border border-rule bg-paper-2 p-4">
            <h2 className="font-serif text-xl">The morning scan</h2>
            <p className="mt-2 text-sm text-[#444]">The whole town in one email.</p>
            <Link href="/email" className="btn-ghost mt-3 inline-flex bg-[#2a2a2a] text-white">
              See it
            </Link>
          </div>
        </aside>
      </div>

      <section className="mt-14 border-t border-rule pt-8">
        <h2 className="font-serif text-2xl">Also being covered</h2>
        <ul className="mt-4">
          {also.map((item) => (
            <li key={item.id} className="border-t border-rule py-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink hover:text-teal"
              >
                {item.title}{" "}
                <span className="text-muted" aria-hidden>
                  ↗
                </span>
              </a>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.sources.map((s) => (
                  <span key={s.id} className="source-pill">
                    {s.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
