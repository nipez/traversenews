import { allowedNetworkCities, getSite } from "@/lib/sites";

/**
 * Phase 1 network switcher: links to each city's /desk.
 * Other hosts still require that city's staff login (same password for now).
 * STAFF_SITES can hide cities from a future cultivator.
 */
export function CitiesSwitcher() {
  const current = getSite();
  const cities = allowedNetworkCities();
  if (cities.length < 2) {
    return (
      <span className="text-[0.65rem] font-semibold tracking-[0.1em] text-white/55 uppercase">
        {current.id === "ann-arbor" ? "Ann Arbor / Dexter" : "Traverse City"}
      </span>
    );
  }

  return (
    <nav
      className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.08em] text-white/70 uppercase"
      aria-label="Cities"
    >
      {cities.map((city) => {
        const here = city.id === current.id;
        return (
          <a
            key={city.id}
            href={`${city.origin}/desk`}
            aria-current={here ? "page" : undefined}
            className={
              here
                ? "border-b border-white pb-0.5 text-white"
                : "text-white/60 hover:text-white"
            }
          >
            {city.label}
          </a>
        );
      })}
    </nav>
  );
}
