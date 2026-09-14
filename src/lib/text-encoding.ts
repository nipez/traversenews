/**
 * UTF-8 mojibake repair for public copy (titles, deks, letter HTML).
 *
 * Classic failure: UTF-8 bytes (e.g. em-dash E2 80 94) were decoded as
 * Latin-1/ISO-8859-1, producing U+00E2 U+0080 U+0094. Stored as UTF-8 JSON
 * that becomes C3 A2 C2 80 C2 94 on the wire — Gmail shows â€” / â€™ / â€¦.
 *
 * Root ingest fix lives in pull/rss.ts (fetch + TextDecoder utf-8). This
 * module heals already-mangled KV strings and defends render paths.
 */

/** Latin-1 misread of UTF-8 multi-byte sequences (C1 controls after â/Ã/Â). */
const LATIN1_MOJIBAKE =
  /\u00E2\u0080[\u0090-\u00BF]|\u00C2[\u0080-\u00BF]|\u00C3[\u0080-\u00BF]/;

/** Windows-1252 misread leaves euro (U+20AC) in the middle of the cluster. */
const WIN1252_MOJIBAKE = /\u00E2\u20AC/;

const LOOKS_MOJIBAKE = new RegExp(
  `${LATIN1_MOJIBAKE.source}|${WIN1252_MOJIBAKE.source}`,
);

/**
 * Explicit sequence map for mixed strings (and Windows-1252 form).
 * Prefer the full latin1→utf8 round-trip when every char is byte-sized.
 */
const SEQUENCE_REPAIRS: Array<[string, string]> = [
  // Latin-1 misdecode of UTF-8 (bytes as U+00xx)
  ["\u00E2\u0080\u0099", "\u2019"], // ’
  ["\u00E2\u0080\u0098", "\u2018"], // ‘
  ["\u00E2\u0080\u009C", "\u201C"], // “
  ["\u00E2\u0080\u009D", "\u201D"], // ”
  ["\u00E2\u0080\u0093", "\u2013"], // –
  ["\u00E2\u0080\u0094", "\u2014"], // —
  ["\u00E2\u0080\u00A6", "\u2026"], // …
  ["\u00C2\u00A0", "\u00A0"],
  // Windows-1252 misdecode of the same UTF-8 bytes
  ["\u00E2\u20AC\u2122", "\u2019"], // â€™ → ’
  ["\u00E2\u20AC\u2018", "\u2018"], // â€˜ → ‘
  ["\u00E2\u20AC\u0153", "\u201C"], // â€œ → “
  ["\u00E2\u20AC\u201D", "\u201D"], // â€ → ” (also em-dash in some tables)
  ["\u00E2\u20AC\u201C", "\u2013"], // â€œ/â€“ cluster → –
  ["\u00E2\u20AC\u2013", "\u2013"],
  ["\u00E2\u20AC\u2014", "\u2014"],
  ["\u00E2\u20AC\u00A6", "\u2026"], // â€¦ → …
  ["\u00E2\u20AC\u2026", "\u2026"],
];

function allCharsAreByteSized(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 255) return false;
  }
  return true;
}

function repairKnownSequences(input: string): string {
  let out = input;
  for (const [from, to] of SEQUENCE_REPAIRS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

function looksLikeSuccessfulRepair(before: string, after: string): boolean {
  if (after === before || !after) return false;
  if (after.includes("\uFFFD")) return false;
  const beforeBad = (before.match(LOOKS_MOJIBAKE) || []).length;
  const afterBad = (after.match(LOOKS_MOJIBAKE) || []).length;
  if (afterBad >= beforeBad && beforeBad > 0) return false;
  if (/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/.test(after)) return true;
  if (afterBad < beforeBad) return true;
  return after.length < before.length;
}

/**
 * Repair UTF-8-as-Latin-1 mojibake. Safe no-op when the string looks clean.
 */
export function repairUtf8Mojibake(input: string): string {
  if (!input || !LOOKS_MOJIBAKE.test(input)) return input;

  if (allCharsAreByteSized(input)) {
    try {
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        bytes[i] = input.charCodeAt(i);
      }
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (looksLikeSuccessfulRepair(input, decoded)) return decoded;
    } catch {
      // fall through to sequence map
    }
  }

  return repairKnownSequences(input);
}

/**
 * Normalize public-facing wire copy: repair mojibake, trim.
 * Keeps real Unicode punctuation (letter HTML declares UTF-8).
 */
export function sanitizePublicText(input: string): string {
  return repairUtf8Mojibake(input).replace(/\u0000/g, "").trim();
}

/** True when a string still contains known mojibake markers (for tests). */
export function hasMojibake(input: string): boolean {
  return LOOKS_MOJIBAKE.test(input);
}
