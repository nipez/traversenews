import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { CivicList } from "@/components/CivicList";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { TipsForm } from "@/components/TipsForm";
import { TonightBlock } from "@/components/TonightBlock";
import { formatStoryDateline } from "@/lib/dates";
import { selectAroundTheBay } from "@/lib/around";
import { getAppData, getOriginalBySlug } from "@/lib/data/store";
import { selectTonightEvents } from "@/lib/events";
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
  // Concerts / markets only — same featured pool as Events, never HS athletics.
  const tonight = selectTonightEvents(data.events, data.sources, {
    limit: 4,
    horizonDays: 12,
    maxPerSource: 2,
    timedOnly: true,
  });
  const also = selectAroundTheBay(
    clusterStories(data.stories, data.sources).filter((c) => !c.is_original),
    { limit: 5, maxPerSource: 2, maxSports: 2, maxRecordEagle: 1 },
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
      <div className="story-page">
        {/* Full-bleed hed — wide above the two columns */}
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
            By <strong>{story.byline ?? "Desk"}</strong>
            {" · "}
            {dateline}
            {readMins ? ` · ${readMins} min read` : null}
          </p>
        </header>

        <div className="story-layout">
          <article className="story-main">
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

          <aside className="story-rail" aria-label="Alongside this story">
            <CivicList
              events={civic}
              showStamp
              linkLabel="Calendar"
              limit={4}
            />
            <TonightBlock events={tonight} limit={4} showStamp />
            <div className="story-rail-card story-rail-email">
              <MorningScanSignup variant="teal" />
            </div>
            {/* Reserved for ads later — no fake sponsors. */}
            <div className="story-ad-well" aria-hidden="true">
              <p className="story-ad-label">Advertising</p>
              <p className="story-ad-hint">Reserved</p>
            </div>
          </aside>
        </div>

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
