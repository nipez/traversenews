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
      <div className="email-page mx-auto max-w-3xl">
        <header className="section-type-hero">
          <p className="section-type-kicker">Monday–Saturday · 8am</p>
          <h1 className="section-type-hed">Morning email</h1>
          <p className="section-type-dek">
            The bay in one letter. News, events, civic, schools, sports.
          </p>
        </header>

        <MorningScanSignup variant="page" />

        <p className="email-join-links">
          {letter ? (
            <>
              <a href="#letter">See this morning</a>
              <span aria-hidden="true"> · </span>
            </>
          ) : null}
          <Link href="/email/archive">Past mornings</Link>
        </p>

        {letter ? (
          <>
            <hr className="email-letter-rule" />
            <div id="letter">
              <MorningLetter letter={letter} mode="preview" />
            </div>
          </>
        ) : null}
      </div>
    </PublicShell>
  );
}
