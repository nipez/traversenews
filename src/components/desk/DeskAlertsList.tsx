"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DeskAlertRow = {
  id: string;
  title: string;
  dek: string;
  url: string;
  source_name: string;
};

export function DeskAlertsList({
  heading,
  empty,
  items,
}: {
  heading: string;
  empty: string;
  items: DeskAlertRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function onDelete(item: DeskAlertRow) {
    if (
      !window.confirm(
        `Delete "${item.title}" from Alerts? This removes it from the homepage strip.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    setError("");
    setFlash("");
    try {
      const res = await fetch(`/api/desk/alerts/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setFlash(json.message || "Deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
        {heading}
      </h2>
      {error ? (
        <p className="mt-2 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="mt-2 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6ddd0] pb-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
                  {a.source_name}
                </p>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block font-serif text-lg text-teal hover:underline"
                >
                  {a.title}
                </a>
                {a.dek ? (
                  <p className="mt-0.5 text-sm text-muted">{a.dek}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0"
                disabled={busyId === a.id}
                onClick={() => void onDelete(a)}
              >
                {busyId === a.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
