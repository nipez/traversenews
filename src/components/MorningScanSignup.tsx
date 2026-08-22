"use client";

import { useState, type FormEvent } from "react";

export function MorningScanSignup({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "box" | "inline";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not subscribe");
      setStatus("ok");
      setMessage("You're on the list.");
      setEmail("");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const wrap =
    variant === "box"
      ? "border border-rule bg-paper-2 p-4"
      : variant === "inline"
        ? ""
        : "";

  return (
    <section id="signup" className={wrap}>
      <h2 className="font-serif text-xl text-ink">The morning scan</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#444]">
        Everything above, in one email, before you go out. Weekday mornings and
        Saturdays.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          className="input"
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        <button type="submit" className="btn-teal shrink-0">
          Join
        </button>
      </form>
      {status !== "idle" ? (
        <p
          className={`mt-2 text-sm ${status === "ok" ? "text-teal" : "text-red-700"}`}
        >
          {message}
        </p>
      ) : (
        <p className="mt-2 text-sm">
          <a href="/email" className="text-teal underline-offset-2 hover:underline">
            See yesterday&apos;s
          </a>
        </p>
      )}
    </section>
  );
}
