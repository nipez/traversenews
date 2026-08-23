import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";

export default function NotFound() {
  return (
    <PublicShell active="/" header="compact">
      <div className="not-found-page">
        <p className="not-found-kicker">Missing</p>
        <h1 className="not-found-hed">404</h1>
        <p className="not-found-dek">
          This page could not be found. Try Today, Events, or search from the
          bar above.
        </p>
        <nav className="not-found-links" aria-label="Continue">
          <Link href="/">Today</Link>
          <Link href="/whats-on">Events</Link>
          <Link href="/civic">Civic</Link>
          <Link href="/schools">Schools</Link>
          <Link href="/search">Search</Link>
        </nav>
      </div>
    </PublicShell>
  );
}
