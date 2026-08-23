import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="wordmark wordmark-ink text-[1.35rem]">
          traverse<span className="wordmark-dot">.</span>news
        </Link>
        <nav>
          <Link href="/email">About</Link>
          <a href="mailto:tips@traverse.news">Tips</a>
          <Link href="/editions">Editions</Link>
        </nav>
        <p className="text-sm text-muted">
          © 2026 · Traverse City, Michigan
        </p>
      </div>
    </footer>
  );
}
