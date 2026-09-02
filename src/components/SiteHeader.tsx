import Image from "next/image";
import Link from "next/link";
import { NavSearch } from "@/components/NavSearch";
import { Wordmark } from "@/components/Wordmark";
import { formatHeaderDate } from "@/lib/dates";
import { getSite, siteWordmark } from "@/lib/sites";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/events", label: "Events" },
  { href: "/civic", label: "Civic" },
  { href: "/schools", label: "Schools" },
  { href: "/sports", label: "Sports" },
  { href: "/shows", label: "Shows" },
] as const;

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
          <NavSearch siteName={siteWordmark()} />
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
  weatherLine = null,
}: {
  active?: string;
  variant?: "hero" | "compact";
  /** One-glance weather beside the paper date (hero only). */
  weatherLine?: string | null;
}) {
  const site = getSite();
  if (variant === "hero") {
    return (
      <header className="site-header-hero">
        <div className="hero-photo">
          {site.hero.src ? (
            <Image
              src={site.hero.src}
              alt={site.hero.alt}
              fill
              priority
              className="hero-photo-img"
              sizes="100vw"
            />
          ) : (
            <div
              className="hero-photo-img"
              style={{
                background:
                  "linear-gradient(160deg, #1c3d38 0%, #3d5c4a 45%, #8a9a6a 100%)",
              }}
              aria-hidden
            />
          )}
          <div className="hero-photo-scrim" aria-hidden />
          <div className="hero-photo-frame">
            <div className="hero-top">
              <p className="hero-meta">{site.hero.dateline}</p>
              <p className="hero-meta hero-meta-date">
                <span>{formatHeaderDate()}</span>
                {weatherLine ? (
                  <span className="hero-weather">
                    {" · "}
                    {weatherLine}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="hero-bottom">
              <Link href="/" className="hero-wordmark" aria-label={siteWordmark()}>
                <Wordmark tone="cream" />
              </Link>
              <p className="hero-dek">{site.hero.dek}</p>
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
