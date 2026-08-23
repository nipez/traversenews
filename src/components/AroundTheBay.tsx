import { formatRelative } from "@/lib/dates";
import type { ClusteredStory } from "@/lib/types";

/** Around the bay — 2-col grid of real pulled stories. No wire photos. */
export function AroundTheBay({
  items,
}: {
  items: ClusteredStory[];
  showDateline?: boolean;
}) {
  const shown = items.slice(0, 8);

  return (
    <section className="anim-rise">
      <h2 className="bay-hed">Around the bay</h2>
      {shown.length === 0 ? (
        <p className="mt-4 border-t-2 border-ink py-6 text-sm text-muted">
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
                className="group block"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {item.sources.slice(0, 2).map((s) => (
                    <span key={s.id} className="source-box">
                      {s.name}
                    </span>
                  ))}
                  <span className="text-[0.65rem] font-semibold text-muted">
                    {formatRelative(item.published_at)}
                  </span>
                </div>
                <h3 className="bay-title group-hover:text-teal">
                  {item.title}
                  <span className="ml-1 text-[0.85rem] text-muted" aria-hidden>
                    ↗
                  </span>
                </h3>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
