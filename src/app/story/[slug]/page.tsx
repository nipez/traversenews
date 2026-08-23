import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { CivicList } from "@/components/CivicList";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { formatStoryDateline } from "@/lib/dates";
import { selectAroundTheBay } from "@/lib/around";
import { getAppData, getOriginalBySlug } from "@/lib/data/store";
import { civicEvents } from "@/lib/queries";
import { clusterStories } from "@/lib/pull/cluster";
import { sourceLinksFromUrls } from "@/lib/source-links";
import {
  isQuotedParagraph,
  readTimeMinutes,
  storySectionLabel,
  stripOuterQuotes,
} from "@/lib/story-display";

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
  const also = selectAroundTheBay(
    clusterStories(data.stories, data.sources).filter((c) => !c.is_original),
    { limit: 5, maxPerSource: 2 },
  );

  const paragraphs = (story.body ?? "").split(/\n\n+/).filter(Boolean);
  const section = storySectionLabel(story, data.sources, data.beats);
  const readMins = readTimeMinutes(story.body);
  const dateline = formatStoryDateline(story.published_at);

  const draft = data.drafts.find(
    (d) =>
      d.published_story_id === story.id ||
      (d.slug != null && d.slug === story.slug),
  );
  const sourceLinks = sourceLinksFromUrls(
    story.source_urls?.length ? story.source_urls : draft?.source_urls,
  );

  const captionParts = [story.image_caption, story.image_credit]
    .map((p) => p?.trim())
    .filter(Boolean);
  const captionLine = captionParts.join(" · ");

  return (
    <PublicShell active="/" header="compact">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <div className="lead-kicker-row">
            <span className="lead-sq" aria-hidden />
            <p className="lead-kicker">
              {section ? `${section} · ` : null}
              traverse.news reporting
            </p>
          </div>
          <h1 className="mt-3 font-display text-[2rem] leading-[1.05] font-black tracking-tight text-ink md:text-[2.75rem]">
            {story.title}
          </h1>
          {story.dek ? (
            <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted-2">
              {story.dek}
            </p>
          ) : null}
          <p className="lead-byline mt-4">
            By <strong className="text-ink">{story.byline ?? "Desk"}</strong>
            {" · "}
            {dateline}
            {readMins ? ` · ${readMins} min read` : null}
          </p>

          {story.image_url ? (
            <figure className="mt-6 max-w-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.image_url}
                alt=""
                className="w-full border border-ink"
              />
              {captionLine ? (
                <figcaption className="mt-2 text-sm text-muted">
                  {captionLine}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="prose-article mt-8 max-w-2xl">
            {paragraphs.map((p) =>
              isQuotedParagraph(p) ? (
                <blockquote key={p.slice(0, 40)} className="pull-quote">
                  {stripOuterQuotes(p)}
                </blockquote>
              ) : (
                <p key={p.slice(0, 40)}>{p}</p>
              ),
            )}
          </div>

          {sourceLinks.length > 0 ? (
            <section className="mt-10 max-w-2xl border-t border-rule pt-6">
              <h2 className="font-serif text-xl text-ink">From the local record</h2>
              <ul className="mt-3 space-y-2">
                {sourceLinks.map((link) => (
                  <li key={link.url} className="text-sm">
                    <span className="font-semibold text-ink">{link.name}</span>
                    {" · "}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal break-all hover:underline"
                    >
                      {link.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-10 max-w-2xl border border-ink p-4">
            <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-muted uppercase">
              Corrections & tips
            </p>
            <p className="mt-2 font-serif text-sm text-muted-2">
              Spot an error?{" "}
              <a className="font-bold text-teal" href="mailto:nick@traverse.news">
                nick@traverse.news
              </a>
            </p>
          </div>
        </article>

        <aside className="space-y-5">
          <CivicList events={civic} showStamp linkLabel="Calendar" limit={4} />
          <MorningScanSignup variant="teal" />
        </aside>
      </div>

      <section className="mt-14 border-t-2 border-ink pt-8">
        <h2 className="bay-hed">Also being covered</h2>
        <ul className="mt-4">
          {also.map((item) => (
            <li key={item.id} className="border-t border-rule py-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-lg font-semibold text-ink hover:text-teal"
              >
                {item.title}{" "}
                <span className="text-muted" aria-hidden>
                  ↗
                </span>
              </a>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.sources.map((s) => (
                  <span key={s.id} className="source-box">
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
