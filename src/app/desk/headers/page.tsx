import { DeskChrome } from "@/components/desk/DeskChrome";
import { SectionHeadersEditor } from "@/components/desk/SectionHeadersEditor";
import { getAppData } from "@/lib/data/store";
import { emptySectionHeaders } from "@/lib/section-headers";

export const dynamic = "force-dynamic";

export default async function DeskSectionHeadersPage() {
  const data = await getAppData();
  const headers = {
    ...emptySectionHeaders(),
    ...(data.section_headers ?? {}),
  };

  return (
    <DeskChrome active="headers">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Section headers</h1>
        <p className="mt-2 text-[#444]">
          Replace the photo band on Events, Sports, Civic, Schools, and Local.
          Public pages pick up the change after the snapshot rebuild on save.
        </p>
        <div className="mt-8">
          <SectionHeadersEditor initial={headers} />
        </div>
      </div>
    </DeskChrome>
  );
}
