import { formatBayDay } from "@/lib/dates";
import type { ClusteredStory } from "@/lib/types";

/** Around the bay — title first, then source pills. Real pulled stories only. */
export function AroundTheBay({ items }: { items: ClusteredStory[] }) {
  const shown = items.slice(0, 8);

  return (
    <section className="bay-section">
      <div className="bay-head">
        <h2 className="bay-hed">Around the bay</h2>
        <p className="bay-kicker">Headlines link out — we don’t reprint</p>
      </div>
      {shown.length === 0 ? (
        <p className="bay-empty">
          No live wire yet. Run a pull — we do not invent headlines.
        </p>
      ) : (
        <ul className="bay-grid">
          {shown.map((item) => (
            <li key={item.id} className="bay-item">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bay-item-link"
              >
                <h3 className="bay-title">{item.title}</h3>
                <div className="bay-meta">
                  {item.sources.slice(0, 2).map((s) => (
                    <span key={s.id} className="source-box">
                      {s.name}
                    </span>
                  ))}
                  <span className="bay-rel">{formatBayDay(item.published_at)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
