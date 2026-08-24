import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { listEmailEditions } from "@/lib/data/store";
import { formatEmailEditionLabel } from "@/lib/email-editions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Past mornings",
};

export default async function EmailArchivePage() {
  const editions = await listEmailEditions();

  return (
    <PublicShell active="/" header="compact">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/email" className="font-bold text-teal">
            ← Morning email
          </Link>
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink md:text-4xl">
          Past mornings
        </h1>
        <p className="mt-2 text-[#444]">
          Past morning letters. Times are America/Detroit.
        </p>

        {editions.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No letters archived yet.</p>
        ) : (
          <ul className="mt-8">
            {editions.map((edition) => (
              <li key={edition.date} className="border-t border-rule py-4">
                <Link
                  href={`/email/${edition.date}`}
                  className="font-serif text-xl text-ink hover:text-teal"
                >
                  {formatEmailEditionLabel(edition.date)}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {edition.around.length} headlines
                  {edition.lead ? " · lead original" : ""}
                  {edition.alerts.length ? ` · ${edition.alerts.length} alert${edition.alerts.length === 1 ? "" : "s"}` : ""}
                  {edition.tonight.length ? ` · ${edition.tonight.length} tonight` : ""}
                  {" · captured "}
                  {new Date(edition.captured_at).toLocaleString("en-US", {
                    timeZone: "America/Detroit",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
