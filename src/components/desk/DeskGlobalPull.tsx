"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  formatPullFlash,
  type PullApiResult,
} from "@/lib/desk/pull-flash";

type Props = {
  /** Compact control for Desk topnav (Sources / Email / Queue / …). */
  variant?: "chrome" | "panel";
  lastPullAt?: string | null;
  itemCount?: number;
};

/**
 * Site-wide full feed pull — same POST /api/pull the Worker cron uses.
 * Does not invent a second pipeline. Preserves locked morning-letter
 * Around mix / subject_override via existing snapshotTodaysEmailEdition.
 */
export function DeskGlobalPull({
  variant = "chrome",
  lastPullAt = null,
  itemCount,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  /** Optimistic stamp until router.refresh() lands a newer lastPullAt. */
  const [optimisticPullAt, setOptimisticPullAt] = useState<string | null>(null);
  const pullAt =
    optimisticPullAt &&
    (!lastPullAt ||
      new Date(optimisticPullAt).getTime() >= new Date(lastPullAt).getTime())
      ? optimisticPullAt
      : lastPullAt;

  async function onPull() {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/pull", { method: "POST" });
      const json = (await res.json().catch(() => null)) as PullApiResult | null;
      const next = formatPullFlash(json, res.ok);
      setFlash(next);
      if (json?.last_pull_at) setOptimisticPullAt(json.last_pull_at);
      router.refresh();
    } catch (err) {
      setFlash({
        ok: false,
        text: err instanceof Error ? err.message : "Pull failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const lastLabel = pullAt
    ? new Date(pullAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Detroit",
      })
    : "not yet";

  if (variant === "panel") {
    return (
      <section className="desk-pull-panel border border-rule bg-paper-2 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-ink">Pull all sources</h2>
            <p className="mt-1 text-sm text-muted">
              Full feed pull via{" "}
              <code className="bg-white px-1">POST /api/pull</code>
              {" — "}same job as the weekday 7:30am cron. Usually 20–60s.
              Locked morning-letter Around mix and subject stay put.
            </p>
            <p className="mt-1 text-sm text-muted">
              Last pull {lastLabel}
              {typeof itemCount === "number" ? ` · ${itemCount} items` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn-teal shrink-0 disabled:opacity-50"
            disabled={busy}
            onClick={onPull}
            aria-busy={busy}
          >
            {busy ? "Pulling…" : "Pull now"}
          </button>
        </div>
        {busy ? (
          <p className="mt-3 text-sm text-muted" role="status">
            Pulling all enabled sources… hang on.
          </p>
        ) : null}
        {flash ? (
          <p
            className={`mt-3 text-sm ${flash.ok ? "text-teal" : "text-red-800"}`}
            role="status"
          >
            {flash.text}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="desk-pull-chrome relative flex items-center gap-2">
      <span className="hidden text-xs text-white/80 sm:inline" aria-live="polite">
        Last pull {lastLabel}
        {typeof itemCount === "number" ? ` · ${itemCount} items` : ""}
      </span>
      <button
        type="button"
        className="desk-pull-chrome-btn disabled:opacity-50"
        disabled={busy}
        onClick={onPull}
        aria-busy={busy}
        title="Full feed pull for all enabled sources (~20–60s). Locked Around mix and subject stay put."
      >
        {busy ? "Pulling…" : "Pull now"}
      </button>
      {busy || flash ? (
        <div
          className="desk-pull-chrome-flash"
          role="status"
          data-ok={flash ? (flash.ok ? "true" : "false") : undefined}
        >
          {busy
            ? "Full pull in progress (~20–60s). Locked Around mix stays put."
            : flash?.text}
        </div>
      ) : null}
    </div>
  );
}
