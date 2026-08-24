"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OriginalDraft } from "@/lib/types";

type StatusFilter = "all" | "draft" | "published";

function sortKey(d: OriginalDraft): string {
  return d.published_at || d.updated_at;
}

function formatDetroitDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Detroit",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function matchesQuery(d: OriginalDraft, q: string): boolean {
  if (!q) return true;
  const hay = [d.title, d.dek, d.slug ?? "", d.byline, d.section ?? ""]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

export function OriginalsIndex({ drafts }: { drafts: OriginalDraft[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...drafts]
      .filter((d) => (status === "all" ? true : d.status === status))
      .filter((d) => matchesQuery(d, q))
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }, [drafts, query, status]);

  if (drafts.length === 0) {
    return (
      <p className="mt-10 border-t border-rule pt-6 text-sm text-muted">
        No drafts yet. Empty is correct until Nick writes one from a real wire
        item.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search originals</span>
          <input
            className="input w-full"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, dek, slug, byline…"
            autoComplete="off"
          />
        </label>
        <div className="segmented flex shrink-0" role="group" aria-label="Status">
          {(
            [
              ["all", "All"],
              ["draft", "Drafts"],
              ["published", "Published"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              data-active={status === value ? "true" : undefined}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {filtered.length} of {drafts.length}
        {status !== "all" ? ` · ${status}` : null}
        {query.trim() ? ` · “${query.trim()}”` : null}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 border-t border-rule pt-4 text-sm text-muted">
          No originals match this search.
        </p>
      ) : (
        <ul className="mt-4 border-t border-rule">
          {filtered.map((d) => (
            <li
              key={d.id}
              className="grid gap-1 border-b border-rule py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link
                    href={`/desk/originals/${d.id}`}
                    className="font-serif text-lg leading-snug text-ink hover:text-teal"
                  >
                    {d.title || "Untitled draft"}
                  </Link>
                  <span
                    className={
                      d.status === "published"
                        ? "inline-block border border-ink bg-ink px-1.5 py-0.5 text-[0.65rem] font-bold tracking-[0.06em] text-paper uppercase"
                        : "inline-block border border-rule bg-paper-2 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-[0.06em] text-muted-2 uppercase"
                    }
                  >
                    {d.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {d.section?.trim() || "No kicker"}
                  {" · "}
                  {d.byline}
                  {d.slug ? (
                    <>
                      {" · "}
                      <span className="font-mono text-[0.8rem]">/{d.slug}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="shrink-0 text-sm text-muted sm:text-right">
                <time dateTime={sortKey(d)}>
                  {formatDetroitDate(sortKey(d))}
                </time>
                {d.status === "draft" && d.go_live_at ? (
                  <div className="text-[0.8rem]">
                    Goes live {formatDetroitDate(d.go_live_at)}
                  </div>
                ) : null}
                {d.status === "published" && d.slug ? (
                  <div>
                    <Link
                      href={`/story/${d.slug}`}
                      className="text-teal hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View live
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
