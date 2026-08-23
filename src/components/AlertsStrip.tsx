import type { AlertItem } from "@/lib/alerts";

/**
 * Homepage Alerts rail — real Facebook tip wires only.
 * Renders nothing when empty (no dummy strip).
 */
export function AlertsStrip({ items }: { items: AlertItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="alerts-strip" aria-label="Alerts">
      <div className="alerts-head">
        <p className="alerts-kicker">Alerts</p>
      </div>
      <ul className="alerts-list">
        {items.map((item) => (
          <li key={item.id} className="alerts-row">
            <span className="alerts-pill">{item.source_name}</span>
            <div className="alerts-copy">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="alerts-title"
              >
                {item.title}
              </a>
              {item.dek ? <p className="alerts-dek">{item.dek}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
