"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ingestPathForSource } from "@/lib/desk/ingest-path";
import type { Source } from "@/lib/types";

/**
 * Honest pull status for one Desk source: method, last pull, empty vs live,
 * and the box-browser import path when Worker does not scrape.
 */
export function SourcePullStatus({
  source,
  storyCount,
  eventCount,
}: {
  source: Source;
  storyCount: number;
  eventCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const path = ingestPathForSource(source);
  const liveCount = storyCount + eventCount;
  const lastPull = source.last_pulled_at;

  async function onPullNow() {
    setBusy(true);
    setMessage("");
    try {
      if (!path.workerPulls) {
        setMessage(
          path.importPath
            ? `Worker will not scrape this ${source.pull_method} source. Use ${path.importPath} from the box.`
            : path.summary,
        );
        return;
      }
      const res = await fetch("/api/pull", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        errors?: Array<{ source: string; error: string }>;
      } | null;
      const mine = json?.errors?.find((e) => e.source === source.name);
      setMessage(
        mine
          ? mine.error
          : json?.ok === false
            ? "Pull finished with other-source errors. Refresh for counts."
            : "Pull finished. Refreshing…",
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-rule bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Pull status</h2>
          <p className="mt-1 text-sm text-muted">
            Method <span className="font-medium text-ink">{source.pull_method}</span>
            {" · "}
            {liveCount > 0 ? (
              <span className="text-teal">
                Live · {storyCount} stor
                {storyCount === 1 ? "y" : "ies"} · {eventCount} event
                {eventCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span>Empty in store</span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted">
            Last pull:{" "}
            {lastPull
              ? new Date(lastPull).toLocaleString("en-US", {
                  timeZone: "America/Detroit",
                })
              : "—"}
          </p>
          <p className="mt-2 text-sm text-[#444]">{path.summary}</p>
          {source.last_pull_error ? (
            <p className="mt-2 text-sm text-red-800">{source.last_pull_error}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-teal shrink-0"
          disabled={busy}
          onClick={onPullNow}
        >
          {busy ? "Pulling…" : "Pull now"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </div>
  );
}
