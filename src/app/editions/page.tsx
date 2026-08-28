import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { formatEditionLabel } from "@/lib/editions";
import { listEditions } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editions",
};

export default async function EditionsIndexPage() {
  const editions = await listEditions();

  return (
    <PublicShell active="/">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">Editions</h1>
        <p className="mt-2 text-[#444]">
          A dated log of what ran on the homepage. Times are America/Detroit.
        </p>

        {editions.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No editions yet.</p>
        ) : (
          <ul className="mt-8">
            {editions.map((edition) => (
              <li key={edition.date} className="border-t border-rule py-4">
                <Link
                  href={`/editions/${edition.date}`}
                  className="font-serif text-xl text-ink hover:text-teal"
                >
                  {formatEditionLabel(edition.date)}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {edition.around.length} headlines
                  {edition.lead ? " · lead original" : ""}
                  {" · updated "}
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
