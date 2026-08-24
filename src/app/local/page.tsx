import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { getSectionHeadersSnapshot } from "@/lib/public-snapshots";
import { LOCAL_GROUPS } from "@/lib/useful-local";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Useful local",
};

export default async function LocalPage() {
  const headers = await getSectionHeadersSnapshot();

  return (
    <PublicShell active="/local" header="compact">
      <div className="local-page">
        <SectionHero
          kicker="Bay side"
          title="Useful local"
          header={headers.headers.local}
          dek="Standing outbound directories and places. Not Events, and not news."
        />

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
