import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { SourceForm } from "@/components/desk/SourceForm";
import { getAppData, getSource } from "@/lib/data/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditSourcePage({ params }: Props) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();
  const data = await getAppData();
  const recent = data.stories
    .filter((s) => s.source_id === source.id)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

  return (
    <DeskChrome backHref="/desk">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Edit source
            </p>
            <h1 className="mt-1 font-serif text-3xl text-ink md:text-4xl">
              {source.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/desk" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </div>
        <SourceForm beats={data.beats} initial={source} recentStories={recent} />
      </div>
    </DeskChrome>
  );
}
