import { DeskChrome } from "@/components/desk/DeskChrome";
import { HomeTaglineEditor } from "@/components/desk/HomeTaglineEditor";
import { PageCopyEditor } from "@/components/desk/PageCopyEditor";
import { SectionHeadersEditor } from "@/components/desk/SectionHeadersEditor";
import { getAppData } from "@/lib/data/store";
import { resolvePageCopy } from "@/lib/page-copy";
import {
  emptySectionHeaders,
  INTERIOR_SECTION_HEADER_IDS,
} from "@/lib/section-headers";
import { getSite } from "@/lib/sites";
import { getTodaysWeatherLine } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function DeskSectionHeadersPage() {
  const data = await getAppData();
  const headers = {
    ...emptySectionHeaders(),
    ...(data.section_headers ?? {}),
  };
  const pageCopy = resolvePageCopy(data.page_copy);
  const site = getSite();
  const weatherLine = await getTodaysWeatherLine().catch(() => null);

  return (
    <DeskChrome
      active="headers"
      lastPullAt={data.last_pull_at}
      pulledItemCount={data.stories.filter((s) => !s.is_original).length}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Home &amp; headers</h1>
        <p className="mt-2 text-[#444]">
          Homepage photo and tagline, interior section photos, and the Events /
          About copy. Weather under the tagline comes from NWS on the weekday
          pull. Public pages pick up saves after the snapshot rebuild.
        </p>

        <h2 className="mt-10 font-serif text-2xl">Homepage</h2>
        <p className="mt-2 text-sm text-[#444]">
          Photo band plus the one-line tagline. Weather is not a typed field.
        </p>
        <div className="mt-6 space-y-8">
          <SectionHeadersEditor
            initial={headers}
            ids={["home"]}
            showIntro={false}
            fallbacks={{
              home: { src: site.hero.src, alt: site.hero.alt },
            }}
          />
          <HomeTaglineEditor
            initialDek={pageCopy.hero_dek}
            defaultDek={site.hero.dek}
            weatherLine={weatherLine}
          />
        </div>

        <h2 className="mt-14 font-serif text-2xl">Interior photos</h2>
        <p className="mt-2 text-sm text-[#444]">
          Events, Shows, Sports, Civic, Schools, and Local photo bands.
        </p>
        <div className="mt-6">
          <SectionHeadersEditor
            initial={headers}
            ids={INTERIOR_SECTION_HEADER_IDS}
            showIntro={false}
          />
        </div>

        <h2 className="mt-14 font-serif text-2xl">Page copy</h2>
        <p className="mt-2 text-sm text-[#444]">
          Events dek and the full About page. No code deploy to change the
          wording.
        </p>
        <div className="mt-6">
          <PageCopyEditor initial={pageCopy} />
        </div>
      </div>
    </DeskChrome>
  );
}
