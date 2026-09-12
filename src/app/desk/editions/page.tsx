import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { DeskGlobalPull } from "@/components/desk/DeskGlobalPull";
import { DeskLetterAroundProvider } from "@/components/desk/DeskLetterAroundContext";
import { DeskLetterCardPicker } from "@/components/desk/DeskLetterCardPicker";
import {
  BAY_AROUND_MAX,
  deskHomeMixHint,
  editionCardToEmailCard,
  listDeskHomeCandidates,
} from "@/lib/desk-home-cards";
import {
  getAppData,
  getEdition,
  listEditions,
} from "@/lib/data/store";
import {
  buildEditionSnapshot,
  detroitDateKey,
  formatEditionLabel,
} from "@/lib/editions";

export const dynamic = "force-dynamic";

export default async function DeskEditionsPage() {
  const data = await getAppData();
  const editions = await listEditions();
  const today = detroitDateKey();
  const captured = await getEdition(today);
  const edition = captured ?? buildEditionSnapshot(data);
  const currentAround = edition.around.map(editionCardToEmailCard);
  const candidates = listDeskHomeCandidates(data, {
    currentAround,
    today,
  });
  const mixHint = deskHomeMixHint(edition.around);
  const pulledItemCount = data.stories.filter((s) => !s.is_original).length;

  return (
    <DeskChrome
      active="editions"
      lastPullAt={data.last_pull_at}
      pulledItemCount={pulledItemCount}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Editions</h1>
        <p className="mt-2 text-[#444]">
          Dated homepage snapshots (America/Detroit). Pick today&apos;s public
          Around mix here — separate from the morning letter. Each successful
          pull refreshes today&apos;s edition unless the bay is Desk-locked.
          Use <strong>Pull now</strong> in the Desk header for a full feed
          pull.
        </p>

        <div className="mt-6">
          <DeskGlobalPull
            variant="panel"
            lastPullAt={data.last_pull_at}
            itemCount={pulledItemCount}
          />
        </div>

        <DeskLetterAroundProvider
          key={`home-cards-${today}-${edition.around_locked ? "locked" : "auto"}-${edition.around.map((c) => c.url).join("|")}`}
          initialAround={currentAround}
          aroundLocked={Boolean(edition.around_locked)}
          initialMixHint={mixHint}
          persistUrl="/api/desk/editions/cards"
        >
          <DeskLetterCardPicker
            max={BAY_AROUND_MAX}
            candidates={candidates}
            variant="homepage"
          />
        </DeskLetterAroundProvider>

        <h2 className="mt-10 font-display text-lg font-black tracking-tight">
          Archive
        </h2>
        <p className="mt-1 text-sm text-muted">
          Public copies live at{" "}
          <code className="bg-paper-2 px-1">/editions/[date]</code>.
        </p>

        {editions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            None yet. Run <strong>Pull now</strong> from the Desk header.
          </p>
        ) : (
          <ul className="mt-4">
            {editions.map((row) => (
              <li key={row.date} className="border-t border-rule py-3">
                <Link
                  href={`/editions/${row.date}`}
                  className="font-serif text-xl hover:text-teal"
                >
                  {formatEditionLabel(row.date)}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {row.around.length} around-the-bay
                  {row.around_locked ? " · Desk mix" : ""}
                  {" · "}
                  captured{" "}
                  {new Date(row.captured_at).toLocaleString("en-US", {
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
