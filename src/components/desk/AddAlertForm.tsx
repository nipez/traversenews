"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { alertsSameIncident } from "@/lib/alert-incidents";
import type { Story } from "@/lib/types";

const ALERT_SOURCES = [
  { id: "src_gt911", label: "Grand Traverse 911" },
  { id: "src_ticker_fb", label: "Ticker Facebook" },
] as const;

type AlertSourceId = (typeof ALERT_SOURCES)[number]["id"];

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

type ExistingAlert = Pick<Story, "id" | "title" | "url" | "source_id"> & {
  dek?: string | null;
};

export function AddAlertForm({
  existingAlerts,
}: {
  existingAlerts: ExistingAlert[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [dek, setDek] = useState("");
  const [sourceId, setSourceId] = useState<AlertSourceId>("src_gt911");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    title: string;
    url: string;
    source_id: string;
    reason: "url" | "incident";
  } | null>(null);

  function findLocalDuplicate(rawUrl: string, rawTitle: string, rawDek: string) {
    const key = normalizeUrl(rawUrl);
    if (key) {
      const byUrl = existingAlerts.find((a) => normalizeUrl(a.url) === key);
      if (byUrl) {
        return { ...byUrl, reason: "url" as const };
      }
    }
    const byIncident = existingAlerts.find((a) =>
      alertsSameIncident(
        { title: rawTitle, dek: rawDek, url: rawUrl },
        { title: a.title, dek: a.dek, url: a.url },
      ),
    );
    if (byIncident) {
      return { ...byIncident, reason: "incident" as const };
    }
    return null;
  }

  async function save(confirm: boolean) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/desk/stories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          replace: false,
          confirm,
          stories: [
            {
              title: title.trim(),
              url: url.trim(),
              dek: dek.trim() || undefined,
              source_id: sourceId,
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        needsConfirm?: boolean;
        reason?: "url" | "incident";
        duplicates?: Array<{ title: string; url: string; source_id: string }>;
      };

      if (res.status === 409 && json.needsConfirm && json.duplicates?.[0]) {
        setPendingDuplicate({
          ...json.duplicates[0],
          reason: json.reason === "incident" ? "incident" : "url",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      setPendingDuplicate(null);
      setMessage(json.message || "Saved alert to the strip.");
      setUrl("");
      setTitle("");
      setDek("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    if (!trimmedUrl || !trimmedTitle) {
      setError("URL and title are required. Do not invent either.");
      return;
    }

    const local = findLocalDuplicate(trimmedUrl, trimmedTitle, dek.trim());
    if (local && !pendingDuplicate) {
      setPendingDuplicate({
        title: local.title,
        url: local.url,
        source_id: local.source_id,
        reason: local.reason,
      });
      return;
    }

    await save(Boolean(pendingDuplicate));
  }

  function onSkip() {
    setPendingDuplicate(null);
    setMessage("Skipped — left the existing alert in the strip.");
  }

  return (
    <div className="max-w-xl border border-[#ddd4c4] bg-paper-2 p-4 md:p-5">
      <h2 className="font-serif text-xl text-ink">Add alert</h2>
      <p className="mt-1 text-sm text-muted">
        Paste a Facebook or 911 post you already saw. Saves to the homepage
        Alerts strip only — not Events. Do not invent copy.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            URL
          </span>
          <input
            className="input mt-1 w-full"
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPendingDuplicate(null);
            }}
            placeholder="https://www.facebook.com/…"
            disabled={saving}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Title
          </span>
          <input
            className="input mt-1 w-full"
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setPendingDuplicate(null);
            }}
            placeholder="As posted — do not invent"
            disabled={saving}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Dek <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="text"
            value={dek}
            onChange={(e) => {
              setDek(e.target.value);
              setPendingDuplicate(null);
            }}
            placeholder="Short line from the post"
            disabled={saving}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Source
          </span>
          <select
            className="input mt-1 w-full"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value as AlertSourceId)}
            disabled={saving}
          >
            {ALERT_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {pendingDuplicate ? (
          <div className="border border-[#c9a227]/20 bg-[#fff8e6] px-3 py-2 text-sm text-ink">
            <p className="font-medium">
              {pendingDuplicate.reason === "incident"
                ? "Similar alert already in the Alerts strip"
                : "URL already in the Alerts strip"}
            </p>
            <p className="mt-1 text-muted">
              “{pendingDuplicate.title}”
              {pendingDuplicate.source_id === "src_ticker_fb"
                ? " · Ticker Facebook"
                : " · Grand Traverse 911"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={saving}
                onClick={onSkip}
              >
                Skip
              </button>
              <button
                type="button"
                className="btn-teal"
                disabled={saving}
                onClick={() => void save(true)}
              >
                {saving ? "Saving…" : "Replace"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn-teal" disabled={saving}>
              {saving ? "Saving…" : "Save alert"}
            </button>
          </div>
        )}
      </form>

      {error ? (
        <p className="mt-3 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-teal" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
