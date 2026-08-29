"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialGreeting: string;
  defaultGreeting: string;
  saved: boolean;
};

/**
 * Phone-friendly greeting editor on Desk Email. Saves onto today's letter
 * snapshot. Does not send mail.
 */
export function DeskLetterGreetingEditor({
  initialGreeting,
  defaultGreeting,
  saved,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialGreeting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ greeting: value }),
      });
      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        greeting?: string;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      if (typeof json.greeting === "string") setValue(json.greeting);
      setFlash("Greeting saved for today’s letter.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function resetDefault() {
    setValue(defaultGreeting);
    setFlash("");
    setError("");
  }

  return (
    <section className="mt-4 border border-rule bg-paper px-4 py-4 md:px-5">
      <label
        htmlFor="desk-letter-greeting"
        className="block text-sm font-extrabold uppercase tracking-wide text-muted"
      >
        Opening line
      </label>
      <p className="mt-1 text-sm text-[#444]">
        Shows on /email and in the Resend letter.{" "}
        {saved ? "Custom line saved." : "Using the default until you save."}
      </p>
      <textarea
        id="desk-letter-greeting"
        className="input mt-3 min-h-[5.5rem] w-full resize-y text-base leading-relaxed"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={280}
        spellCheck
      />
      {error ? (
        <p className="mt-2 text-sm text-[#a33]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="mt-2 text-sm text-teal" role="status">
          {flash}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-teal inline-flex disabled:opacity-50"
          disabled={busy || !value.trim()}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save greeting"}
        </button>
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={busy || value === defaultGreeting}
          onClick={resetDefault}
        >
          Reset default
        </button>
      </div>
    </section>
  );
}
