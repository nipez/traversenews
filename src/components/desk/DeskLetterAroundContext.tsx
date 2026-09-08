"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  deskLetterMixHint,
  isSameAroundOrder,
  type DeskLetterMixHint,
} from "@/lib/desk-letter-cards";
import type { EmailStoryCard } from "@/lib/types";

type PersistResult = {
  ok: boolean;
  error?: string;
  around?: EmailStoryCard[];
  around_locked?: boolean;
  mix_hint?: DeskLetterMixHint | null;
};

type DeskLetterAroundContextValue = {
  selected: EmailStoryCard[];
  setSelected: React.Dispatch<React.SetStateAction<EmailStoryCard[]>>;
  locked: boolean;
  dirty: boolean;
  mixHint: DeskLetterMixHint | null;
  setMixHint: React.Dispatch<React.SetStateAction<DeskLetterMixHint | null>>;
  /** POST /api/desk/email/cards — lock selection or reset to auto. */
  persistAround: (around: EmailStoryCard[] | null) => Promise<PersistResult>;
  /** After Preview/Send locks via the send route, align baseline with selection. */
  markSynced: (around: EmailStoryCard[], locked: boolean) => void;
};

const DeskLetterAroundContext =
  createContext<DeskLetterAroundContextValue | null>(null);

export function DeskLetterAroundProvider({
  initialAround,
  aroundLocked,
  initialMixHint,
  children,
}: {
  initialAround: EmailStoryCard[];
  aroundLocked: boolean;
  initialMixHint: DeskLetterMixHint | null;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<EmailStoryCard[]>(initialAround);
  const [baseline, setBaseline] = useState<EmailStoryCard[]>(initialAround);
  const [locked, setLocked] = useState(aroundLocked);
  const [mixHint, setMixHint] = useState<DeskLetterMixHint | null>(
    initialMixHint,
  );

  const dirty = !isSameAroundOrder(selected, baseline);

  const markSynced = useCallback(
    (around: EmailStoryCard[], nextLocked: boolean) => {
      setSelected(around);
      setBaseline(around);
      setLocked(nextLocked);
      setMixHint(deskLetterMixHint(around));
    },
    [],
  );

  const persistAround = useCallback(
    async (around: EmailStoryCard[] | null): Promise<PersistResult> => {
      try {
        const res = await fetch("/api/desk/email/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ around }),
        });
        const json = (await res.json()) as {
          error?: string;
          around?: EmailStoryCard[];
          around_locked?: boolean;
          mix_hint?: DeskLetterMixHint | null;
        };
        if (!res.ok) {
          return { ok: false, error: json.error || "Save failed" };
        }
        const nextAround = Array.isArray(json.around) ? json.around : [];
        const nextLocked = Boolean(json.around_locked);
        markSynced(nextAround, nextLocked);
        if (json.mix_hint !== undefined) setMixHint(json.mix_hint ?? null);
        return {
          ok: true,
          around: nextAround,
          around_locked: nextLocked,
          mix_hint: json.mix_hint ?? null,
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Save failed",
        };
      }
    },
    [markSynced],
  );

  const value = useMemo(
    () => ({
      selected,
      setSelected,
      locked,
      dirty,
      mixHint,
      setMixHint,
      persistAround,
      markSynced,
    }),
    [
      selected,
      locked,
      dirty,
      mixHint,
      persistAround,
      markSynced,
    ],
  );

  return (
    <DeskLetterAroundContext.Provider value={value}>
      {children}
    </DeskLetterAroundContext.Provider>
  );
}

export function useDeskLetterAround(): DeskLetterAroundContextValue {
  const ctx = useContext(DeskLetterAroundContext);
  if (!ctx) {
    throw new Error(
      "useDeskLetterAround must be used inside DeskLetterAroundProvider",
    );
  }
  return ctx;
}
