import Link from "next/link";
import { MorningLetter } from "@/components/MorningLetter";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { PublicShell } from "@/components/PublicShell";
import { getEmailPreviewData } from "@/lib/queries";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Morning email",
};

export default async function EmailPreviewPage() {
  const { letter } = await getEmailPreviewData();

  return (
    <PublicShell active="/" header="compact">
      <div className="email-page mx-auto max-w-3xl">
        <header className="section-type-hero">
          <p className="section-type-kicker">Monday–Saturday · 8am</p>
          <h1 className="section-type-hed">Morning email</h1>
          <p className="section-type-dek">{getSite().pageCopy.emailPageDek}</p>
        </header>

        <MorningScanSignup variant="page" />

        <p className="email-join-links">
          <a href="#this-morning">See this morning</a>
          <span aria-hidden="true"> · </span>
          <Link href="/email/archive">Past mornings</Link>
        </p>

        <hr className="email-letter-rule" />

        <section id="this-morning" className="email-this-morning">
          <p className="email-this-morning-label">This morning</p>
          <MorningLetter letter={letter} mode="preview" />
        </section>
      </div>
    </PublicShell>
  );
}
