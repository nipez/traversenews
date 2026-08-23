import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <PublicShell active="/" header="compact">
      <div className="about-page">
        <p className="about-kicker">Desk</p>
        <h1 className="about-hed">About</h1>
        <div className="about-body">
          <p>
            traverse.news is a Traverse City desk. We publish original reporting
            under Nick Perez. Other local desks appear as headlines that link
            out — we don’t reprint their stories.
          </p>
          <p>
            Events and the Civic Calendar are built from public listings, not
            invented schedules.
          </p>
          <p>
            Tips:{" "}
            <a href="mailto:tips@traverse.news">tips@traverse.news</a>
          </p>
          <p>
            <Link href="/email" className="about-email-link">
              Morning email →
            </Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
