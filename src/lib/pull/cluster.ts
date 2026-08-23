import type { ClusteredStory, Source, Story } from "@/lib/types";

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sameLink(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.hostname.replace(/^www\./, "") === ub.hostname.replace(/^www\./, "") &&
      ua.pathname.replace(/\/$/, "") === ub.pathname.replace(/\/$/, "");
  } catch {
    return a === b;
  }
}

export function clusterStories(
  stories: Story[],
  sources: Source[],
): ClusteredStory[] {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const originals = stories.filter((s) => s.is_original);
  const aggregated = stories.filter((s) => !s.is_original);

  const clusters: ClusteredStory[] = originals.map((s) => ({
    id: s.id,
    title: s.title,
    dek: s.dek,
    url: s.url,
    published_at: s.published_at,
    sources: [{ id: s.source_id, name: sourceById.get(s.source_id)?.name ?? "traverse.news" }],
    is_original: true,
    byline: s.byline,
    slug: s.slug,
    image_url: s.image_url,
    image_credit: s.image_credit ?? null,
    image_caption: s.image_caption ?? null,
    body: s.body,
  }));

  const used = new Set<string>();

  for (const story of aggregated) {
    if (used.has(story.id)) continue;
    const tokens = tokenize(story.title);
    const members: Story[] = [story];
    used.add(story.id);

    for (const other of aggregated) {
      if (used.has(other.id)) continue;
      const sameTitle =
        story.title.trim().toLowerCase() === other.title.trim().toLowerCase();
      const overlap = jaccard(tokens, tokenize(other.title));
      if (sameTitle || sameLink(story.url, other.url) || overlap >= 0.62) {
        members.push(other);
        used.add(other.id);
      }
    }

    members.sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
    const lead = members[0];
    const pills = members
      .map((m) => ({
        id: m.source_id,
        name: sourceById.get(m.source_id)?.name ?? "Source",
      }))
      .filter(
        (p, i, arr) => arr.findIndex((x) => x.name === p.name) === i,
      );

    clusters.push({
      id: `cluster_${lead.id}`,
      title: lead.title,
      dek: lead.dek,
      url: lead.url,
      published_at: lead.published_at,
      sources: pills,
      is_original: false,
      byline: null,
      slug: null,
      image_url: null,
      body: null,
    });
  }

  return clusters.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}
