"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDeskLetterAround } from "@/components/desk/DeskLetterAroundContext";
import {
  formatPastRunFlag,
  type DeskLetterCandidate,
  type LetterCardPastRun,
} from "@/lib/desk-letter-cards";
import { letterCardIdentity } from "@/lib/email-editions";
import type { EmailStoryCard } from "@/lib/types";

type Props = {
  lead: EmailStoryCard | null;
  leadLocked: boolean;
  candidates: DeskLetterCandidate[];
};

function pastFlags(runs: LetterCardPastRun[]): string {
  return runs.slice(0, 3).map(formatPastRunFlag).join(" · ");
}

export function DeskLetterLeadPicker({
  lead,
  leadLocked,
  candidates,
}: Props) {
  const router = useRouter();
  const { markSynced } = useDeskLetterAround();
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<EmailStoryCard | null>(lead);

  const currentId = current ? letterCardIdentity(current) : "";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool = candidates.filter((c) => c.identity !== currentId);
    if (!needle) return pool;
    return pool.filter(
      (c) =>
        c.card.title.toLowerCase().includes(needle) ||
        c.card.dek.toLowerCase().includes(needle) ||
        c.card.sources.some((s) => s.toLowerCase().includes(needle)),
    );
  }, [candidates, q, currentId]);

  async function persist(next: EmailStoryCard | null) {
    setBusy(next ? "save" : "reset");
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: next }),
      });
      const json = (await res.json()) as {
        error?: string;
        lead?: EmailStoryCard | null;
        lead_locked?: boolean;
        around?: EmailStoryCard[];
        around_locked?: boolean;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      setCurrent(json.lead ?? null);
      if (Array.isArray(json.around)) {
        markSynced(json.around, Boolean(json.around_locked));
      }
      setFlash(
        next
          ? "Lead locked. Pulls keep this “The one to read” card."
          : "Lead reset to auto mix.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = leadLocked
    ? "Desk lead locked"
    : "Using auto lead";

  return (
    <section className="mt-8 border border-rule bg-paper-2 px-4 py-5 md:px-5">
      <h2 className="font-display text-lg font-black tracking-tight">
        The one to read
      </h2>
      <p className="mt-1 text-sm text-[#444]">
        Pick any original or Around card as today’s lead. Saves lock it across
        pulls the way the subject override does. Promoting an Around card
        backfills the bay so the mix keeps its count.
      </p>

      <p className="mt-3 text-sm text-muted">{statusLabel}</p>

      <div className="mt-5 border border-rule bg-paper px-3 py-3">
        {current ? (
          <>
            <p className="font-serif text-lg leading-snug text-ink">
              {current.title}
            </p>
            {current.dek ? (
              <p className="mt-1 text-sm text-[#444] line-clamp-2">
                {current.dek}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted">
              {current.desk_original
                ? "traverse.news original"
                : current.sources.join(" · ") || "Unknown outlet"}
              {current.paywalled ? " · paywalled" : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            No lead yet — auto mix found no unused original or hard-news card.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => void persist(null)}
        >
          {busy === "reset" ? "Resetting…" : "Reset to auto"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="mt-3 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}

      <h3 className="mt-8 font-display text-base font-black tracking-tight">
        Lead candidates
      </h3>
      <label className="mt-2 block">
        <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          Search originals and pulled stories
        </span>
        <input
          className="input mt-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, dek, or outlet"
          disabled={busy !== null}
        />
      </label>

      <ul className="mt-4 max-h-[22rem] overflow-y-auto border border-rule bg-paper">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted">
            {candidates.length === 0
              ? "No candidates yet. Publish an original or run a pull."
              : "No matching candidates left."}
          </li>
        ) : (
          filtered.map((row) => (
            <li
              key={row.identity}
              className="border-t border-rule first:border-t-0"
            >
              <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-snug text-ink">
                    {row.card.title}
                  </p>
                  {row.card.dek ? (
                    <p className="mt-1 text-sm text-[#444] line-clamp-2">
                      {row.card.dek}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    {row.card.desk_original
                      ? "traverse.news original"
                      : row.card.sources.join(" · ") || "Unknown outlet"}
                    {row.card.paywalled ? " · paywalled" : ""}
                  </p>
                  {row.past_runs.length ? (
                    <p className="mt-1 text-sm text-[#a33]">
                      {pastFlags(row.past_runs)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      Never ran on a letter or homepage edition
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-teal inline-flex shrink-0 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => void persist(row.card)}
                >
                  {busy === "save" ? "Saving…" : "Use as lead"}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
