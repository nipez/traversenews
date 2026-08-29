"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DeskSubscriberRow = {
  email: string;
  signed_up: string;
  sentToday?: boolean;
};

export function DeskSubscribers({
  items,
  canSendToday = false,
}: {
  items: DeskSubscriberRow[];
  canSendToday?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [sent, setSent] = useState<Record<string, true>>({});

  async function onSendToday(email: string) {
    if (
      !window.confirm(
        `Send today's letter to ${email}? This mails only that address. It does not re-blast the list.`,
      )
    ) {
      return;
    }
    setBusy(`send:${email}`);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/send-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { error?: string; subject?: string };
      if (!res.ok) throw new Error(json.error || "Send failed");
      setSent((prev) => ({ ...prev, [email.toLowerCase()]: true }));
      setFlash(`Sent today's letter to ${email}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(email: string) {
    if (
      !window.confirm(
        `Move ${email} to Unsubscribed? They will stop getting the morning letter.`,
      )
    ) {
      return;
    }
    setBusy(`del:${email}`);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Remove failed");
      setFlash(`Moved ${email} to Unsubscribed.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        No addresses yet. Public signup writes here when someone joins.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {error ? (
        <p className="mb-2 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="mb-2 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
        {items.map((row) => {
          const already =
            Boolean(row.sentToday) || Boolean(sent[row.email.toLowerCase()]);
          return (
            <li key={row.email} className="py-3">
              <p className="font-medium text-ink break-all">{row.email}</p>
              <p className="mt-0.5 text-sm text-[#444]">{row.signed_up}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {already ? (
                  <span className="inline-flex border border-teal bg-teal px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-paper">
                    Sent today
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex border border-ink bg-paper px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-teal disabled:opacity-50"
                    disabled={busy !== null || !canSendToday}
                    title={
                      canSendToday
                        ? "Mail today's letter to this address only"
                        : "No letter captured for today yet"
                    }
                    onClick={() => onSendToday(row.email)}
                  >
                    {busy === `send:${row.email}` ? "Sending…" : "Send today"}
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex border border-[#a33] bg-paper px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#a33] disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => onDelete(row.email)}
                >
                  {busy === `del:${row.email}` ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
