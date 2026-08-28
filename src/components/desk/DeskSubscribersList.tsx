"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DeskSubscriberRow = {
  email: string;
  signed_up_label: string;
};

export function DeskSubscribersList({
  subscribers,
}: {
  subscribers: DeskSubscriberRow[];
}) {
  const router = useRouter();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function onDelete(row: DeskSubscriberRow) {
    if (
      !window.confirm(
        `Remove ${row.email} from Morning-scan signups? They will stop getting the letter.`,
      )
    ) {
      return;
    }
    setBusyEmail(row.email);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: row.email }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Remove failed");
      setFlash(json.message || "Removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusyEmail(null);
    }
  }

  if (subscribers.length === 0) {
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
      <div className="overflow-x-auto">
        <table className="desk-table w-full min-w-[420px]">
          <thead>
            <tr>
              <th>Email</th>
              <th>Signed up</th>
              <th className="w-[1%] whitespace-nowrap"> </th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((row) => (
              <tr key={row.email}>
                <td className="font-medium text-ink">{row.email}</td>
                <td className="text-sm text-[#444]">{row.signed_up_label}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busyEmail === row.email}
                    onClick={() => void onDelete(row)}
                  >
                    {busyEmail === row.email ? "Removing…" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
