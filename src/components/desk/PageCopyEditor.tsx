"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DEFAULT_ABOUT_BODY,
  DEFAULT_ABOUT_DEK,
  DEFAULT_ABOUT_TITLE,
  DEFAULT_EVENTS_DEK,
  type PageCopy,
} from "@/lib/page-copy";

export function PageCopyEditor({ initial }: { initial: PageCopy }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [eventsDek, setEventsDek] = useState(
    initial.events_dek || DEFAULT_EVENTS_DEK,
  );
  const [aboutTitle, setAboutTitle] = useState(
    initial.about_title || DEFAULT_ABOUT_TITLE,
  );
  const [aboutDek, setAboutDek] = useState(
    initial.about_dek || DEFAULT_ABOUT_DEK,
  );
  const [aboutBody, setAboutBody] = useState(
    initial.about_body || DEFAULT_ABOUT_BODY,
  );

  async function save() {
    setError(null);
    setSaved(false);
    const res = await fetch("/api/desk/page-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events_dek: eventsDek,
        about_title: aboutTitle,
        about_dek: aboutDek,
        about_body: aboutBody,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      resolved?: PageCopy;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? `Save failed (${res.status})`);
      return;
    }
    if (json?.resolved) {
      setEventsDek(json.resolved.events_dek);
      setAboutTitle(json.resolved.about_title);
      setAboutDek(json.resolved.about_dek);
      setAboutBody(json.resolved.about_body);
    }
    setSaved(true);
    startTransition(() => router.refresh());
  }

  function resetDefaults() {
    setEventsDek(DEFAULT_EVENTS_DEK);
    setAboutTitle(DEFAULT_ABOUT_TITLE);
    setAboutDek(DEFAULT_ABOUT_DEK);
    setAboutBody(DEFAULT_ABOUT_BODY);
    setSaved(false);
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-[#444]">
        Edit the static text on public pages. Links:{" "}
        <code className="bg-paper-2 px-1">[Civic](/civic)</code>. Headings:{" "}
        <code className="bg-paper-2 px-1">## Why this exists</code>. Bold:{" "}
        <code className="bg-paper-2 px-1">**Today**</code>. Blank a field and
        save to fall back to the shipped default.
      </p>

      {error ? (
        <p className="border border-terracotta/40 bg-peach/40 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-teal">Saved. Public pages pick it up now.</p>
      ) : null}

      <section className="border border-rule bg-white/70 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-ink">Events dek</h2>
          <a
            href="/events"
            className="text-xs font-semibold tracking-[0.1em] text-teal uppercase hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            /events ↗
          </a>
        </div>
        <label className="mt-4 block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Line under the Events header
          </span>
          <textarea
            className="input mt-1 min-h-[5.5rem] font-sans text-sm leading-relaxed"
            value={eventsDek}
            onChange={(e) => setEventsDek(e.target.value)}
            disabled={pending}
          />
        </label>
      </section>

      <section className="border border-rule bg-white/70 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-ink">About</h2>
          <a
            href="/about"
            className="text-xs font-semibold tracking-[0.1em] text-teal uppercase hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            /about ↗
          </a>
        </div>

        <label className="mt-4 block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Title
          </span>
          <input
            className="input mt-1"
            value={aboutTitle}
            onChange={(e) => setAboutTitle(e.target.value)}
            disabled={pending}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Dek
          </span>
          <input
            className="input mt-1"
            value={aboutDek}
            onChange={(e) => setAboutDek(e.target.value)}
            disabled={pending}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Body
          </span>
          <textarea
            className="input mt-1 min-h-[22rem] font-mono text-[0.8rem] leading-relaxed"
            value={aboutBody}
            onChange={(e) => setAboutBody(e.target.value)}
            disabled={pending}
            spellCheck
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-email"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? "Saving…" : "Save page copy"}
        </button>
        <button
          type="button"
          className="border border-ink px-3 py-2 text-sm font-semibold text-ink hover:bg-paper-2"
          disabled={pending}
          onClick={resetDefaults}
        >
          Load shipped defaults
        </button>
      </div>
    </div>
  );
}
