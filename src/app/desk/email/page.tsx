import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { DeskLetterCardPicker } from "@/components/desk/DeskLetterCardPicker";
import { DeskLetterSendControls } from "@/components/desk/DeskLetterSendControls";
import { DeskSubscribers } from "@/components/desk/DeskSubscribers";
import { formatStoryDateline } from "@/lib/dates";
import {
  getAppData,
  getEmailEdition,
  getEmailLetterPreview,
  getEmailLetterSend,
  getEmailOneOffSends,
  listEmailEditions,
} from "@/lib/data/store";
import {
  deskLetterMixHint,
  listDeskLetterCandidates,
} from "@/lib/desk-letter-cards";
import {
  buildEmailEditionSnapshot,
  emailDetroitDateKey,
  formatEmailEditionLabel,
  LETTER_AROUND_MAX,
} from "@/lib/email-editions";
import {
  buildMorningLetter,
  buildMorningLetterSubject,
  pickLetterSchoolDate,
} from "@/lib/email-letter";

export const dynamic = "force-dynamic";

export default async function DeskEmailPage() {
  const data = await getAppData();
  const letters = await listEmailEditions();
  const subscribers = [...(data.subscribers ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const unsubscribed = [...(data.unsubscribed ?? [])].sort(
    (a, b) =>
      new Date(b.unsubscribed_at).getTime() -
      new Date(a.unsubscribed_at).getTime(),
  );

  const today = emailDetroitDateKey();
  const captured = await getEmailEdition(today);
  const edition = captured ?? buildEmailEditionSnapshot(data);
  const school = pickLetterSchoolDate(data.schools ?? []);
  const sent = await getEmailLetterSend(today);
  const sentSubject =
    typeof sent?.subject === "string" && sent.subject.trim()
      ? sent.subject
      : "";
  const autoSubject = buildMorningLetterSubject(edition);
  const subjectOverride =
    typeof edition.subject_override === "string"
      ? edition.subject_override.trim()
      : "";
  // After live send, Desk shows the stored subject — do not rebuild.
  const subject = sentSubject
    ? sentSubject
    : buildMorningLetter(edition, { school }).subject;
  const previewed = await getEmailLetterPreview(today);
  const oneOffs = new Set(await getEmailOneOffSends(today));
  if (today === "2026-08-28") oneOffs.add("stacietceye@hotmail.com");
  const liveSentAt = sent?.sent_at ? new Date(sent.sent_at).getTime() : null;

  const candidates = listDeskLetterCandidates(data, {
    currentAround: edition.around,
    today,
  });
  const mixHint = deskLetterMixHint(edition.around);

  return (
    <DeskChrome
      active="email"
      lastPullAt={data.last_pull_at}
      pulledItemCount={data.stories.filter((s) => !s.is_original).length}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Email</h1>
        <p className="mt-2 text-[#444]">
          Morning letter for signups. Pick the Around mix, set the subject,
          send live from here, and keep the archive. Do not invent a letter.
        </p>

        <DeskLetterCardPicker
          key={`cards-${today}-${edition.around_locked ? "locked" : "auto"}-${edition.around.map((c) => c.url).join("|")}`}
          max={LETTER_AROUND_MAX}
          initialAround={edition.around}
          aroundLocked={Boolean(edition.around_locked)}
          candidates={candidates}
          initialMixHint={mixHint}
        />

        <DeskLetterSendControls
          key={`subject-${today}-${subjectOverride}`}
          subject={subject}
          autoSubject={autoSubject}
          subjectOverride={subjectOverride}
          subjectLabel={sentSubject ? "Sent subject" : "Today’s subject"}
          alreadySent={Boolean(sent)}
          alreadyPreviewed={Boolean(previewed)}
        />

        <section className="mt-8">
          <h2 className="font-display text-lg font-black tracking-tight">
            Active signups
          </h2>
          <p className="mt-1 text-sm text-muted">
            From{" "}
            <code className="bg-paper-2 px-1">POST /api/subscribe</code>
            {" · "}
            {subscribers.length} active
            {subscribers.length ? "" : " (none yet)"}. Send today mails one
            person this morning&apos;s letter. It does not re-blast the list.
          </p>

          <DeskSubscribers
            canSendToday={Boolean(captured)}
            items={subscribers.map((row) => {
              const email = row.email.trim().toLowerCase();
              const inOneOff = oneOffs.has(email);
              const inLiveBlast = Boolean(
                liveSentAt !== null &&
                  new Date(row.created_at).getTime() <= liveSentAt,
              );
              return {
                email: row.email,
                signed_up: formatStoryDateline(row.created_at),
                sentToday: inOneOff || inLiveBlast,
              };
            })}
          />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-black tracking-tight">
            Unsubscribed
          </h2>
          <p className="mt-1 text-sm text-muted">
            {unsubscribed.length} opted out
            {unsubscribed.length ? "" : " (none yet)"}. Never mailed. Signing up
            again moves them back to Active.
          </p>

          {unsubscribed.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Empty until someone opts out. Past removals before this list
              cannot be reconstructed.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
              {unsubscribed.map((row) => (
                <li key={row.email} className="py-3">
                  <p className="font-medium text-ink break-all">{row.email}</p>
                  <p className="mt-0.5 text-sm text-[#444]">
                    Left {formatStoryDateline(row.unsubscribed_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/email" className="btn-teal inline-flex">
            Open web preview
          </Link>
          <Link
            href="/email/archive"
            className="inline-flex border border-ink bg-paper px-4 py-2 text-sm font-extrabold uppercase tracking-wide"
          >
            Past mornings
          </Link>
        </div>

        <h2 className="mt-10 font-display text-lg font-black tracking-tight">
          Letter archive
        </h2>
        <p className="mt-1 text-sm text-muted">
          Dated letters after a pull or send. Web copies live at{" "}
          <code className="bg-paper-2 px-1">/email/[date]</code>.
        </p>

        {letters.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No letters captured yet.</p>
        ) : (
          <ul className="mt-4">
            {letters.map((letter) => (
              <li key={letter.date} className="border-t border-rule py-3">
                <Link
                  href={`/email/${letter.date}`}
                  className="font-serif text-lg text-ink hover:text-teal"
                >
                  {formatEmailEditionLabel(letter.date)}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {letter.around.length} headlines
                  {letter.lead ? " · lead" : ""}
                  {letter.alerts.length
                    ? ` · ${letter.alerts.length} alerts`
                    : ""}
                  {letter.around_locked ? " · Desk mix" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
