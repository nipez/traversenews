"use client";

import { useState, type FormEvent } from "react";

export function UnsubscribeForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        email?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not unsubscribe");
      setStatus("ok");
      setMessage(
        json.email
          ? `You're off the morning letter list for ${json.email}.`
          : "You're off the morning letter list.",
      );
      setEmail("");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "ok") {
    return (
      <div>
        <p className="max-w-xl font-serif text-base leading-relaxed text-muted-2 md:text-lg">
          {message}
        </p>
        <p className="mt-4 text-sm text-muted">
          If that address was never on the list, nothing else changed.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-0 max-w-xl text-sm text-muted md:text-base">
        Enter the address on the morning letter. One step. No confirmation
        email.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-wrap gap-2">
        <input
          className="input min-w-[14rem] flex-1"
          type="email"
          name="email"
          required
          placeholder="Your email"
          aria-label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-teal shrink-0">
          Opt out
        </button>
      </form>
      {status === "err" ? (
        <p className="mt-3 text-sm text-red-700">{message}</p>
      ) : null}
    </div>
  );
}
