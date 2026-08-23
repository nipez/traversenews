import { formatBayDateline, formatRelative } from "@/lib/dates";
import type { ClusteredStory } from "@/lib/types";

export function AroundTheBay({
  items,
  showDateline = true,
}: {
  items: ClusteredStory[];
  showDateline?: boolean;
}) {
  const lead = items[0] ?? null;
  const rest = items.slice(1, 7);

  return (
    <section className="anim-rise anim-delay-1">
      <div className="mb-6 md:mb-8">
        {showDateline ? (
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-2 uppercase">
            {formatBayDateline()}
          </p>
        ) : null}
        <h2 className="mt-2 font-serif text-[2.4rem] leading-[0.95] tracking-tight text-ink md:text-[3rem]">
          Around the bay
        </h2>
        <p className="mt-2 max-w-md text-[0.95rem] text-[#444]">
          Headlines from other desks — link out, never full reprint.
        </p>
      </div>

      {lead ? (
        <a
          href={lead.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bay-lead group block border-t border-ink/25 pt-6 pb-8"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {lead.sources.map((s) => (
              <span key={s.id} className="source-stamp">
                {s.name}
              </span>
            ))}
            <span className="text-xs font-medium text-muted">
              {formatRelative(lead.published_at)}
            </span>
          </div>
          <h3 className="font-serif text-[2.15rem] leading-[1.05] tracking-tight text-ink group-hover:text-teal md:text-[2.75rem] lg:text-[3.1rem]">
            {lead.title}
            <span className="ml-2 text-[1.1rem] text-muted" aria-hidden>
              ↗
            </span>
          </h3>
          {lead.dek ? (
            <p className="mt-4 max-w-2xl text-[1.08rem] leading-relaxed text-[#333] md:text-[1.15rem]">
              {lead.dek}
            </p>
          ) : null}
        </a>
      ) : (
        <p className="border-t border-rule py-8 text-sm text-muted">
          No live wire yet. Run a pull — we do not invent headlines.
        </p>
      )}

      {rest.length > 0 ? (
        <ul className="bay-stack grid gap-x-10 gap-y-0 border-t border-ink/20 md:grid-cols-2">
          {rest.map((item) => (
            <li key={item.id} className="border-t border-rule md:border-t">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block py-4"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {item.sources.slice(0, 2).map((s) => (
                    <span key={s.id} className="source-stamp source-stamp-sm">
                      {s.name}
                    </span>
                  ))}
                  <span className="text-[0.7rem] text-muted">
                    {formatRelative(item.published_at)}
                  </span>
                </div>
                <h3 className="font-serif text-[1.15rem] leading-snug tracking-tight text-ink group-hover:text-teal md:text-[1.22rem]">
                  {item.title}
                  <span className="ml-1 text-sm text-muted" aria-hidden>
                    ↗
                  </span>
                </h3>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
