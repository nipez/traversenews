"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PageCopy } from "@/lib/page-copy";

export function HomeTaglineEditor({
  initialDek,
  defaultDek,
  weatherLine,
}: {
  initialDek: string;
  defaultDek: string;
  weatherLine: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dek, setDek] = useState(initialDek || defaultDek);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    const res = await fetch("/api/desk/page-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero_dek: dek }),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      resolved?: PageCopy;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? `Save failed (${res.status})`);
      return;
    }
    if (json?.resolved?.hero_dek) setDek(json.resolved.hero_dek);
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <section className="border border-rule bg-white/70 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-ink">Tagline</h2>
        <a
          href="/"
          className="text-xs font-semibold tracking-[0.1em] text-teal uppercase hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          / ↗
        </a>
      </div>
      <p className="mt-2 text-sm text-[#444]">
        Line under the wordmark. Today&apos;s NWS weather sits under it on the
        homepage, same as traverse.news. You cannot type a forecast here.
      </p>

      {error ? (
        <p className="mt-3 border border-terracotta/40 bg-peach/40 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm text-teal">Saved. Homepage picks it up now.</p>
      ) : null}

      <label className="mt-4 block">
        <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          Homepage tagline
        </span>
        <input
          className="input mt-1"
          value={dek}
          maxLength={200}
          onChange={(e) => setDek(e.target.value)}
          disabled={pending}
        />
      </label>
      <p className="mt-2 text-xs text-muted">{dek.trim().length} / 200</p>

      <div className="mt-4 border border-dashed border-rule bg-paper-2 px-3 py-3 text-sm">
        <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          Weather under the tagline
        </p>
        <p className="mt-1 font-medium text-ink">
          {weatherLine ?? "No forecast cached yet. The weekday pull writes it."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-email"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? "Saving…" : "Save tagline"}
        </button>
        <button
          type="button"
          className="border border-ink px-3 py-2 text-sm font-semibold text-ink hover:bg-paper-2"
          disabled={pending}
          onClick={() => {
            setDek(defaultDek);
            setSaved(false);
          }}
        >
          Load shipped default
        </button>
      </div>
    </section>
  );
}
