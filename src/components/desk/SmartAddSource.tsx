"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { SourceResearchResult } from "@/lib/desk/research-source";
import type { Beat, PullMethod, Source } from "@/lib/types";

const METHODS: PullMethod[] = [
  "rss",
  "ics",
  "html",
  "facebook",
  "original",
  "none",
];

export function SmartAddSource({
  beats,
  compact = false,
}: {
  beats: Beat[];
  compact?: boolean;
}) {
  const router = useRouter();
  const editableBeats = useMemo(
    () => beats.filter((b) => b.slug !== "all"),
    [beats],
  );

  const [url, setUrl] = useState("");
  const [researching, setResearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [research, setResearch] = useState<SourceResearchResult | null>(null);

  const [name, setName] = useState("");
  const [homepage, setHomepage] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [beatId, setBeatId] = useState(editableBeats[0]?.id ?? "beat_general");
  const [pullMethod, setPullMethod] = useState<PullMethod>("html");
  const [enabled, setEnabled] = useState(true);
  const [notes, setNotes] = useState("");

  const duplicate = research?.duplicate_of ?? null;

  function applyResearch(r: SourceResearchResult) {
    setResearch(r);
    // On duplicate, keep existing name/beat; research only proposes wiring.
    if (r.duplicate_of) {
      setName(r.duplicate_of.name);
      setBeatId(r.duplicate_of.beat_id);
    } else {
      setName(r.name);
      setBeatId(r.beat_id);
    }
    setHomepage(r.homepage);
    setFeedUrl(r.feed_url ?? "");
    setPullMethod(r.pull_method);
    setEnabled(r.enabled);
    setNotes(r.notes);
  }

  async function onResearch(e: FormEvent) {
    e.preventDefault();
    setResearching(true);
    setError("");
    setResearch(null);
    try {
      const res = await fetch("/api/desk/sources/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as {
        error?: string;
        research?: SourceResearchResult;
      };
      if (!res.ok || !json.research) {
        throw new Error(json.error || "Research failed");
      }
      applyResearch(json.research);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  }

  function onSkip() {
    setResearch(null);
    setError("");
    setUrl("");
  }

  function payload() {
    return {
      name,
      homepage,
      feed_url: feedUrl || null,
      beat_id: beatId,
      pull_method: pullMethod,
      enabled,
      notes,
    };
  }

  async function onAdd() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/desk/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = (await res.json()) as { error?: string; source?: Source };
      if (!res.ok) throw new Error(json.error || "Could not add source");
      setResearch(null);
      setUrl("");
      router.push(`/desk/sources/${json.source?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add source");
    } finally {
      setSaving(false);
    }
  }

  /** Keep id/name/beat; replace homepage, feed, method, notes (and enabled). */
  async function onUpdateExisting() {
    if (!duplicate) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/desk/sources/${duplicate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: duplicate.name,
          beat_id: duplicate.beat_id,
          homepage,
          feed_url: feedUrl || null,
          pull_method: pullMethod,
          enabled,
          notes,
        }),
      });
      const json = (await res.json()) as { error?: string; source?: Source };
      if (!res.ok) throw new Error(json.error || "Could not update source");
      setResearch(null);
      setUrl("");
      router.push(`/desk/sources/${json.source?.id ?? duplicate.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update source");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "border border-rule bg-white/80 p-4"
          : "border border-rule bg-white/80 p-5"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Smart add
          </p>
          <h2 className="mt-1 font-serif text-xl text-ink">Paste a URL</h2>
          <p className="mt-1 text-sm text-[#444]">
            We research feeds and guess beat/method. You confirm before anything
            is saved.
          </p>
        </div>
      </div>

      <form onSubmit={onResearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.example.com/news"
          required
        />
        <button type="submit" className="btn-teal shrink-0" disabled={researching}>
          {researching ? "Researching…" : "Research"}
        </button>
      </form>

      {error && !research ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : null}

      {research ? (
        <div className="mt-5 border border-rule bg-paper-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold tracking-[0.08em] text-teal uppercase">
                Review before adding
              </p>
              <p className="mt-1 text-sm text-[#444]">
                {research.facebook_post
                  ? "This is a Facebook post, not a source page. Prefer Desk Links (/desk/queue) or Events — Skip unless you really mean to add the page."
                  : duplicate
                    ? "Possible duplicate — Update existing (keep name/beat), Add a second source, or Skip."
                    : "Edit anything below, then Add source — or Skip."}
              </p>
            </div>
            {research.facebook_post ? (
              <span className="source-pill text-red-800">Post, not a source</span>
            ) : duplicate ? (
              <span className="source-pill text-red-800">
                Duplicate? {duplicate.name}
              </span>
            ) : null}
          </div>

          {research.facebook_post ? (
            <p className="mt-3 text-sm text-red-800">
              Facebook post/permalink URLs are not standing sources. Use{" "}
              <a href="/desk/queue" className="underline">
                Desk Links
              </a>{" "}
              or Events. If you need a source, paste the page or group URL
              instead.
            </p>
          ) : null}

          {research.fetch_error ? (
            <p className="mt-3 text-sm text-red-700">
              Fetch issue: {research.fetch_error}. You can still complete this
              manually.
            </p>
          ) : null}

          {(research.findings.length > 0 || research.warnings.length > 0) && (
            <ul className="mt-3 space-y-1 text-sm text-[#333]">
              {research.findings.map((f) => (
                <li key={f}>· {f}</li>
              ))}
              {research.warnings.map((w) => (
                <li key={w} className="text-red-800">
                  · {w}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Name
              </span>
              <input
                className="input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={Boolean(duplicate)}
                title={
                  duplicate
                    ? "Update existing keeps the current name"
                    : undefined
                }
              />
            </label>
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
                disabled={Boolean(duplicate)}
                title={
                  duplicate
                    ? "Update existing keeps the current beat"
                    : undefined
                }
              >
                {editableBeats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Feed URL
              </span>
              <input
                className="input mt-1"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="Leave blank only if truly none"
              />
            </label>
          </div>

          <div className="mt-3">
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

          <div className="mt-3 flex items-center justify-between gap-4 border border-rule bg-white px-3 py-3">
            <div>
              <p className="font-medium">Enabled</p>
              <p className="text-sm text-muted">
                Off keeps the record but never pulls.
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

          <label className="mt-3 block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Notes
            </span>
            <textarea
              className="input mt-1 min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {duplicate ? (
              <button
                type="button"
                className="btn-teal"
                disabled={saving || !homepage.trim()}
                onClick={onUpdateExisting}
              >
                {saving ? "Updating…" : "Update existing source"}
              </button>
            ) : null}
            <button
              type="button"
              className={duplicate ? "btn-ghost" : "btn-teal"}
              disabled={saving || !name.trim() || !homepage.trim()}
              onClick={onAdd}
            >
              {saving && !duplicate ? "Adding…" : "Add source"}
            </button>
            <button type="button" className="btn-ghost" disabled={saving} onClick={onSkip}>
              Skip
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
