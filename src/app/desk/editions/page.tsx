import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { formatEditionLabel } from "@/lib/editions";
import { listEditions } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskEditionsPage() {
  const editions = await listEditions();

  return (
    <DeskChrome active="editions">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Editions</h1>
        <p className="mt-2 text-[#444]">
          Dated homepage snapshots (America/Detroit). Each successful pull
          refreshes today&apos;s edition.
        </p>

        {editions.length === 0 ? (
          <p className="mt-8 text-sm text-muted">
            None yet.{" "}
            <Link href="/api/pull" className="text-teal">
              Run a pull
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8">
            {editions.map((edition) => (
              <li key={edition.date} className="border-t border-rule py-3">
                <Link
                  href={`/editions/${edition.date}`}
                  className="font-serif text-xl hover:text-teal"
                >
                  {formatEditionLabel(edition.date)}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {edition.around.length} around-the-bay · captured{" "}
                  {new Date(edition.captured_at).toLocaleString("en-US", {
                    timeZone: "America/Detroit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
