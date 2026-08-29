"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SendMode = "live" | "preview";

type Props = {
  subject: string;
  alreadySent: boolean;
  alreadyPreviewed: boolean;
  /** Desk label: "Sent subject" after live, else "Today’s subject". */
  subjectLabel?: string;
};

export function DeskLetterSendControls({
  subject,
  alreadySent,
  alreadyPreviewed,
  subjectLabel = "Today’s subject",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<SendMode | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

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

  return (
    <section className="mt-8 border border-rule bg-paper-2 px-4 py-5 md:px-5">
      <h2 className="font-display text-lg font-black tracking-tight">
        Morning letter
      </h2>
      <p className="mt-1 text-sm text-[#444]">
        8am preview hits Nick’s inbox. Send live when the subject looks right.
      </p>

      <p className="mt-4 text-sm text-muted">{subjectLabel}</p>
      <p className="mt-1 font-serif text-xl text-ink">{subject}</p>

      <p className="mt-3 text-sm text-muted">
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
          disabled={busy !== null || alreadySent}
          onClick={() => void send("live")}
        >
          {busy === "live" ? "Sending…" : "Send live"}
        </button>
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => void send("preview")}
        >
          {busy === "preview" ? "Sending…" : "Send preview"}
        </button>
      </div>
    </section>
  );
}
