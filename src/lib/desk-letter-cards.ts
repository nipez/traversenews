/**
 * Desk morning-letter card picker helpers: candidate pool, past-edition flags,
 * and advisory outlet-mix hints. Does not send mail or invent copy.
 */
import { EYES_ONLY_SOURCE_IDS, selectAroundTheBay } from "@/lib/around";
import {
  LETTER_AROUND_MAX,
  letterCardIdentity,
  titlesLikelySameStory,
} from "@/lib/email-editions";
import { isRecordEagleCluster, isRecordEagleName } from "@/lib/paywall";
import { clusterStories } from "@/lib/pull/cluster";
import type {
  AppData,
  ClusteredStory,
  EditionSnapshot,
  EmailEditionSnapshot,
  EmailStoryCard,
} from "@/lib/types";

/** Wide Desk candidate pool (letter auto uses 24 before pick-6). */
export const DESK_LETTER_CANDIDATE_POOL = 36;

export type LetterCardPastRun = {
  date: string;
  /** Morning letter archive vs homepage / dated edition bay. */
  kind: "letter" | "homepage";
};

export type DeskLetterCandidate = {
  card: EmailStoryCard;
  identity: string;
  source_ids: string[];
  past_runs: LetterCardPastRun[];
  /** Already on today’s stored Around slate. */
  in_current: boolean;
};

export type DeskLetterMixHint = {
  kind: "outlet_majority" | "eyes_only_heavy" | "record_eagle_heavy";
  message: string;
};

const EYES_ONLY_NAME =
  /\bticker\b|northern\s*express|\btcbn\b|tc\s*business|traverse\s*city\s*business/i;
const NINE_TEN_NAME = /9\s*&\s*10|9and10/i;

function toAroundCard(cluster: ClusteredStory): EmailStoryCard {
  return {
    title: cluster.title,
    dek: cluster.dek,
    url: cluster.url,
    sources: cluster.sources.map((s) => s.name),
    paywalled: isRecordEagleCluster(cluster),
  };
}

/** Mirror email-letter toddler/pond/Acme same-incident signals for Desk flags. */
function toddlerIncidentSignals(text: string): {
  toddler: boolean;
  acme: boolean;
  pond: boolean;
  hospital: boolean;
} {
  const t = text.toLowerCase();
  return {
    toddler:
      /1[- ]?year[- ]?old|one[- ]?year[- ]?old|toddler|infant|\bbaby\b/.test(t),
    acme: /\bacme\b/.test(t),
    pond: /\bpond\b/.test(t),
    hospital: /hospitaliz|injur/.test(t),
  };
}

function looksLikeSameToddlerIncident(a: string, b: string): boolean {
  const sa = toddlerIncidentSignals(a);
  const sb = toddlerIncidentSignals(b);
  if (!sa.toddler || !sb.toddler) return false;
  if (sa.acme && sb.acme) return true;
  if (sa.pond && sb.pond) return true;
  if (sa.hospital && sb.hospital) return true;
  if (
    (sa.acme || sb.acme) &&
    (sa.pond || sb.pond || sa.hospital || sb.hospital)
  ) {
    return true;
  }
  return false;
}

/** Same-story match: URL identity, exact letter identity, or title rewrite. */
export function cardMatchesPrior(
  item: { title: string; url?: string | null },
  prior: { title: string; url?: string | null },
): boolean {
  if (item.url && prior.url) {
    const a = letterCardIdentity({ title: item.title || "x", url: item.url });
    const b = letterCardIdentity({ title: prior.title || "x", url: prior.url });
    if (a.startsWith("url:") && a === b) return true;
  }
  const idA = letterCardIdentity(item);
  const idB = letterCardIdentity(prior);
  if (idA && idB && idA === idB) return true;
  if (item.title && prior.title) {
    if (titlesLikelySameStory(item.title, prior.title)) return true;
    if (looksLikeSameToddlerIncident(item.title, prior.title)) return true;
  }
  return false;
}

/**
 * Dates where this story (URL / title / same-story rewrite) already ran on a
 * recent morning letter or homepage edition bay.
 */
