"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ClusteredStory } from "@/lib/types";

export function DraftFromPullPicker({
  clusters,
}: {
  clusters: Array<{
    id: string;
    title: string;
    dek: string;
    url: string;
    sources: Array<{ id: string; name: string }>;
    published_at: string;
  }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clusters.slice(0, 40);
    return clusters
      .filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          c.dek.toLowerCase().includes(needle) ||
          c.sources.some((s) => s.name.toLowerCase().includes(needle)),
      )
      .slice(0, 40);
  }, [clusters, q]);

  async function createFrom(cluster: ClusteredStory | (typeof clusters)[number]) {
    setBusyId(cluster.id);
    setError("");
    try {
      const res = await fetch("/api/desk/originals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster_id: cluster.id }),
      });
      const json = (await res.json()) as {
        error?: string;
        draft?: { id: string };
      };
      if (!res.ok) throw new Error(json.error || "Could not create draft");
      router.push(`/desk/originals/${json.draft?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft");
    } finally {
      setBusyId(null);
    }
  }

  if (clusters.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        No live pulled stories yet. Run a pull from Desk / Queue, then come back.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <label className="block">
        <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          Search live wires
        </span>
        <input
          className="input mt-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, dek, or outlet"
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-4 max-h-[28rem] overflow-y-auto border border-rule bg-white/70">
        {filtered.map((c) => (
          <li key={c.id} className="border-t border-rule first:border-t-0">
            <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-serif text-lg leading-snug text-ink">{c.title}</p>
                {c.dek ? (
                  <p className="mt-1 text-sm text-[#444] line-clamp-2">{c.dek}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.sources.map((s) => (
                    <span key={s.id} className="source-pill">
                      {s.name}
                    </span>
                  ))}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal"
                  >
                    Source ↗
                  </a>
                </div>
              </div>
              <button
                type="button"
                className="btn-teal shrink-0 self-start"
                disabled={busyId === c.id}
                onClick={() => createFrom(c)}
              >
                {busyId === c.id ? "Creating…" : "Draft from this"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
