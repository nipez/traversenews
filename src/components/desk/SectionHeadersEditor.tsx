"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  SECTION_HEADER_IDS,
  SECTION_HEADER_LABELS,
  type SectionHeaderId,
  type SectionHeaderMeta,
  type SectionHeadersMap,
} from "@/lib/section-headers";

export function SectionHeadersEditor({
  initial,
}: {
  initial: SectionHeadersMap;
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
      <p className="text-sm text-[#444]">
        One photo per public section page. Upload writes to R2 (
        <code className="bg-paper-2 px-1">TRAVERSE_MEDIA</code>
        ); paste URL works without R2. Homepage bay masthead stays{" "}
        <code className="bg-paper-2 px-1">/art/bay-hero.jpg</code> and is not
        here. Empty = type-only header (no cartoon stamp).
      </p>

      {error ? (
        <p className="border border-terracotta/40 bg-peach/40 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {SECTION_HEADER_IDS.map((id) => {
        const label = SECTION_HEADER_LABELS[id];
        const meta = headers[id];
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

            {meta?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.src}
                alt={meta.alt || ""}
                className="mt-4 h-36 w-full object-cover bg-[#123]"
              />
            ) : (
              <div className="mt-4 flex h-36 items-center justify-center border border-dashed border-rule bg-paper-2 text-sm text-muted">
                No photo — type-only header on the public page
              </div>
            )}

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
