import Link from "next/link";
import { MorningLetter } from "@/components/MorningLetter";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { PublicShell } from "@/components/PublicShell";
import { getEmailPreviewData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Morning email",
};

export default async function EmailPreviewPage() {
  const { letter } = await getEmailPreviewData();

  return (
    <PublicShell active="/" header="compact">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-muted">Morning email</p>
          <Link
            href="/email/archive"
            className="text-sm font-bold text-teal underline-offset-2 hover:underline"
          >
            Past mornings
          </Link>
        </div>

        <div className="mt-4">
          <MorningLetter letter={letter} mode="preview" />
        </div>

        <div className="mt-10">
          <MorningScanSignup variant="box" />
        </div>
      </div>
    </PublicShell>
  );
}
