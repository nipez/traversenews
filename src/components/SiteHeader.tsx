import Image from "next/image";
import Link from "next/link";
import { NavSearch } from "@/components/NavSearch";
import { formatHeaderDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/events", label: "Events" },
  { href: "/civic", label: "Civic" },
  { href: "/schools", label: "Schools" },
  { href: "/sports", label: "Sports" },
  { href: "/shows", label: "Shows" },
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

function NavInkBar({ active }: { active: string }) {
  return (
    <div className="nav-ink-bar">
      <div className="nav-ink-bar-inner">
        <nav className="nav-links" aria-label="Primary">
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
        <div className="nav-ink-actions">
          <NavSearch />
          <Link href="/email" className="btn-email">
            Morning email
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({
  active = "/",
  variant = "compact",
}: {
  active?: string;
  variant?: "hero" | "compact";
}) {
  if (variant === "hero") {
    return (
      <header className="site-header-hero">
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
          <div className="hero-photo-frame">
            <div className="hero-top">
              <p className="hero-meta">Traverse City, Michigan</p>
              <p className="hero-meta">{formatHeaderDate()}</p>
            </div>
            <div className="hero-bottom">
              <Link href="/" className="hero-wordmark">
                <Wordmark tone="cream" />
              </Link>
              <p className="hero-dek">
                One tab for the bay: news, nights out, civic, and schools.
              </p>
            </div>
          </div>
        </div>

        <NavInkBar active={active} />
      </header>
    );
  }

  return (
    <header className="site-header-interior">
      <div className="interior-mast">
        <Link href="/" className="interior-wordmark">
          <Wordmark />
        </Link>
      </div>
      <NavInkBar active={active} />
    </header>
  );
}
