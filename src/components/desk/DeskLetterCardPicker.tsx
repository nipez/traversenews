"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  DeskLetterCandidate,
  DeskLetterMixHint,
  LetterCardPastRun,
} from "@/lib/desk-letter-cards";
import type { EmailStoryCard } from "@/lib/types";

type Props = {
  max: number;
  initialAround: EmailStoryCard[];
  aroundLocked: boolean;
  candidates: DeskLetterCandidate[];
  initialMixHint: DeskLetterMixHint | null;
};

/** Client-safe identity (mirrors letterCardIdentity — URL else title). */
function cardIdentity(item: { title: string; url?: string | null }): string {
  const raw = (item.url || "").trim();
  if (raw) {
    try {
      const u = new URL(raw);
      u.hash = "";
      const path = u.pathname.replace(/\/+$/, "") || "/";
      return `url:${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase();
    } catch {
      return `url:${raw.replace(/\/+$/, "").toLowerCase()}`;
    }
  }
  const title = item.title
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `title:${title}`;
}

function pastFlags(runs: LetterCardPastRun[]): string {
  return runs
    .slice(0, 3)
    .map((run) => {
      const [y, m, d] = run.date.split("-").map(Number);
      const label =
        y && m && d
          ? new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Detroit",
              month: "short",
              day: "numeric",
            }).format(new Date(Date.UTC(y, m - 1, d, 17, 0, 0)))
          : run.date;
      return run.kind === "letter"
        ? `ran ${label} letter`
        : `ran ${label} homepage`;
    })
    .join(" · ");
}

export function DeskLetterCardPicker({
  max,
  initialAround,
  aroundLocked,
  candidates,
  initialMixHint,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<EmailStoryCard[]>(initialAround);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [mixHint, setMixHint] = useState<DeskLetterMixHint | null>(
    initialMixHint,
  );
  const [locked, setLocked] = useState(aroundLocked);
  const [q, setQ] = useState("");

  const selectedIds = useMemo(
    () => new Set(selected.map((c) => cardIdentity(c))),
    [selected],
  );

  const liveHint = useMemo(() => {
    // Client-side mirror of deskLetterMixHint for immediate feedback while editing.
    if (selected.length < 3) return null;
    const outletCounts = new Map<string, number>();
    let eyes = 0;
    let nineTen = 0;
    let re = 0;
    const eyesRe =
      /\bticker\b|northern\s*express|\btcbn\b|tc\s*business|traverse\s*city\s*business/i;
    const nineRe = /9\s*&\s*10|9and10/i;
    const reRe = /record-eagle/i;
    for (const card of selected) {
      const outlet = (card.sources[0] ?? "Unknown").trim() || "Unknown";
      outletCounts.set(outlet, (outletCounts.get(outlet) ?? 0) + 1);
      if (card.sources.some((n) => eyesRe.test(n))) eyes += 1;
      if (card.sources.some((n) => nineRe.test(n))) nineTen += 1;
      if (card.paywalled || card.sources.some((n) => reRe.test(n))) re += 1;
    }
    let topOutlet = "";
    let topCount = 0;
    for (const [name, count] of outletCounts) {
      if (count > topCount) {
        topOutlet = name;
        topCount = count;
      }
    }
    if (topCount >= Math.ceil(selected.length * 0.5) && topCount >= 3) {
      return `Mix hint: ${topCount} of ${selected.length} cards are ${topOutlet}.`;
    }
    if (eyes >= 3 || (eyes >= 2 && eyes / selected.length >= 0.5)) {
      return `Mix hint: ${eyes} Eyes Only Media cards (Ticker / Northern Express / TCBN).`;
    }
    if (nineTen >= 3) {
      return `Mix hint: ${nineTen} of ${selected.length} cards are 9&10.`;
    }
    if (re >= 3) {
      return `Mix hint: ${re} Record-Eagle cards (paywall cap is usually 2).`;
    }
    return mixHint?.message ?? null;
  }, [selected, mixHint]);

  const filteredCandidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool = candidates.filter((c) => !selectedIds.has(c.identity));
    if (!needle) return pool;
    return pool.filter(
      (c) =>
        c.card.title.toLowerCase().includes(needle) ||
        c.card.dek.toLowerCase().includes(needle) ||
        c.card.sources.some((s) => s.toLowerCase().includes(needle)),
    );
  }, [candidates, q, selectedIds]);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= selected.length) return;
    setSelected((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  }

  function removeAt(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  }

  function addCard(card: EmailStoryCard) {
    setSelected((prev) => {
      if (prev.length >= max) return prev;
      const id = cardIdentity(card);
      if (prev.some((c) => cardIdentity(c) === id)) return prev;
      return [...prev, card];
    });
  }

  async function save(reset: boolean) {
    setBusy(reset ? "reset" : "save");
    setError("");
    setFlash("");
    try {
      const res = await fetch("/api/desk/email/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ around: reset ? null : selected }),
      });
      const json = (await res.json()) as {
        error?: string;
        around?: EmailStoryCard[];
        around_locked?: boolean;
        mix_hint?: DeskLetterMixHint | null;
        subject_override?: string | null;
      };
      if (!res.ok) throw new Error(json.error || "Save failed");
      const nextAround = Array.isArray(json.around) ? json.around : [];
      setSelected(nextAround);
      setLocked(Boolean(json.around_locked));
      setMixHint(json.mix_hint ?? null);
      setFlash(
        reset
          ? "Around reset to auto mix. Subject override kept."
          : `Around saved (${nextAround.length} cards). Preview/send use this slate.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  const controlsBusy = busy !== null;

  return (
    <section className="mt-8 border border-rule bg-paper-2 px-4 py-5 md:px-5">
      <h2 className="font-display text-lg font-black tracking-tight">
        Around the bay
      </h2>
      <p className="mt-1 text-sm text-[#444]">
        Pick up to {max} cards for today&apos;s morning letter. Flags show
        recent letter or homepage runs. Save locks the mix for preview and
        send — pulls keep it until you reset to auto.
      </p>

      <p className="mt-3 text-sm text-muted">
        {locked ? "Desk mix locked" : "Using auto mix (or unsaved edits)"}
        {" · "}
        {selected.length}/{max} selected
      </p>

      {liveHint ? (
        <p className="mt-3 text-sm text-[#8a5a00]" role="status">
          {liveHint}
        </p>
      ) : null}

      <ol className="mt-5 divide-y divide-[var(--rule)] border border-rule bg-paper">
        {selected.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted">
            No cards yet. Add from the candidate list below.
          </li>
        ) : (
          selected.map((card, index) => {
            const identity = cardIdentity(card);
            const past =
              candidates.find((c) => c.identity === identity)?.past_runs ?? [];
            return (
              <li
                key={identity || `${card.url}-${index}`}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-snug text-ink">
                    <span className="mr-2 text-sm font-sans text-muted">
                      {index + 1}.
                    </span>
                    {card.title}
                  </p>
                  {card.dek ? (
                    <p className="mt-1 text-sm text-[#444] line-clamp-2">
                      {card.dek}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    {card.sources.join(" · ") || "Unknown outlet"}
                    {card.paywalled ? " · paywalled" : ""}
                  </p>
                  {past.length ? (
                    <p className="mt-1 text-sm text-[#a33]">{pastFlags(past)}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <button
                    type="button"
                    className="border border-ink bg-paper px-3 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-40"
                    disabled={controlsBusy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="border border-ink bg-paper px-3 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-40"
                    disabled={controlsBusy || index === selected.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="border border-ink bg-paper px-3 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-40"
                    disabled={controlsBusy}
                    onClick={() => removeAt(index)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ol>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-teal inline-flex disabled:opacity-50"
          disabled={controlsBusy}
          onClick={() => void save(false)}
        >
          {busy === "save" ? "Saving…" : "Save mix"}
        </button>
        <button
          type="button"
          className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
          disabled={controlsBusy}
          onClick={() => void save(true)}
        >
          {busy === "reset" ? "Resetting…" : "Reset to auto"}
        </button>
      </div>

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

      <h3 className="mt-8 font-display text-base font-black tracking-tight">
        Candidates
      </h3>
      <label className="mt-2 block">
        <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          Search pulled stories
        </span>
        <input
          className="input mt-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, dek, or outlet"
          disabled={controlsBusy}
        />
      </label>

      <ul className="mt-4 max-h-[28rem] overflow-y-auto border border-rule bg-paper">
        {filteredCandidates.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted">
            {candidates.length === 0
              ? "No pulled stories yet. Run a pull, then come back."
              : "No matching candidates left to add."}
          </li>
        ) : (
          filteredCandidates.map((row) => (
            <li
              key={row.identity}
              className="border-t border-rule first:border-t-0"
            >
              <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-snug text-ink">
                    {row.card.title}
                  </p>
                  {row.card.dek ? (
                    <p className="mt-1 text-sm text-[#444] line-clamp-2">
                      {row.card.dek}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    {row.card.sources.join(" · ") || "Unknown outlet"}
                    {row.card.paywalled ? " · paywalled" : ""}
                  </p>
                  {row.past_runs.length ? (
                    <p className="mt-1 text-sm text-[#a33]">
                      {pastFlags(row.past_runs)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Not in recent letters</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-teal inline-flex shrink-0 disabled:opacity-50"
                  disabled={controlsBusy || selected.length >= max}
                  onClick={() => addCard(row.card)}
                >
                  Add
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
