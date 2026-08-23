import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { formatStoryDateline } from "@/lib/dates";
import { getAppData, listEmailEditions } from "@/lib/data/store";
import { formatEmailEditionLabel } from "@/lib/email-editions";

export const dynamic = "force-dynamic";

export default async function DeskEmailPage() {
  const data = await getAppData();
  const letters = await listEmailEditions();
  const subscribers = [...data.subscribers].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <DeskChrome active="email">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Email</h1>
        <p className="mt-2 text-[#444]">
          Send pipeline comes later. Preview the TLDR-style morning letter,
          archive dated snapshots, and collect addresses now. Do not invent a
          letter.
        </p>

        <section className="mt-8">
          <h2 className="font-display text-lg font-black tracking-tight">
            Morning-scan signups
          </h2>
          <p className="mt-1 text-sm text-muted">
            From{" "}
            <code className="bg-paper-2 px-1">POST /api/subscribe</code>
            {" · "}
            {subscribers.length} stored
            {subscribers.length ? "" : " (none yet)"}. No Mailchimp export —
            sending is not wired.
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
            Open live preview
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
          Capture today:{" "}
          <code className="bg-paper-2 px-1">POST /api/desk/email/snapshot</code>{" "}
          (Bearer desk). Also runs after a successful pull.
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
                  {letter.tonight.length
                    ? ` · ${letter.tonight.length} tonight`
                    : ""}
                  {letter.civic.length
                    ? ` · ${letter.civic.length} civic`
                    : ""}
                  {letter.sports?.length
                    ? ` · ${letter.sports.length} sports`
                    : ""}
                  {letter.schools ? " · schools" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
