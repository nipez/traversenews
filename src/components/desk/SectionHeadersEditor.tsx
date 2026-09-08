"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  SECTION_HEADER_IDS,
  getSectionHeaderLabels,
  type SectionHeaderId,
  type SectionHeaderMeta,
  type SectionHeadersMap,
} from "@/lib/section-headers";

export function SectionHeadersEditor({
  initial,
  ids = SECTION_HEADER_IDS,
  fallbacks,
  showIntro = true,
}: {
  initial: SectionHeadersMap;
  ids?: readonly SectionHeaderId[];
  /** Preview when Desk has not set a photo (homepage shipped masthead). */
  fallbacks?: Partial<Record<SectionHeaderId, { src: string; alt: string }>>;
  showIntro?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [headers, setHeaders] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<SectionHeaderId, string>>(() => {
    const out = {} as Record<SectionHeaderId, string>;
    for (const id of SECTION_HEADER_IDS) {
      out[id] = headers[id]?.src ?? "";
    }
    return out;
  });
  const [alts, setAlts] = useState<Record<SectionHeaderId, string>>(() => {
    const out = {} as Record<SectionHeaderId, string>;
    for (const id of SECTION_HEADER_IDS) {
      out[id] = headers[id]?.alt ?? "";
    }
    return out;
  });

  function applyHeader(id: SectionHeaderId, meta: SectionHeaderMeta | null) {
    setHeaders((prev) => ({ ...prev, [id]: meta }));
    setUrls((prev) => ({ ...prev, [id]: meta?.src ?? "" }));
    setAlts((prev) => ({ ...prev, [id]: meta?.alt ?? "" }));
  }

  async function saveUrl(id: SectionHeaderId) {
    setError(null);
    const src = urls[id].trim();
    if (!src) {
      setError("Paste a URL or upload a file.");
      return;
    }
    const res = await fetch("/api/desk/section-headers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        src,
        alt: alts[id].trim() || undefined,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      header?: SectionHeaderMeta | null;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? `Save failed (${res.status})`);
      return;
    }
    applyHeader(id, json?.header ?? null);
    startTransition(() => router.refresh());
  }

  async function clearHeader(id: SectionHeaderId) {
    setError(null);
    const res = await fetch("/api/desk/section-headers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, clear: true }),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      header?: SectionHeaderMeta | null;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? `Clear failed (${res.status})`);
      return;
    }
    applyHeader(id, null);
    startTransition(() => router.refresh());
  }

  async function uploadFile(id: SectionHeaderId, file: File | null) {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.set("id", id);
    form.set("file", file);
    if (alts[id].trim()) form.set("alt", alts[id].trim());
    const res = await fetch("/api/desk/section-headers", {
      method: "POST",
      body: form,
    });
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      header?: SectionHeaderMeta | null;
    } | null;
    if (!res.ok) {
      setError(json?.error ?? `Upload failed (${res.status})`);
      return;
    }
    applyHeader(id, json?.header ?? null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      {showIntro ? (
        <p className="text-sm text-[#444]">
          Upload writes to R2 (
          <code className="bg-paper-2 px-1">TRAVERSE_MEDIA</code>
          ). A pasted URL works without R2. Empty interior slots stay type-only
          (no cartoon stamp). Empty Home falls back to the shipped masthead.
        </p>
      ) : null}

      {error ? (
        <p className="border border-terracotta/40 bg-peach/40 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {ids.map((id) => {
        const label = getSectionHeaderLabels()[id];
        const meta = headers[id];
        const fallback = fallbacks?.[id];
        const previewSrc = meta?.src || fallback?.src || "";
        const previewAlt = meta?.alt || fallback?.alt || "";
        return (
          <section
            key={id}
            className="border border-rule bg-white/70 p-4 md:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl text-ink">{label.title}</h2>
              <a
                href={label.path}
                className="text-xs font-semibold tracking-[0.1em] text-teal uppercase hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {label.path} ↗
              </a>
            </div>

            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={previewAlt}
                className="mt-4 h-36 w-full object-cover bg-[#123]"
              />
            ) : (
              <div className="mt-4 flex h-36 items-center justify-center border border-dashed border-rule bg-paper-2 text-sm text-muted">
                {id === "home"
                  ? "No photo — homepage uses the color band"
                  : "No photo — type-only header on the public page"}
              </div>
            )}
            {id === "home" && !meta?.src && fallback?.src ? (
              <p className="mt-2 text-xs text-muted">
                Showing the shipped masthead until you save a replacement.
              </p>
            ) : null}

            <label className="mt-4 block">
              <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Photo URL
              </span>
              <input
                className="input mt-1"
                type="url"
                value={urls[id]}
                onChange={(e) =>
                  setUrls((prev) => ({ ...prev, [id]: e.target.value }))
                }
                placeholder="https://… or /art/…"
                disabled={pending}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Alt text
              </span>
              <input
                className="input mt-1"
                value={alts[id]}
                onChange={(e) =>
                  setAlts((prev) => ({ ...prev, [id]: e.target.value }))
                }
                disabled={pending}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Upload file
              </span>
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void uploadFile(id, file);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-email"
                disabled={pending}
                onClick={() => void saveUrl(id)}
              >
                Save URL
              </button>
              <button
                type="button"
                className="border border-ink px-3 py-2 text-sm font-semibold text-ink hover:bg-paper-2"
                disabled={pending || !meta}
                onClick={() => void clearHeader(id)}
              >
                Clear photo
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
