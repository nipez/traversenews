"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { SourcePullStatus } from "@/components/desk/SourcePullStatus";
import type { Beat, PullMethod, Source, SourceLane, Story } from "@/lib/types";

const LANES: Array<SourceLane | ""> = [
  "",
  "wire",
  "alert",
  "civic",
  "events",
  "school_cal",
  "athletics",
  "shows",
  "original",
];

const METHODS: PullMethod[] = ["rss", "ics", "html", "facebook", "original"];

export function SourceForm({
  beats,
  initial,
  recentStories = [],
  eventCount = 0,
}: {
  beats: Beat[];
  initial?: Source;
  recentStories?: Story[];
  eventCount?: number;
}) {
  const router = useRouter();
  const editableBeats = useMemo(
    () => beats.filter((b) => b.slug !== "all"),
    [beats],
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [homepage, setHomepage] = useState(initial?.homepage ?? "");
  const [feedUrl, setFeedUrl] = useState(initial?.feed_url ?? "");
  const [beatId, setBeatId] = useState(
    initial?.beat_id ?? editableBeats[0]?.id ?? "beat_general",
  );
  const [pullMethod, setPullMethod] = useState<PullMethod>(
    initial?.pull_method && initial.pull_method !== "none"
      ? initial.pull_method
      : "rss",
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lane, setLane] = useState<SourceLane | "">(initial?.lane ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name,
      homepage,
      feed_url: feedUrl,
      beat_id: beatId,
      pull_method: pullMethod,
      enabled,
      notes,
      lane: lane || undefined,
      place: place.trim() || undefined,
    };
    try {
      const res = await fetch(
        initial ? `/api/desk/sources/${initial.id}` : "/api/desk/sources",
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as { error?: string; source?: Source };
      if (!res.ok) throw new Error(json.error || "Save failed");
      router.push(`/desk/sources/${json.source?.id ?? initial?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Name
          </span>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Homepage
            </span>
            <input
              className="input mt-1"
              value={homepage}
              onChange={(e) => setHomepage(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Beat
            </span>
            <select
              className="input mt-1"
              value={beatId}
              onChange={(e) => setBeatId(e.target.value)}
            >
              {editableBeats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Feed URL
          </span>
          <input
            className="input mt-1"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
          />
        </label>

        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Pull method
          </p>
          <div className="segmented mt-2 flex flex-wrap">
            {METHODS.map((method) => (
              <button
                key={method}
                type="button"
                data-active={pullMethod === method}
                onClick={() => setPullMethod(method)}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border border-rule bg-paper-2 px-3 py-3">
          <div>
            <p className="font-medium">Pull this source</p>
            <p className="text-sm text-muted">
              Off means we keep the record but never fetch.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              enabled ? "bg-teal" : "bg-[#cfcfcf]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Lane
            </span>
            <select
              className="input mt-1"
              value={lane}
              onChange={(e) => setLane(e.target.value as SourceLane | "")}
            >
              {LANES.map((l) => (
                <option key={l || "auto"} value={l}>
                  {l || "Auto / fallback"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Place
            </span>
            <input
              className="input mt-1"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Ann Arbor, Ypsilanti, Saline, …"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Notes
          </span>
          <textarea
            className="input mt-1 min-h-28"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push("/desk")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-teal" disabled={saving}>
            {saving ? "Saving…" : "Save source"}
          </button>
        </div>
      </div>

      <aside className="space-y-4">
        {initial ? (
          <SourcePullStatus
            source={{
              ...initial,
              name,
              homepage,
              feed_url: feedUrl || null,
              beat_id: beatId,
              pull_method: pullMethod,
              enabled,
              notes,
            }}
            storyCount={recentStories.length}
            eventCount={eventCount}
          />
        ) : (
          <div className="border border-rule bg-white p-4 text-sm text-muted">
            Save the source first to see pull status.
          </div>
        )}

        {recentStories.length > 0 ? (
          <div className="border border-rule bg-white p-4">
            <h2 className="font-semibold">Recent stories</h2>
            <ul className="mt-3 space-y-3">
              {recentStories.slice(0, 3).map((story) => (
                <li key={story.id} className="text-sm">
                  <p className="leading-snug">{story.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(story.published_at).toLocaleString("en-US", {
                      timeZone: "America/Detroit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
