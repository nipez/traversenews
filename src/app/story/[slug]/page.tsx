import { notFound } from "next/navigation";
import { InteriorLayout } from "@/components/InteriorLayout";
import { PublicShell } from "@/components/PublicShell";
import { TipsForm } from "@/components/TipsForm";
import { formatStoryDateline } from "@/lib/dates";
import {
  getHomeSnapshot,
  getOriginalsSnapshot,
  homeRailFromSnapshot,
  type PublicOriginalCard,
} from "@/lib/public-snapshots";
import { sourceLinksFromUrls } from "@/lib/source-links";
import { PUBLIC_ORIGINAL_BYLINE } from "@/lib/originals";
import {
  isQuotedParagraph,
  readTimeMinutes,
  stripOuterQuotes,
} from "@/lib/story-display";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadOriginal(slug: string): Promise<PublicOriginalCard | null> {
  const snap = await getOriginalsSnapshot();
  return snap.bySlug[slug] ?? null;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await loadOriginal(slug);
  if (!story) return { title: "Story" };
  return {
    title: story.title,
    description: story.dek,
    authors: [{ name: PUBLIC_ORIGINAL_BYLINE }],
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await loadOriginal(slug);
  if (!story) notFound();

  // “Also covered” from home snapshot (deduped with InteriorRail’s get).
  const home = await getHomeSnapshot();
  const { also } = homeRailFromSnapshot(home);

  const paragraphs = (story.body ?? "").split(/\n\n+/).filter(Boolean);
  const section = story.section;
  const readMins = readTimeMinutes(story.body);
  const dateline = formatStoryDateline(story.published_at);
  const sourceLinks = sourceLinksFromUrls(story.source_urls);

  const captionParts = [story.image_caption, story.image_credit]
    .map((p) => p?.trim())
    .filter(Boolean);
  const captionLine = captionParts.join(" · ");

  return (
    <PublicShell active="/" header="compact">
      <div className="story-page">
        <header className="story-hero">
          <div className="lead-kicker-row">
            <span className="lead-sq" aria-hidden />
            <p className="lead-kicker">
              {section ? `${section} · ` : null}
              traverse.news reporting
            </p>
          </div>
          <h1 className="story-hed">{story.title}</h1>
          {story.dek ? <p className="story-dek">{story.dek}</p> : null}
          <p className="lead-byline story-byline">
            By <strong>{PUBLIC_ORIGINAL_BYLINE}</strong>
            {" · "}
            {dateline}
            {readMins ? ` · ${readMins} min read` : null}
          </p>
        </header>

        <InteriorLayout mainClassName="story-main" layoutClassName="story-interior">
          <article>
            {story.image_url ? (
              <figure className="story-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={story.image_url}
                  alt=""
                  className="story-figure-img"
                />
                {captionLine ? (
                  <figcaption className="story-figure-cap">
                    {captionLine}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}

            <div className="prose-article story-prose">
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
              <section className="story-record">
                <h2 className="story-record-hed">From the local record</h2>
                <ul className="story-record-list">
                  {sourceLinks.map((link) => (
                    <li key={link.url}>
                      <span className="story-record-name">{link.name}</span>
                      {" · "}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="story-record-url"
                      >
                        {link.url
                          .replace(/^https?:\/\//, "")
                          .replace(/\/$/, "")}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="story-tips">
              <TipsForm variant="rail" />
            </div>
          </article>
        </InteriorLayout>

        <section className="story-also">
          <h2 className="bay-hed">Also being covered</h2>
          <ul className="story-also-list">
            {also.map((item) => (
              <li key={item.id} className="story-also-item">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="story-also-link"
                >
                  {item.title}{" "}
                  <span className="text-muted" aria-hidden>
                    ↗
                  </span>
                </a>
                <div className="story-also-sources">
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
      </div>
    </PublicShell>
  );
}
