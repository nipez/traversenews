import { DeskChrome } from "@/components/desk/DeskChrome";
import { PageCopyEditor } from "@/components/desk/PageCopyEditor";
import { SectionHeadersEditor } from "@/components/desk/SectionHeadersEditor";
import { getAppData } from "@/lib/data/store";
import { resolvePageCopy } from "@/lib/page-copy";
import { emptySectionHeaders } from "@/lib/section-headers";

export const dynamic = "force-dynamic";

export default async function DeskSectionHeadersPage() {
  const data = await getAppData();
  const headers = {
    ...emptySectionHeaders(),
    ...(data.section_headers ?? {}),
  };
  const pageCopy = resolvePageCopy(data.page_copy);

  return (
    <DeskChrome active="headers">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Headers &amp; page copy</h1>
        <p className="mt-2 text-[#444]">
          Edit the static dek and About essay, or replace the photo band on
          section pages. Public pages pick up saves after the snapshot rebuild.
        </p>

        <h2 className="mt-10 font-serif text-2xl">Page copy</h2>
        <p className="mt-2 text-sm text-[#444]">
          Events dek and the full About page live here — no code deploy to
          change the wording.
        </p>
        <div className="mt-6">
          <PageCopyEditor initial={pageCopy} />
        </div>

        <h2 className="mt-14 font-serif text-2xl">Section photos</h2>
        <p className="mt-2 text-sm text-[#444]">
          Events, Sports, Civic, Schools, Shows, and Local photo bands.
        </p>
        <div className="mt-6">
          <SectionHeadersEditor initial={headers} />
        </div>
      </div>
    </DeskChrome>
  );
}
