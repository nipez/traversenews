import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { getAppData } from "@/lib/data/store";
import { searchAppData, searchHasAny, type SearchHit } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search",
};

type Props = { searchParams: Promise<{ q?: string }> };

function ResultGroup({
  title,
  hits,
}: {
  title: string;
  hits: SearchHit[];
}) {
  if (hits.length === 0) return null;
  return (
    <section className="search-group">
      <h2 className="search-group-hed">{title}</h2>
      <ul className="search-list">
        {hits.map((hit) => (
          <li key={hit.id} className="search-row">
            {hit.external ? (
              <a
                href={hit.href}
                target="_blank"
                rel="noopener noreferrer"
                className="search-title"
              >
                {hit.title}
                <span aria-hidden> ↗</span>
              </a>
            ) : (
              <Link href={hit.href} className="search-title">
                {hit.title}
              </Link>
            )}
            {hit.dek ? <p className="search-dek">{hit.dek}</p> : null}
            {hit.meta ? <p className="search-meta">{hit.meta}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q: raw = "" } = await searchParams;
  const q = raw.trim();
  const data = await getAppData();
  const results = searchAppData(data, q);
  const hasAny = searchHasAny(results);

  return (
    <PublicShell active="/" header="compact">
      <div className="search-page">
        <header className="search-hero">
          <p className="search-kicker">Search</p>
          <h1 className="search-hed">
            {q ? (
              <>
                Results for <span className="search-q">“{q}”</span>
              </>
            ) : (
              "Search the desk"
            )}
          </h1>
          <p className="search-lead">
            Titles, deks, and places from the live desk pull.
          </p>
          <form className="search-page-form" action="/search" method="get">
            <label className="sr-only" htmlFor="search-page-q">
              Search
            </label>
            <input
              id="search-page-q"
              className="input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Try a show, school, or headline"
              autoFocus
            />
            <button type="submit" className="btn-teal">
              Search
            </button>
          </form>
        </header>

        {!q ? (
          <p className="search-empty">Type a query in the bar above.</p>
        ) : !hasAny ? (
          <p className="search-empty">Nothing in the pull for that.</p>
        ) : (
          <div className="search-groups">
            <ResultGroup title="Stories" hits={results.stories} />
            <ResultGroup title="Events" hits={results.events} />
            <ResultGroup title="Civic" hits={results.civic} />
            <ResultGroup title="Schools" hits={results.schools} />
            <ResultGroup title="Sports this week" hits={results.sports} />
            <ResultGroup title="Alerts" hits={results.alerts} />
          </div>
        )}
      </div>
    </PublicShell>
  );
}
