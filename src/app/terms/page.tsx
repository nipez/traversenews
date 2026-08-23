import Link from "next/link";
import { InteriorLayout } from "@/components/InteriorLayout";
import { PublicShell } from "@/components/PublicShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terms of use",
};

export default function TermsPage() {
  return (
    <PublicShell active="/" header="compact">
      <InteriorLayout>
        <article>
          <h1 className="about-hed">Terms of use</h1>
          <p className="about-dek">
            Ground rules for reading and using traverse.news.
          </p>

          <div className="about-body">
            <p>
              traverse.news is a local news and listings site for the Traverse
              City area, operated by traverse.news in Traverse City, Michigan.
              By using the site, you agree to these terms.
            </p>

            <h2>Use at your own risk</h2>
            <p>
              We aim to be useful and careful. The site is still provided as-is.
              Headlines, times, and listings can be wrong, late, or incomplete.
              Do not treat this site as the only check for safety, legal,
              medical, or emergency decisions.
            </p>

            <h2>Other outlets</h2>
            <p>
              Many headlines and alerts link to other newsrooms and agencies. We
              do not control those sites, their paywalls, or their accuracy. Their
              terms and privacy rules apply once you leave.
            </p>

            <h2>Fair use of the site</h2>
            <p>
              Do not scrape, hammer, or otherwise abuse the site or its feeds in
              a way that hurts performance for everyone else. Automated access
              for ordinary indexing is fine. Bulk harvesting of the whole site is
              not.
            </p>

            <h2>Tips and event submissions</h2>
            <p>
              Tips and event tips you send may be edited, held, or not published.
              Submitting something does not guarantee it will appear on the
              site.
            </p>

            <h2>Morning letter</h2>
            <p>
              If you subscribe, we email you the morning letter. You can leave
              anytime via{" "}
              <Link href="/email/unsubscribe">unsubscribe</Link>. See also the{" "}
              <Link href="/privacy">privacy policy</Link>.
            </p>

            <h2>Law</h2>
            <p>
              These terms are governed by the laws of the State of Michigan and
              the United States. If a dispute needs a venue, Grand Traverse
              County, Michigan is the informal home court.
            </p>

            <h2>Changes</h2>
            <p>
              We can change these pages. Continued use after an update means you
              accept the new version. Last updated August 23, 2026. Contact: the{" "}
              <Link href="/tips">tips form</Link>.
            </p>
          </div>
        </article>
      </InteriorLayout>
    </PublicShell>
  );
}
