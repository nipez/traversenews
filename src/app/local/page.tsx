import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { getSectionHeadersSnapshot } from "@/lib/public-snapshots";
import { getLocalGroups } from "@/lib/useful-local";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Useful local",
};

export default async function LocalPage() {
  const headers = await getSectionHeadersSnapshot();

  return (
    <PublicShell active="/local" header="compact">
      <SectionHero
        kicker={getSite().localKicker}
        title="Useful local"
        header={headers.headers.local}
        dek="Standing outbound directories and places."
      />
      <div className="about-layout local-layout">
        <div className="about-essay local-main">
        <div className="local-page">
        <div className="local-groups">
          {getLocalGroups().map((group) => (
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
        </div>
        <DeskRail active="/local" />
      </div>
    </PublicShell>
  );
}
