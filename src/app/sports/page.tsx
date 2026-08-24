import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SportsThisWeek } from "@/components/SportsThisWeek";
import { selectThisWeekAthletics } from "@/lib/athletics";
import { formatBayDay } from "@/lib/dates";
import { getAppData } from "@/lib/data/store";
import { isRecordEagleStory } from "@/lib/paywall";
import { selectSportsStories, type SportsStory } from "@/lib/sports";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sports",
};

const SPORTS_BEAT_LINKS = [
  {
    name: "9&10 Sports",
    href: "https://www.9and10news.com/sports/",
  },
  {
    name: "Record-Eagle Sports",
    href: "https://www.record-eagle.com/sports/",
  },
  {
    name: "Record-Eagle Local Sports",
    href: "https://www.record-eagle.com/sports/local_sports/",
  },
];

function SportsList({ items }: { items: SportsStory[] }) {
  if (items.length === 0) {
    return (
      <p className="sports-empty">No sports headlines yet.</p>
    );
  }

  return (
    <ul className="sports-list">
      {items.map((item) => (
        <li key={item.id} className="sports-item">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sports-item-link"
          >
            <h3 className="sports-title">{item.title}</h3>
            <div className="sports-meta">
              <span className="source-box">{item.source_name}</span>
              {isRecordEagleStory(item) ? (
                <span className="paywall-pill">Paywall</span>
              ) : null}
              <span className="sports-day">{formatBayDay(item.published_at)}</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function SportsPage() {
  const data = await getAppData();
  const weekGames = selectThisWeekAthletics(data.athletics ?? []);
  const all = selectSportsStories(data.stories, data.sources, { limit: 40 });
  const seen = new Set<string>();
  const unique: typeof all = [];
  for (const item of all) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  const varsity = unique.filter((s) => s.beat_id === "beat_sports");
  const prepOnly = unique.filter((s) => s.beat_id === "beat_hs_sports");
  const showHsSubhead = varsity.length > 0 && prepOnly.length > 0;

  return (
    <PublicShell active="/sports" header="compact">
      <div className="about-layout sports-layout">
        <div className="about-essay sports-main">
          <header className="sports-hero">
            <p className="sports-kicker">Scores &amp; prep</p>
            <h1 className="sports-hed">Sports</h1>
            <p className="sports-dek">
              Headlines from 9&amp;10 Sports, Record-Eagle Sports, and local
              prep across the greater bay.
            </p>
          </header>

          <SportsThisWeek games={weekGames} />

          {showHsSubhead ? (
            <>
              <section className="sports-section">
                <h2 className="sports-subhed">Sports</h2>
                <SportsList items={varsity} />
              </section>
              <section className="sports-section">
                <h2 className="sports-subhed">High school</h2>
                <SportsList items={prepOnly} />
              </section>
            </>
          ) : (
            <SportsList items={unique} />
          )}

          <p className="sports-foot">
            Also on <Link href="/">Today</Link> in Around the bay.
          </p>
        </div>

        <DeskRail active="/sports" sportsBeats={SPORTS_BEAT_LINKS} />
      </div>
    </PublicShell>
  );
}