export function findPastEditionAppearances(
  item: { title: string; url?: string | null },
  options: {
    email_editions?: EmailEditionSnapshot[] | null;
    editions?: EditionSnapshot[] | null;
    /** Exclude today’s Detroit date from flags. */
    today?: string;
  },
): LetterCardPastRun[] {
  const today = options.today ?? "";
  const runs: LetterCardPastRun[] = [];
  const seen = new Set<string>();

  const push = (date: string, kind: LetterCardPastRun["kind"]) => {
    if (!date || date === today) return;
    const key = `${kind}:${date}`;
    if (seen.has(key)) return;
    seen.add(key);
    runs.push({ date, kind });
  };

  for (const letter of options.email_editions ?? []) {
    if (letter.lead && cardMatchesPrior(item, letter.lead)) {
      push(letter.date, "letter");
      continue;
    }
    for (const card of letter.around ?? []) {
      if (cardMatchesPrior(item, card)) {
        push(letter.date, "letter");
        break;
      }
    }
  }

  for (const edition of options.editions ?? []) {
    if (edition.lead && cardMatchesPrior(item, edition.lead)) {
      push(edition.date, "homepage");
      continue;
    }
    for (const card of edition.around ?? []) {
      if (cardMatchesPrior(item, card)) {
        push(edition.date, "homepage");
        break;
      }
    }
  }

  runs.sort((a, b) => b.date.localeCompare(a.date));
  return runs;
}

/** Short Desk label: "ran Sep 3 letter" / "ran Aug 31 homepage". */
export function formatPastRunFlag(run: LetterCardPastRun): string {
  const [y, m, d] = run.date.split("-").map(Number);
  const label =
    y && m && d
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Detroit",
          month: "short",
          day: "numeric",
        }).format(new Date(Date.UTC(y, m - 1, d, 17, 0, 0)))
      : run.date;
  return run.kind === "letter" ? `ran ${label} letter` : `ran ${label} homepage`;
}

function primaryOutletName(card: EmailStoryCard): string {
  return (card.sources[0] ?? "").trim();
}

function isEyesOnlyCard(card: EmailStoryCard, sourceIds: string[] = []): boolean {
  if (sourceIds.some((id) => EYES_ONLY_SOURCE_IDS.has(id))) return true;
  return card.sources.some((name) => EYES_ONLY_NAME.test(name));
}

function isNineTenCard(card: EmailStoryCard, sourceIds: string[] = []): boolean {
  if (sourceIds.some((id) => id === "src_910" || id === "src_910_sports")) {
    return true;
  }
  return card.sources.some((name) => NINE_TEN_NAME.test(name));
}

function isRecordEagleCard(card: EmailStoryCard): boolean {
  if (card.paywalled) return true;
  return card.sources.some((name) => isRecordEagleName(name));
}

/**
 * Advisory mix hint when today’s Around slate leans too hard on one outlet
 * or the Eyes Only family. Never blocks send.
 */
export function deskLetterMixHint(
  around: EmailStoryCard[],
  sourceIdsByIdentity?: Map<string, string[]>,
): DeskLetterMixHint | null {
  if (around.length < 3) return null;

  const idsFor = (card: EmailStoryCard) =>
    sourceIdsByIdentity?.get(letterCardIdentity(card)) ?? [];

  let eyes = 0;
  let nineTen = 0;
  let re = 0;
  const outletCounts = new Map<string, number>();

  for (const card of around) {
    const ids = idsFor(card);
    if (isEyesOnlyCard(card, ids)) eyes += 1;
    if (isNineTenCard(card, ids)) nineTen += 1;
    if (isRecordEagleCard(card)) re += 1;
    const outlet = primaryOutletName(card) || "Unknown";
    outletCounts.set(outlet, (outletCounts.get(outlet) ?? 0) + 1);
  }

  let topOutlet = "";
  let topCount = 0;
  for (const [name, count] of outletCounts) {
    if (count > topCount) {
      topOutlet = name;
      topCount = count;
    }
  }

  const majority = topCount >= Math.ceil(around.length * 0.5) && topCount >= 3;
  if (majority && NINE_TEN_NAME.test(topOutlet)) {
    return {
      kind: "outlet_majority",
      message: `Mix hint: ${topCount} of ${around.length} cards are 9&10 — letter may feel wire-heavy.`,
    };
  }
  if (majority) {
    return {
      kind: "outlet_majority",
      message: `Mix hint: ${topCount} of ${around.length} cards are ${topOutlet}.`,
    };
  }

  if (eyes >= 3 || (eyes >= 2 && eyes / around.length >= 0.5)) {
    return {
      kind: "eyes_only_heavy",
      message: `Mix hint: ${eyes} Eyes Only Media cards (Ticker / Northern Express / TCBN).`,
    };
  }

  if (nineTen >= 3) {
    return {
      kind: "outlet_majority",
      message: `Mix hint: ${nineTen} of ${around.length} cards are 9&10.`,
    };
  }

  if (re >= 3) {
    return {
      kind: "record_eagle_heavy",
      message: `Mix hint: ${re} Record-Eagle cards (paywall cap is usually 2).`,
    };
  }

  return null;
}

