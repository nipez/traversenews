import { formatBayDateline, formatRelative } from "@/lib/dates";
import type { ClusteredStory } from "@/lib/types";

export function AroundTheBay({
  items,
  showDateline = true,
}: {
  items: ClusteredStory[];
  showDateline?: boolean;
}) {
  return (
    <section className="anim-rise anim-delay-1">
      {showDateline ? (
        <p className="mb-3 text-[0.72rem] font-semibold tracking-[0.14em] text-muted-2 uppercase">
          {formatBayDateline()}
        </p>
      ) : null}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <h2 className="font-serif text-[1.85rem] leading-none tracking-tight text-ink md:text-[2.15rem]">
            Around the bay
          </h2>
          <p className="mt-2 text-[0.72rem] font-bold tracking-[0.12em] text-teal uppercase">
            Headlines from other desks
          </p>
        </div>
      </div>

      <ul>
        {items.map((item, index) => (
          <li key={item.id} className={index === 0 ? "" : "border-t border-rule"}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block py-5"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {item.sources.map((s) => (
                  <span key={s.id} className="source-pill">
                    {s.name}
                  </span>
                ))}
                <span className="text-xs font-medium text-muted">
                  {formatRelative(item.published_at)}
                </span>
              </div>
              <h3 className="font-serif text-[1.35rem] leading-[1.2] tracking-tight text-ink group-hover:text-teal md:text-[1.45rem]">
                {item.title}
                <span className="ml-1 inline-block text-base text-muted" aria-hidden>
                  ↗
                </span>
              </h3>
              {item.dek ? (
                <p className="mt-2 max-w-3xl text-[0.98rem] leading-relaxed text-[#3a3a3a]">
                  {item.dek}
                </p>
              ) : null}
            </a>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-6 text-sm text-muted">
            No live wire yet. Run a pull — we do not invent headlines.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
