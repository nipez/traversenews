import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { getAppData, listEmailEditions } from "@/lib/data/store";
import { formatEmailEditionLabel } from "@/lib/email-editions";

export const dynamic = "force-dynamic";

export default async function DeskEmailPage() {
  const data = await getAppData();
  const letters = await listEmailEditions();

  return (
    <DeskChrome active="email">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Email</h1>
        <p className="mt-2 text-[#444]">
          Send pipeline comes later. Preview the morning scan, archive dated
          letters, and collect addresses now. Do not invent a letter.
        </p>
        <p className="mt-4 text-sm text-muted">
          {data.subscribers.length} subscriber
          {data.subscribers.length === 1 ? "" : "s"} stored locally
          {data.subscribers.length ? "" : " (none yet)"}.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
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
                  {letter.alerts.length ? ` · ${letter.alerts.length} alerts` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
