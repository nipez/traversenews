import type { SiteOutboundLink } from "@/lib/sites";

/** Official outbound calendars — never a substitute for invented listings. */
export function OfficialCalendars({
  links,
  kicker = "Official calendars",
}: {
  links: readonly SiteOutboundLink[];
  kicker?: string;
}) {
  if (!links.length) return null;
  return (
    <div className="official-cals">
      <p className="official-cals-kicker">{kicker}</p>
      <ul className="official-cals-list">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {link.name} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
