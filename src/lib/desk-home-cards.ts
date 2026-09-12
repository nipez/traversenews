/**
 * Desk homepage Around-the-bay card picker helpers. Parallel to the morning
 * letter picker, but capped at BAY_AROUND_MAX and allows sports. Does not
 * invent copy. Multi-site safe (uses shared around mixer + site config).
 */
import { selectAroundTheBay } from "@/lib/around";
import {
  deskLetterMixHint,
  findPastEditionAppearances,
  type DeskLetterCandidate,
  type DeskLetterMixHint,
} from "@/lib/desk-letter-cards";
import {
  BAY_AROUND_MAX,
  letterCardIdentity,
} from "@/lib/email-editions";
import { isRecordEagleCluster } from "@/lib/paywall";
import { clusterStories } from "@/lib/pull/cluster";
import type {
  AppData,
  ClusteredStory,
  EditionStoryCard,
  EmailStoryCard,
} from "@/lib/types";

/** Wide Desk homepage candidate pool (auto bay uses 48 before pick-18). */
export const DESK_HOME_CANDIDATE_POOL = 48;

export { BAY_AROUND_MAX };

export type DeskHomeMixHint = DeskLetterMixHint;

function toAroundCard(cluster: ClusteredStory): EmailStoryCard {
  return {
    title: cluster.title,
    dek: cluster.dek,
    url: cluster.url,
    sources: cluster.sources.map((s) => s.name),
    paywalled: isRecordEagleCluster(cluster),
  };
}

/** EditionStoryCard (stored bay) → picker EmailStoryCard shape. */
export function editionCardToEmailCard(
  card: EditionStoryCard,
): EmailStoryCard {
  return {
    title: card.title,
    dek: card.dek,
    url: card.url,
    sources: card.sources,
  };
}

/** Picker EmailStoryCard → EditionStoryCard for editions.around. */
export function emailCardToEditionCard(
  card: EmailStoryCard,
  published_at?: string,
): EditionStoryCard {
  return {
    title: card.title,
    dek: card.dek,
    url: card.url,
    published_at: published_at ?? new Date().toISOString(),
    sources: card.sources,
    byline: null,
    slug: null,
    is_original: false,
  };
}

export function deskHomeMixHint(
  around: Array<EmailStoryCard | EditionStoryCard>,
): DeskHomeMixHint | null {
  return deskLetterMixHint(
    around.map((card) => ({
      title: card.title,
      dek: card.dek,
      url: card.url,
      sources: card.sources,
      paywalled: "paywalled" in card ? card.paywalled : undefined,
    })),
  );
}

/**
 * Candidate stories for the Desk homepage bay picker: scored hard-news pool
 * (wide, sports allowed) plus any cards already on today’s Around slate.
 */
export function listDeskHomeCandidates(
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
    limit: DESK_HOME_CANDIDATE_POOL,
    maxPerSource: 4,
    maxSports: 6,
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
