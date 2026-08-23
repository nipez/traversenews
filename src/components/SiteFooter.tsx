import Link from "next/link";
import { USEFUL_LOCAL } from "@/lib/useful-local";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="wordmark wordmark-ink text-[1.35rem]">
          traverse<span className="wordmark-dot">.</span>news
        </Link>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/tips">Tips</Link>
          <Link href="/editions">Editions</Link>
          <Link href="/email">Morning email</Link>
        </nav>
        <p className="text-sm text-muted">
          © 2026 · Traverse City, Michigan
        </p>
      </div>
      <div className="site-footer-useful">
        <p className="site-footer-useful-label">Useful local</p>
        <ul className="site-footer-useful-list">
          {USEFUL_LOCAL.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
