"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SendMode = "live" | "preview";

type Props = {
  subject: string;
  /** Auto-built subject from cards (ignore override). */
  autoSubject: string;
  /** Saved Desk override, or empty when falling back to auto. */
  subjectOverride: string;
  alreadySent: boolean;
  alreadyPreviewed: boolean;
  /** Desk label: "Sent subject" after live, else "Today’s subject". */
  subjectLabel?: string;
};

export function DeskLetterSendControls({
  subject,
  autoSubject,
  subjectOverride,
  alreadySent,
  alreadyPreviewed,
  subjectLabel = "Today’s subject",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<SendMode | "save" | "clear" | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [draft, setDraft] = useState(subjectOverride);

  async function send(mode: SendMode) {
    setBusy(mode);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "preview" ? { preview: true } : {}),
      });
      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        already_sent?: boolean;
        already_previewed?: boolean;
        subject?: string;
        recipient_count?: number;
        sent_count?: number;
        failed_count?: number;
        preview?: boolean;
      };
      if (!res.ok) throw new Error(json.error || "Send failed");

      if (json.already_sent) {
        setFlash("Live letter already went out today.");
      } else if (json.already_previewed) {
        setFlash("Preview already hit Nick’s inbox today.");
      } else if (mode === "preview") {
        setFlash(
          `Preview sent${json.subject ? `: ${json.subject}` : ""}.`,
        );
      } else {
        const n =
          typeof json.sent_count === "number"
            ? json.sent_count
            : json.recipient_count;
        setFlash(
          `Live letter sent${typeof n === "number" ? ` to ${n}` : ""}.`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveOverride(clear: boolean) {
    setBusy(clear ? "clear" : "save");
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_override: clear ? null : draft,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        subject_override?: string | null;
        subject?: string;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      const saved =
        typeof json.subject_override === "string" ? json.subject_override : "";
      setDraft(saved);
      setFlash(
        clear || !saved
          ? "Subject override cleared — using auto subject."
          : "Subject override saved.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  const hasOverride = Boolean(subjectOverride.trim());
  const controlsBusy = busy !== null;

  return (
    <section className="mt-8 border border-rule bg-paper-2 px-4 py-5 md:px-5">
      <h2 className="font-display text-lg font-black tracking-tight">
        Morning letter
      </h2>
      <p className="mt-1 text-sm text-[#444]">
        Type today’s subject once, save it, then preview or send live. Pulls
        keep a saved override.
      </p>

      <p className="mt-4 text-sm text-muted">{subjectLabel}</p>
      <p className="mt-1 font-serif text-xl text-ink break-words">{subject}</p>
      {hasOverride ? (
        <p className="mt-1 text-sm text-teal">Using Desk override</p>
      ) : (
        <p className="mt-1 text-sm text-muted">Using auto subject</p>
      )}

      <label className="mt-5 block">
        <span className="text-sm font-extrabold uppercase tracking-wide text-ink">
          Subject override
        </span>
        <textarea
          className="mt-2 min-h-[5.5rem] w-full resize-y border border-ink bg-paper px-3 py-3 text-base text-ink [field-sizing:content] focus:outline-none focus:ring-2 focus:ring-teal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="🗞️ Phrase · Phrase · Phrase"
          rows={3}
          autoComplete="off"
          spellCheck
          disabled={controlsBusy}
        />
      </label>

      <p className="mt-2 text-sm text-muted">
        Auto suggestion
        <button
          type="button"
          className="ml-2 underline disabled:opacity-50"
          disabled={controlsBusy}
          onClick={() => setDraft(autoSubject)}
        >
          Copy into field
        </button>
      </p>
      <p className="mt-1 font-serif text-base text-[#444] break-words">
        {autoSubject}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-teal inline-flex disabled:opacity-50"
          disabled={controlsBusy}
          onClick={() => void saveOverride(false)}
        >
          {busy === "save" ? "Saving…" : "Save subject"}
        </button>
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={controlsBusy || (!hasOverride && !draft.trim())}
          onClick={() => void saveOverride(true)}
        >
          {busy === "clear" ? "Clearing…" : "Clear override"}
        </button>
      </div>

      <p className="mt-5 text-sm text-muted">
        {alreadySent
          ? "Live already sent today."
          : alreadyPreviewed
            ? "Preview already sent · live still open."
            : "Neither preview nor live sent yet today."}
      </p>

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

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-teal inline-flex disabled:opacity-50"
          disabled={controlsBusy || alreadySent}
          onClick={() => void send("live")}
        >
          {busy === "live" ? "Sending…" : "Send live"}
        </button>
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={controlsBusy}
          onClick={() => void send("preview")}
        >
          {busy === "preview" ? "Sending…" : "Send preview"}
        </button>
      </div>
    </section>
  );
}
