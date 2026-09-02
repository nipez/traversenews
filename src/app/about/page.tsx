import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { getPageCopySnapshot } from "@/lib/public-snapshots";
import { SafeEssayBody, SafeInlineCopy } from "@/lib/safe-copy";
import { siteWordmark } from "@/lib/sites";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: `About ${siteWordmark()}` };
}

export default async function AboutPage() {
  const { copy } = await getPageCopySnapshot();

  return (
    <PublicShell active="/" header="compact">
      <div className="about-layout">
        <article className="about-essay">
          <h1 className="about-hed">{copy.about_title}</h1>
          <p className="about-dek">
            <SafeInlineCopy text={copy.about_dek} />
          </p>

          <div className="about-body">
            <SafeEssayBody body={copy.about_body} />
          </div>
        </article>

        <DeskRail active="/about" />
      </div>
    </PublicShell>
  );
}
