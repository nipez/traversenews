"use client";

import { useState, type FormEvent } from "react";

export function MorningScanSignup({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "box" | "inline" | "teal" | "page";
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

  if (variant === "page") {
    return (
      <section id="signup" className="email-join">
        <form onSubmit={onSubmit} className="email-join-form">
          <input
            className="input"
            type="email"
            required
            placeholder="Your email"
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
        ) : null}
      </section>
    );
  }

  if (variant === "teal") {
    return (
      <section id="signup" className="signup-teal">
        <h2 className="font-display text-lg font-black tracking-tight">
          The morning scan
        </h2>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          The whole town in one email — weekdays and Saturdays.
        </p>
        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            className="input"
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <button
            type="submit"
            className="shrink-0 border border-ink bg-paper px-3 text-sm font-extrabold text-ink uppercase"
          >
            Join
          </button>
        </form>
        {status !== "idle" ? (
          <p className="mt-2 text-sm opacity-90">{message}</p>
        ) : null}
      </section>
    );
  }

  const wrap =
    variant === "box"
      ? "border border-ink bg-paper-2 p-4"
      : variant === "inline"
        ? ""
        : "border border-ink p-4";

  return (
    <section id="signup" className={wrap}>
      <h2 className="font-display text-xl font-black tracking-tight text-ink">
        The morning scan
      </h2>
      <p className="mt-2 font-serif text-sm leading-relaxed text-muted-2">
        Everything above, in one email, before you go out. Weekday mornings and
        Saturdays.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          className="input"
          type="email"
          required
          placeholder="Your email"
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
          <a href="/email" className="font-bold text-teal underline-offset-2 hover:underline">
            See yesterday&apos;s
          </a>
        </p>
      )}
    </section>
  );
}
