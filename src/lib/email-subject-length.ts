/**
 * Morning-letter subject length (phrase body only).
 * Matches buildMorningLetterSubject: leading 🗞️ pack is not counted.
 */

/** Soft guidance band — stay at or under for a comfortable pack. */
export const SUBJECT_PHRASE_SOFT_CAP = 80;

/**
 * Hard ceiling for Desk overrides and the auto builder pack.
 * Same 84 used when packing 2–3 complete phrases.
 */
export const SUBJECT_PHRASE_HARD_MAX = 84;

/** Phrase-body length: strip leading 🗞️ (+ following space), then .length. */
export function morningLetterSubjectPhraseLen(subject: string): number {
  return subject.replace(/^🗞️\s*/, "").length;
}

/** True when phrase body is over the hard max (Save / API must refuse). */
export function isMorningLetterSubjectOverMax(subject: string): boolean {
  return morningLetterSubjectPhraseLen(subject) > SUBJECT_PHRASE_HARD_MAX;
}

/** Soft warn band: over soft cap but still within hard max. */
export function isMorningLetterSubjectOverSoftCap(subject: string): boolean {
  const n = morningLetterSubjectPhraseLen(subject);
  return n > SUBJECT_PHRASE_SOFT_CAP;
}
