import Image from "next/image";
import Link from "next/link";
import { formatHeaderDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "Events" },
  { href: "/civic", label: "Civic Calendar" },
] as const;

function Wordmark({
  className = "",
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "cream";
}) {
  const cls = tone === "cream" ? "wordmark-cream" : "wordmark-ink";
  return (
    <span className={`wordmark ${cls} ${className}`.trim()}>
      traverse<span className="wordmark-dot">.</span>news
    </span>
  );
}

export function SiteHeader({
  active = "/",
  variant = "compact",
}: {
  active?: string;
  /** hero = photo masthead (Today); compact = inner pages */
  variant?: "hero" | "compact";
}) {
  if (variant === "hero") {
    return (
      <header>
        <div className="hero-photo">
          <Image
            src="/art/bay-hero.jpg"
            alt="Grand Traverse Bay at sunset"
            fill
            priority
            className="hero-photo-img"
            sizes="100vw"
          />
          <div className="hero-photo-scrim" aria-hidden />
          <div className="hero-photo-inner">
            <p className="hero-date">{formatHeaderDate()}</p>
            <Link href="/" className="hero-wordmark block">
              <Wordmark tone="cream" />
            </Link>
            <p className="hero-dek">
              Local news from Traverse City and the surrounding area.
            </p>
          </div>
        </div>

        <div className="nav-ink-bar">
          <div className="nav-ink-bar-inner">
            <nav className="nav-links hidden md:flex" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active === item.href
                      ? "nav-link nav-link-active-chip"
                      : "nav-link"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link href="/email#signup" className="btn-email ml-auto">
              Morning email
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header-compact">
      <div className="header-compact-row">
        <Link href="/">
          <Wordmark />
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="nav-boxed hidden md:inline-flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active === item.href
                    ? "nav-link nav-link-active-fill"
                    : "nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/email#signup" className="btn-email">
            Morning email
          </Link>
        </div>
      </div>
    </header>
  );
}
