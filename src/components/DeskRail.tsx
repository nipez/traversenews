import Link from "next/link";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { TipsForm } from "@/components/TipsForm";

/**
 * Shared cream/ink rail for About + Sports (morning email, tips, desk links).
 */
export function DeskRail({
  active = "/",
  sportsBeats,
}: {
  active?: string;
  /** Optional sports-specific beat links (homepage URLs). */
  sportsBeats?: Array<{ name: string; href: string }>;
}) {
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
        <p className="about-rail-kicker">On this desk</p>
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
              href="/whats-on"
              className={
                active === "/whats-on" ? "about-rail-nav-active" : undefined
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
            <Link href="/#alerts">Alerts</Link>
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
        </ul>
      </div>

      {sportsBeats && sportsBeats.length > 0 ? (
        <div className="about-rail-card">
          <p className="about-rail-kicker">Sports desks</p>
          <p className="about-rail-copy">
            Headlines link out. We do not invent scores.
          </p>
          <ul className="about-rail-links">
            {sportsBeats.map((b) => (
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
