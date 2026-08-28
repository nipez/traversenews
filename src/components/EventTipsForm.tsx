"use client";

import { useState, type FormEvent } from "react";

export function EventTipsForm() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    setMessage("");
    try {
      const res = await fetch("/api/event-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          time: time || undefined,
          place: place.trim() || undefined,
          url: url.trim() || undefined,
          note: note.trim() || undefined,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Could not send");
      setStatus("ok");
      setMessage(
        json.message ||
          "Thanks — we got it. It will not appear on Events until the desk confirms.",
      );
      setTitle("");
      setDate("");
      setTime("");
      setPlace("");
      setUrl("");
      setNote("");
      setName("");
      setEmail("");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="event-tip" className="event-tip-box">
      <h2 className="font-serif text-2xl text-ink">Something missing?</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Concerts, markets, nights out that are not listed. Meetings belong on
        Civic.
      </p>

      {status === "ok" ? (
        <p
          className="mt-4 border border-[#c8ba9a] bg-paper-2 px-4 py-3 text-sm text-teal"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-4 grid max-w-xl gap-3 md:grid-cols-2"
      >
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Title
          </span>
          <input
            className="input mt-1 w-full"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="As listed — do not invent"
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Date
          </span>
          <input
            className="input mt-1 w-full"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Time{" "}
            <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Place{" "}
            <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Official listing URL{" "}
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
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Note{" "}
            <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <textarea
            className="input mt-1 w-full"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
            Your name{" "}
            <span className="normal-case tracking-normal">(optional)</span>
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
            Email{" "}
            <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="btn-teal" disabled={saving}>
            {saving ? "Sending…" : "Send to the desk"}
          </button>
          {status === "err" ? (
            <p className="mt-2 text-sm text-[#a33]" role="alert">
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
