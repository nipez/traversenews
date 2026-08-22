"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EDITORIAL_CHECKLIST } from "@/lib/originals";
import type { OriginalDraft } from "@/lib/types";

export function OriginalDraftEditor({ draft }: { draft: OriginalDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [dek, setDek] = useState(draft.dek);
  const [body, setBody] = useState(draft.body);
  const [section, setSection] = useState(draft.section ?? "");
  const [byline, setByline] = useState(draft.byline);
  const [sourceUrls, setSourceUrls] = useState(draft.source_urls.join("\n"));
  const [status, setStatus] = useState(draft.status);
  const [slug, setSlug] = useState(draft.slug);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function payload() {
    return {
      title,
      dek,
      body,
      section: section.trim() || null,
      byline,
      source_urls: sourceUrls
        .split(/\n+/)
        .map((u) => u.trim())
        .filter(Boolean),
    };
  }

  async function save(e?: FormEvent): Promise<boolean> {
    e?.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/desk/originals/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = (await res.json()) as {
        error?: string;
        draft?: OriginalDraft;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      if (json.draft) {
        setStatus(json.draft.status);
        setSlug(json.draft.slug);
        setBody(json.draft.body);
      }
      setNotice("Saved.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setError("");
    setNotice("");
    const ok = await save();
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/desk/originals/${draft.id}/publish`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: string;
        draft?: OriginalDraft;
      };
      if (!res.ok) throw new Error(json.error || "Publish failed");
      if (json.draft) {
        setStatus(json.draft.status);
        setSlug(json.draft.slug);
      }
      setNotice("Published on the public site as traverse.news reporting.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  async function unpublish() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/desk/originals/${draft.id}/unpublish`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: string;
        draft?: OriginalDraft;
      };
      if (!res.ok) throw new Error(json.error || "Unpublish failed");
      if (json.draft) {
        setStatus(json.draft.status);
        setSlug(json.draft.slug);
      }
      setNotice("Unpublished. Draft is Desk-only again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const ok = await save();
      if (!ok) return;
      const res = await fetch(`/api/desk/originals/${draft.id}/generate`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: string;
        generated?: boolean;
        reason?: string;
        draft?: OriginalDraft;
      };
      if (!res.ok) throw new Error(json.error || "Generate failed");
      if (json.generated && json.draft) {
        setBody(json.draft.body);
        setNotice("Draft body filled from the linked source (model assist). Review hard before publish.");
      } else {
        setNotice(
          json.reason ||
            "No model key configured. Write the body from the linked source yourself.",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this draft? If published, it leaves the public site.")) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/desk/originals/${draft.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Delete failed");
      router.push("/desk/originals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Title
          </span>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Dek
          </span>
          <textarea
            className="input mt-1 min-h-[4.5rem]"
            value={dek}
            onChange={(e) => setDek(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Body
          </span>
          <textarea
            className="input mt-1 min-h-[18rem] font-serif text-[1.05rem] leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write from the linked source only. No invented quotes or facts."
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Source permalinks (one per line)
          </span>
          <textarea
            className="input mt-1 min-h-[5rem] font-mono text-sm"
            value={sourceUrls}
            onChange={(e) => setSourceUrls(e.target.value)}
            required
          />
        </label>
        {(draft.source_title || draft.source_dek) && (
          <div className="border border-rule bg-paper-2 p-3 text-sm text-[#333]">
            <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Facts you may use (from the pulled item)
            </p>
            {draft.source_title ? (
              <p className="mt-2 font-medium">{draft.source_title}</p>
            ) : null}
            {draft.source_dek ? (
              <p className="mt-1 text-[#444]">{draft.source_dek}</p>
            ) : null}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="border border-rule bg-white/70 p-4">
          <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Status
          </p>
          <p className="mt-2 font-serif text-xl capitalize">{status}</p>
          {status === "published" && slug ? (
            <Link
              href={`/story/${slug}`}
              className="mt-2 inline-block text-sm text-teal"
              target="_blank"
            >
              View live ↗
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Drafts never appear on the public site.
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Section / kicker
          </span>
          <input
            className="input mt-1"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Schools"
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Byline
          </span>
          <input
            className="input mt-1"
            value={byline}
            onChange={(e) => setByline(e.target.value)}
          />
        </label>

        <div className="border border-rule bg-paper-2 p-4">
          <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
            Before publish
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[#333]">
            {EDITORIAL_CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-teal">{notice}</p> : null}

        <div className="flex flex-col gap-2">
          <button type="submit" className="btn-teal" disabled={saving}>
            {saving ? "Working…" : "Save draft"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={generating || saving}
            onClick={generate}
          >
            {generating ? "Generating…" : "Generate from source (optional)"}
          </button>
          {status === "published" ? (
            <button
              type="button"
              className="btn-ghost"
              disabled={saving}
              onClick={unpublish}
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost bg-ink text-white"
              disabled={saving}
              onClick={publish}
            >
              Publish
            </button>
          )}
          <button
            type="button"
            className="text-left text-sm text-red-700"
            disabled={saving}
            onClick={remove}
          >
            Delete
          </button>
        </div>
      </aside>
    </form>
  );
}
