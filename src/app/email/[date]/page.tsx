import Link from "next/link";
import { notFound } from "next/navigation";
import { InteriorLayout } from "@/components/InteriorLayout";
import { MorningLetter } from "@/components/MorningLetter";
import { PublicShell } from "@/components/PublicShell";
import {
  formatEmailEditionLabel,
  isValidEmailEditionDate,
} from "@/lib/email-editions";
import { getEmailArchiveSnapshot } from "@/lib/public-snapshots";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props) {
  const { date } = await params;
  if (!isValidEmailEditionDate(date)) {
    return { title: "Morning email" };
  }
  return { title: `Morning email · ${formatEmailEditionLabel(date)}` };
}

export default async function EmailEditionPage({ params }: Props) {
  const { date } = await params;
  if (!isValidEmailEditionDate(date)) notFound();

  const snap = await getEmailArchiveSnapshot();
  const letter = snap.letters.find((l) => l.date === date);
  if (!letter) {
    return (
      <PublicShell active="/" header="compact">
        <InteriorLayout mainClassName="email-main">
          <p className="text-sm text-muted">
            <Link href="/email/archive" className="font-bold text-teal">
              ← Past mornings
            </Link>
          </p>
          <h1 className="mt-3 font-serif text-3xl text-ink">
            No letter that morning
          </h1>
          <p className="mt-2 text-[#444]">
            Nothing was captured for {formatEmailEditionLabel(date)}. We do not
            invent a letter after the fact.
          </p>
        </InteriorLayout>
      </PublicShell>
    );
  }

  return (
    <PublicShell active="/" header="compact">
      <InteriorLayout mainClassName="email-main">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-muted">
            Archived letter (same layout as send). Sending is not wired up yet.
          </p>
          <Link
            href="/email/archive"
            className="text-sm font-bold text-teal underline-offset-2 hover:underline"
          >
            Past mornings
          </Link>
        </div>
        <div className="mt-4">
          <MorningLetter letter={letter} mode="archive" />
        </div>
      </InteriorLayout>
    </PublicShell>
  );
}
