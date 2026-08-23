"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventTip } from "@/lib/types";

function formatWhen(tip: EventTip): string {
  if (tip.time) return `${tip.date} · ${tip.time}`;
  return `${tip.date} · time blank`;
}

export function EventTipsDeskList({ tips }: { tips: EventTip[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function act(id: string, action: "confirm" | "dismiss") {
    setBusyId(id);
    setError("");
    setFlash("");
    try {
      const res = await fetch(`/api/desk/event-tips/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Failed");
      setFlash(json.message || "Done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const pending = tips.filter((t) => t.status === "pending");
  const done = tips.filter((t) => t.status !== "pending");

  return (
    <div>
      {error ? (
        <p className="mb-3 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="mb-3 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}

      <h2 className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No pending night-out tips.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((tip) => (
            <li
              key={tip.id}
              className="border border-[#ddd4c4] bg-paper-2 px-4 py-3"
            >
              <p className="font-serif text-lg text-ink">{tip.title}</p>
              <p className="mt-1 text-sm text-muted">
                {formatWhen(tip)}
                {tip.place ? ` · ${tip.place}` : ""}
              </p>
              {tip.note ? (
                <p className="mt-1 text-sm text-[#444]">{tip.note}</p>
              ) : null}
              {tip.url ? (
                <p className="mt-1 text-sm">
                  <a
                    href={tip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal hover:underline"
                  >
                    {tip.url}
                  </a>
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-2">
                {[tip.name, tip.email].filter(Boolean).join(" · ") ||
                  "Anonymous"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-teal"
                  disabled={busyId === tip.id}
                  onClick={() => void act(tip.id, "confirm")}
                >
                  {busyId === tip.id ? "…" : "Confirm → Events"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busyId === tip.id}
                  onClick={() => void act(tip.id, "dismiss")}
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
            Recent ({done.length})
          </h2>
          <ul className="mt-2 space-y-2 text-sm text-muted">
            {done.slice(0, 20).map((tip) => (
              <li key={tip.id}>
                <span className="uppercase tracking-wide text-muted-2">
                  {tip.status}
                </span>
                {" · "}
                {tip.title}
                {" · "}
                {formatWhen(tip)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
