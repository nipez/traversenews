import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { OriginalDraftEditor } from "@/components/desk/OriginalDraftEditor";
import { getDraft } from "@/lib/data/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditOriginalDraftPage({ params }: Props) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();

  return (
    <DeskChrome active="originals">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <p className="text-sm">
          <Link href="/desk/originals" className="text-teal">
            ← Originals
          </Link>
        </p>
        <h1 className="mt-4 font-serif text-3xl">Edit original</h1>
        <p className="mt-2 max-w-2xl text-[#444]">
          Publish only when the checklist is honest. Drafts stay Desk-only.
        </p>
        <div className="mt-8">
          <OriginalDraftEditor draft={draft} />
        </div>
      </div>
    </DeskChrome>
  );
}