/**
 * Candidate stories for the Desk letter picker: scored bay pool (wide) plus
 * any cards already on today’s Around slate. Past runs are flagged, not
 * hard-excluded — Nick still decides.
 */
export function listDeskLetterCandidates(
  data: AppData,
  options: {
    currentAround?: EmailStoryCard[];
    today?: string;
    at?: Date;
  } = {},
): DeskLetterCandidate[] {
  const at = options.at ?? new Date();
  const currentAround = options.currentAround ?? [];
  const currentIds = new Set(
    currentAround.map((c) => letterCardIdentity(c)).filter(Boolean),
  );

  const clusters = clusterStories(data.stories, data.sources).filter(
    (c) => !c.is_original,
  );
  const scored = selectAroundTheBay(clusters, {
    limit: DESK_LETTER_CANDIDATE_POOL,
    maxPerSource: 4,
    maxSports: 0,
    maxRecordEagle: 4,
    maxHeavyWire: 6,
    maxEyesOnly: 6,
    preferHardNews: true,
    now: at,
  });

  const byIdentity = new Map<string, DeskLetterCandidate>();

  const addCluster = (cluster: ClusteredStory) => {
    const card = toAroundCard(cluster);
    const identity = letterCardIdentity(card);
    if (!identity || identity === "url:" || identity === "title:") return;
    if (byIdentity.has(identity)) return;
    byIdentity.set(identity, {
      card,
      identity,
      source_ids: cluster.sources.map((s) => s.id),
      past_runs: findPastEditionAppearances(card, {
        email_editions: data.email_editions,
        editions: data.editions,
        today: options.today,
      }),
      in_current: currentIds.has(identity),
    });
  };

  for (const cluster of scored) addCluster(cluster);

  // Keep current selection visible even if it fell out of today’s scored pool.
  for (const card of currentAround) {
    const identity = letterCardIdentity(card);
    if (!identity || byIdentity.has(identity)) {
      const existing = byIdentity.get(identity);
      if (existing) existing.in_current = true;
      continue;
    }
    const match = clusters.find((c) => letterCardIdentity(c) === identity);
    if (match) {
      addCluster(match);
      const row = byIdentity.get(identity);
      if (row) row.in_current = true;
      continue;
    }
    byIdentity.set(identity, {
      card,
      identity,
      source_ids: [],
      past_runs: findPastEditionAppearances(card, {
        email_editions: data.email_editions,
        editions: data.editions,
        today: options.today,
      }),
      in_current: true,
    });
  }

  const rows = [...byIdentity.values()];
  rows.sort((a, b) => {
    if (a.in_current !== b.in_current) return a.in_current ? -1 : 1;
    if (Boolean(a.past_runs.length) !== Boolean(b.past_runs.length)) {
      return a.past_runs.length ? 1 : -1;
    }
    return a.card.title.localeCompare(b.card.title);
  });
  return rows;
}

/** Normalize Desk POST body into at most LETTER_AROUND_MAX story cards. */
export function normalizeDeskAroundSelection(
  input: unknown,
): { ok: true; around: EmailStoryCard[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "around must be an array of story cards." };
  }
  if (input.length > LETTER_AROUND_MAX) {
    return {
      ok: false,
      error: `Around the bay is capped at ${LETTER_AROUND_MAX} cards.`,
    };
  }
  const around: EmailStoryCard[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Each around card must be an object." };
    }
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!title || !url) {
      return { ok: false, error: "Each card needs a title and url." };
    }
    const dek = typeof row.dek === "string" ? row.dek : "";
    const sources = Array.isArray(row.sources)
      ? row.sources.filter((s): s is string => typeof s === "string")
      : [];
    const card: EmailStoryCard = {
      title,
      dek,
      url,
      sources,
    };
    if (row.paywalled === true) card.paywalled = true;
    if (row.desk_original === true) card.desk_original = true;
    const id = letterCardIdentity(card);
    if (seen.has(id)) continue;
    seen.add(id);
    around.push(card);
  }
  return { ok: true, around };
}
