/**
 * Fail-closed mode resolution for POST /api/desk/email/send.
 *
 * Incident 2026-09-22: empty `{}` defaulted to live (`preview` missing → false)
 * and blasted ~71 subscribers. Ambiguous bodies must never send.
 */

export type DeskLetterSendMode = "preview" | "live";

export type ResolveDeskLetterSendModeResult =
  | { ok: true; mode: DeskLetterSendMode }
  | { ok: false; error: string };

const MODE_REQUIRED_ERROR =
  'POST /api/desk/email/send requires an explicit mode: { "preview": true } or { "live": true, "preview": false } (or mode: "preview"|"live"). Empty or ambiguous bodies are rejected.';

const MODE_AMBIGUOUS_ERROR =
  "Ambiguous send mode. Use only one of preview or live (preview: true, or live: true with preview: false, or mode: \"preview\"|\"live\").";

function normalizeModeField(raw: unknown): "preview" | "live" | "invalid" | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return "invalid";
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return null;
  if (trimmed === "preview" || trimmed === "live") return trimmed;
  return "invalid";
}

/**
 * Resolve whether this POST is a Nick-only preview or a full-list live send.
 * Returns an error for empty, missing, or conflicting mode signals.
 */
export function resolveDeskLetterSendMode(body: {
  preview?: unknown;
  live?: unknown;
  mode?: unknown;
}): ResolveDeskLetterSendModeResult {
  const modeField = normalizeModeField(body.mode);
  if (modeField === "invalid") {
    return { ok: false, error: MODE_REQUIRED_ERROR };
  }

  const previewTrue = body.preview === true;
  const previewFalse = body.preview === false;
  const liveTrue = body.live === true;
  const liveFalse = body.live === false;
  const previewPresent = body.preview !== undefined;
  const livePresent = body.live !== undefined;

  if (modeField === "preview") {
    if (liveTrue || (previewPresent && !previewTrue)) {
      return { ok: false, error: MODE_AMBIGUOUS_ERROR };
    }
    return { ok: true, mode: "preview" };
  }

  if (modeField === "live") {
    if (previewTrue || (livePresent && !liveTrue)) {
      return { ok: false, error: MODE_AMBIGUOUS_ERROR };
    }
    if (previewPresent && !previewFalse) {
      return { ok: false, error: MODE_AMBIGUOUS_ERROR };
    }
    return { ok: true, mode: "live" };
  }

  // No mode field — require explicit boolean flags.
  if (previewTrue && liveTrue) {
    return { ok: false, error: MODE_AMBIGUOUS_ERROR };
  }

  if (previewTrue) {
    if (livePresent && !liveFalse) {
      return { ok: false, error: MODE_AMBIGUOUS_ERROR };
    }
    return { ok: true, mode: "preview" };
  }

  if (liveTrue && previewFalse) {
    return { ok: true, mode: "live" };
  }

  return { ok: false, error: MODE_REQUIRED_ERROR };
}

/**
 * Same-edition live double-send guard.
 * A prior successful live archive blocks another live send unless the body
 * sets confirm_second_live: true.
 */
export function isSecondLiveSendBlocked(
  alreadyLiveSent: boolean,
  confirmSecondLive: boolean,
): boolean {
  return alreadyLiveSent && !confirmSecondLive;
}

export const SECOND_LIVE_SEND_ERROR =
  "Live letter already sent for this edition. Pass confirm_second_live: true to override.";
