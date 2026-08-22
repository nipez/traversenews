import Link from "next/link";
import { formatRelative } from "@/lib/dates";
import type { ClusteredStory } from "@/lib/types";

export function AroundTheBay({ items }: { items: ClusteredStory[] }) {
  return (
    <section className="anim-rise anim-delay-1">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-serif text-2xl text-ink">Around the bay</h2>
          <span className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted-2 uppercase">
            Headlines from other desks
          </span>
        </div>
        <span className="hidden text-[0.68rem] font-semibold tracking-[0.08em] text-muted-2 uppercase md:inline">
          Other desks
        </span>
      </div>

      <ul>
        {items.map((item, index) => (
          <li key={item.id} className={index === 0 ? "" : "border-t border-rule"}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block py-4"
            >
              <h3 className="font-serif text-[1.2rem] leading-snug text-ink group-hover:text-teal md:text-[1.28rem]">
                {item.title}
                <span className="ml-1 inline-block text-base text-muted" aria-hidden>
                  ↗
                </span>
              </h3>
              {item.dek ? (
                <p className="mt-1.5 max-w-3xl text-[0.95rem] leading-relaxed text-[#444]">
                  {item.dek}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {item.sources.map((s) => (
                  <span key={s.id} className="source-pill">
                    {s.name}
                  </span>
                ))}
                <span className="text-xs text-muted">
                  {formatRelative(item.published_at)}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
