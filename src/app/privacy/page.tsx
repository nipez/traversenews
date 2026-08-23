import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <PublicShell active="/" header="compact">
      <div className="about-layout">
        <article className="about-essay">
          <h1 className="about-hed">Privacy</h1>
          <p className="about-dek">
            How traverse.news handles your information. Plain English.
          </p>

          <div className="about-body">
            <p>
              traverse.news is a local news, events, civic, and schools tab for
              the Traverse City area. It is operated by traverse.news in
              Traverse City, Michigan.
            </p>

            <h2>What we collect</h2>
            <p>
              If you sign up for the morning letter, we store the email address
              you give us so we can send that letter. Signup is a single
              opt-in. We do not send a separate confirmation email.
            </p>
            <p>
              If you submit a tip or an event tip, we store what you put in the
              form so the desk can read it. That is not published automatically.
            </p>

            <h2>Morning letter</h2>
            <p>
              We send the morning letter with Resend. We do not sell the
              subscriber list. You can unsubscribe anytime from the link in the
              letter or on this site at{" "}
              <Link href="/email/unsubscribe">/email/unsubscribe</Link>.
            </p>

            <h2>Analytics</h2>
            <p>
              We use Google Analytics (GA4, measurement ID G-H554KXZD5B) to see
              aggregate traffic: pages viewed, rough geography, device type. We
              use that to understand whether the site is working, not to sell
              ads against you.
            </p>

            <h2>Cookies</h2>
            <p>
              Google Analytics sets cookies (or similar storage) for that
              measurement. The host (Cloudflare) may set normal technical
              cookies needed to run the site. We do not run ad networks or
              third-party ad trackers on this site.
            </p>
            <p>
              Desk staff login uses a session cookie. That is only for people
              who sign into the desk, not for ordinary readers.
            </p>

            <h2>Alerts and headlines</h2>
            <p>
              Alerts and aggregated headlines come from public sources and link
              out to those outlets. Visiting those sites is under their own
              policies.
            </p>

            <h2>Children</h2>
            <p>
              This site is not directed at children under 13. We do not
              knowingly collect personal information from children under 13.
            </p>

            <h2>Contact</h2>
            <p>
              Questions or corrections: use the{" "}
              <Link href="/tips">tips form</Link>. We do not publish a personal
              inbox on this page.
            </p>

            <h2>Changes</h2>
            <p>
              We may update this page. Last updated August 23, 2026. Related:{" "}
              <Link href="/terms">Terms of use</Link>.
            </p>
          </div>
        </article>
      </div>
    </PublicShell>
  );
}
