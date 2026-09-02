"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Compact search in the shared ink nav (home + interiors).
 */
export function NavSearch({
  initialQuery = "",
  siteName = "traverse.news",
}: {
  initialQuery?: string;
  siteName?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) {
      setOpen(true);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={`nav-search${open ? " nav-search-open" : ""}`}>
      <button
        type="button"
        className="nav-search-toggle"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <form
        className="nav-search-form"
        action="/search"
        method="get"
        role="search"
        onSubmit={onSubmit}
      >
        <label className="sr-only" htmlFor="nav-search-q">
          Search {siteName}
        </label>
        <input
          id="nav-search-q"
          className="nav-search-input"
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          autoComplete="off"
        />
        <button type="submit" className="nav-search-go">
          Go
        </button>
      </form>
    </div>
  );
}
