import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { OriginalsIndex } from "@/components/desk/OriginalsIndex";
import { listDrafts } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskOriginalsPage() {
  const drafts = await listDrafts();

  return (
    <DeskChrome active="originals">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Originals</h1>
            <p className="mt-2 max-w-xl text-[#444]">
              Staff drafts become traverse.news reporting only after you publish.
              Unpublished drafts never hit the public site. Do not invent quotes
              or facts.
            </p>
          </div>
          <Link href="/desk/originals/new" className="btn-teal">
            Draft from a pulled story
          </Link>
        </div>

        <OriginalsIndex drafts={drafts} />
      </div>
    </DeskChrome>
  );
}
