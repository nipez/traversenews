import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { DraftFromPullPicker } from "@/components/desk/DraftFromPullPicker";
import { getAppData } from "@/lib/data/store";
import { clusterStories } from "@/lib/pull/cluster";

export const dynamic = "force-dynamic";

export default async function NewOriginalDraftPage() {
  const data = await getAppData();
  const clusters = clusterStories(data.stories, data.sources)
    .filter((c) => !c.is_original)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

  return (
    <DeskChrome active="originals">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <p className="text-sm">
          <Link href="/desk/originals" className="text-teal">
            ← Originals
          </Link>
        </p>
        <h1 className="mt-4 font-serif text-3xl">Draft from a pulled story</h1>
        <p className="mt-2 max-w-2xl text-[#444]">
          Pick a live clustered item. The draft starts with that title, dek, and
          permalink in <code>source_urls</code>. You may only use facts from
          that source — no invented quotes, crashes, or “organizers say” lines.
        </p>
        <DraftFromPullPicker clusters={clusters} />
      </div>
    </DeskChrome>
  );
}
