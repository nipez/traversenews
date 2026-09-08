/**
 * Format POST /api/pull JSON for Desk flash copy.
 * Keeps UI and SourcePullStatus honest about full-feed counts.
 */

export type PullApiResult = {
  ok?: boolean;
  storiesAdded?: number;
  eventsAdded?: number;
  showsAdded?: number;
  errors?: Array<{ source: string; error: string }>;
  last_pull_at?: string;
  email_date?: string | null;
  edition_date?: string | null;
};

export function formatPullFlash(
  json: PullApiResult | null,
  httpOk: boolean,
): { ok: boolean; text: string } {
  if (!httpOk || !json) {
    return { ok: false, text: "Pull failed. Try again." };
  }

  const stories = Number(json.storiesAdded) || 0;
  const events = Number(json.eventsAdded) || 0;
  const shows = Number(json.showsAdded) || 0;
  const errCount = Array.isArray(json.errors) ? json.errors.length : 0;
  const counts = `${stories} stor${stories === 1 ? "y" : "ies"} · ${events} event${events === 1 ? "" : "s"} · ${shows} show${shows === 1 ? "" : "s"}`;

  if (json.ok === false || errCount > 0) {
    return {
      ok: false,
      text: `Pull finished with ${errCount} source error${errCount === 1 ? "" : "s"}. Landed ${counts}. Locked Around mix and subject stay put.`,
    };
  }

  return {
    ok: true,
    text: `Pull finished — ${counts}. Locked Around mix and subject stay put.`,
  };
}
