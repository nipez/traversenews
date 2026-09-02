import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { getSite, siteWordmark } from "@/lib/sites";

export function SiteFooter() {
  const site = getSite();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="wordmark wordmark-ink text-[1.35rem]" aria-label={siteWordmark()}>
          <Wordmark />
        </Link>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/tips">Tips</Link>
          <Link href="/editions">Editions</Link>
          <Link href="/email">Morning email</Link>
        </nav>
        <p className="text-sm text-muted">
          © 2026 · {site.place}, {site.placeState}
        </p>
      </div>
    </footer>
  );
}
