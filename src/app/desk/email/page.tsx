import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { DeskLetterSendControls } from "@/components/desk/DeskLetterSendControls";
import { formatStoryDateline } from "@/lib/dates";
import {
  getAppData,
  getEmailEdition,
  getEmailLetterPreview,
  getEmailLetterSend,
  listEmailEditions,
} from "@/lib/data/store";
import {
  buildEmailEditionSnapshot,
  emailDetroitDateKey,
  formatEmailEditionLabel,
} from "@/lib/email-editions";
import {
  buildMorningLetter,
  pickLetterSchoolDate,
} from "@/lib/email-letter";

export const dynamic = "force-dynamic";

export default async function DeskEmailPage() {
  const data = await getAppData();
  const letters = await listEmailEditions();
  const subscribers = [...data.subscribers].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const today = emailDetroitDateKey();
  const edition =
    (await getEmailEdition(today)) ?? buildEmailEditionSnapshot(data);
  const school = pickLetterSchoolDate(data.schools ?? []);
  const { subject } = buildMorningLetter(edition, { school });
  const sent = await getEmailLetterSend(today);
  const previewed = await getEmailLetterPreview(today);

  return (
    <DeskChrome active="email">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Email</h1>
        <p className="mt-2 text-[#444]">
          Morning letter for signups. Check the subject, send live from here,
          and keep the archive. Do not invent a letter.
        </p>

        <DeskLetterSendControls
          subject={subject}
          alreadySent={Boolean(sent)}
          alreadyPreviewed={Boolean(previewed)}
        />

        <section className="mt-8">
          <h2 className="font-display text-lg font-black tracking-tight">
            Morning-scan signups
          </h2>
          <p className="mt-1 text-sm text-muted">
            From{" "}
            <code className="bg-paper-2 px-1">POST /api/subscribe</code>
            {" · "}
            {subscribers.length} stored
            {subscribers.length ? "" : " (none yet)"}.
          </p>

          {subscribers.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No addresses yet. Public signup writes here when someone joins.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="desk-table w-full min-w-[420px]">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((row) => (
                    <tr key={row.email}>
                      <td className="font-medium text-ink">{row.email}</td>
                      <td className="text-sm text-[#444]">
                        {formatStoryDateline(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
