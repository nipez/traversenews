import { PublicShell } from "@/components/PublicShell";
import { LOCAL_GROUPS } from "@/lib/useful-local";

export const metadata = {
  title: "Useful local",
};

export default function LocalPage() {
  return (
    <PublicShell active="/local" header="compact">
      <div className="local-page">
        <header className="local-hero">
          <p className="local-kicker">Bay side</p>
          <h1 className="local-hed">Useful local</h1>
          <p className="local-lead">
            Standing outbound directories and places. Not Events, and not news.
          </p>
        </header>

        <div className="local-groups">
          {LOCAL_GROUPS.map((group) => (
            <section key={group.id} className="local-group">
              <h2 className="local-group-hed">{group.title}</h2>
              <ul className="local-list">
                {group.links.map((link) => (
                  <li key={link.href} className="local-row">
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="local-title"
                    >
                      {link.label}
                      <span aria-hidden> ↗</span>
                    </a>
                    <p className="local-dek">{link.dek}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
