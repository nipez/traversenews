import Link from "next/link";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { TipsForm } from "@/components/TipsForm";

/**
 * Shared cream/ink rail for About + Sports + Shows (morning email, tips, sections).
 */
export function DeskRail({
  active = "/",
  sportsBeats,
  outboundLinks,
  outboundKicker = "Links",
}: {
  active?: string;
  /** Optional sports-specific beat links (homepage URLs). */
  sportsBeats?: Array<{ name: string; href: string }>;
  /** Optional outbound links (e.g. Shows venues). */
  outboundLinks?: Array<{ name: string; href: string }>;
  outboundKicker?: string;
}) {
  const links = outboundLinks ?? sportsBeats;
  const kicker = outboundLinks
    ? outboundKicker
    : sportsBeats
      ? "Sports desks"
      : outboundKicker;
  const copy = null;

  return (
    <aside className="about-rail">
      <div className="about-rail-card about-rail-email">
        <MorningScanSignup variant="teal" />
        <p className="about-rail-more">
          <Link href="/email#signup">Morning email page →</Link>
        </p>
      </div>

      <div className="about-rail-card">
        <TipsForm variant="rail" />
      </div>

      <div className="about-rail-card">
        <p className="about-rail-kicker">Sections</p>
        <ul className="about-rail-nav">
          <li>
            <Link
              href="/"
              className={active === "/" ? "about-rail-nav-active" : undefined}
            >
              Today
            </Link>
          </li>
          <li>
            <Link
              href="/events"
              className={
                active === "/events" ? "about-rail-nav-active" : undefined
              }
            >
              Events
            </Link>
          </li>
          <li>
            <Link
              href="/civic"
              className={
                active === "/civic" ? "about-rail-nav-active" : undefined
              }
            >
              Civic
            </Link>
          </li>
          <li>
            <Link
              href="/schools"
              className={
                active === "/schools" ? "about-rail-nav-active" : undefined
              }
            >
              Schools
            </Link>
          </li>
          <li>
            <Link
              href="/sports"
              className={
                active === "/sports" ? "about-rail-nav-active" : undefined
              }
            >
              Sports
            </Link>
          </li>
          <li>
            <Link
              href="/shows"
              className={
                active === "/shows" ? "about-rail-nav-active" : undefined
              }
            >
              Shows
            </Link>
          </li>
        </ul>
      </div>

      {links && links.length > 0 ? (
        <div className="about-rail-card">
          <p className="about-rail-kicker">{kicker}</p>
          {copy ? <p className="about-rail-copy">{copy}</p> : null}
          <ul className="about-rail-links">
            {links.map((b) => (
              <li key={b.href}>
                <a href={b.href} target="_blank" rel="noopener noreferrer">
                  {b.name} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
