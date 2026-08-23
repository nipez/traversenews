"use client";

import { useState, type FormEvent } from "react";

export function TipsForm({
  variant = "page",
}: {
  /** page = full /tips form; rail = About/story rail card */
  variant?: "page" | "rail";
}) {
  const [tip, setTip] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    setMessage("");
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: tip,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          url: variant === "page" && url.trim() ? url.trim() : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Could not send tip");
      setStatus("ok");
      setMessage(json.message || "Got it. We read these.");
      setTip("");
      setName("");
      setEmail("");
      setUrl("");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (variant === "rail") {
    return (
      <div>
        <p className="about-rail-kicker">Tips</p>
        <p className="about-rail-copy">Corrections and things we missed.</p>
        {status === "ok" ? (
          <p className="mt-3 text-sm text-teal" role="status">
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-3 space-y-2">
            <label className="block">
              <span className="sr-only">Tip</span>
              <textarea
                className="input w-full"
                rows={4}
                required
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="What should we know?"
                disabled={saving}
              />
            </label>
            <input
              className="input w-full"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              disabled={saving}
            />
            <input
              className="input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              disabled={saving}
            />
            <button type="submit" className="btn-teal" disabled={saving}>
              {saving ? "Sending…" : "Submit"}
            </button>
            {status === "err" ? (
              <p className="text-sm text-[#a33]" role="alert">
                {message}
              </p>
            ) : null}
          </form>
        )}
        <p className="mt-3 text-xs text-muted">
          or{" "}
          <a href="mailto:tips@traverse.news" className="underline-offset-2 hover:underline">
            tips@traverse.news
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      {status === "ok" ? (
        <p className="border border-[#c8ba9a] bg-paper-2 px-4 py-3 text-sm text-teal" role="status">
          {message}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Tip
          </span>
          <textarea
            className="input mt-1 w-full"
            rows={6}
            required
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="Corrections, things we missed, a lead…"
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Name <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Email <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Source URL{" "}
            <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            disabled={saving}
          />
        </label>
        <button type="submit" className="btn-teal" disabled={saving}>
          {saving ? "Sending…" : "Send tip"}
        </button>
        {status === "err" ? (
          <p className="text-sm text-[#a33]" role="alert">
            {message}
          </p>
        ) : null}
      </form>

      <p className="mt-4 text-sm text-muted">
        or{" "}
        <a
          href="mailto:tips@traverse.news"
          className="underline-offset-2 hover:underline"
        >
          tips@traverse.news
        </a>
      </p>
    </div>
  );
}
