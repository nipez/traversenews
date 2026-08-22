import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { listStories } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskOriginalsPage() {
  const originals = (await listStories()).filter((s) => s.is_original);
  return (
    <DeskChrome active="originals">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Originals</h1>
        <p className="mt-2 text-[#444]">
          Staff pieces land here when someone on the desk writes them. Empty is
          correct until then — we do not invent reporting.
        </p>
        {originals.length === 0 ? (
          <p className="mt-8 border-t border-rule pt-6 text-sm text-muted">
            No originals yet.
          </p>
        ) : (
          <ul className="mt-6">
            {originals.map((story) => (
              <li key={story.id} className="border-t border-rule py-3">
                <Link
                  href={`/story/${story.slug}`}
                  className="font-serif text-xl hover:text-teal"
                >
                  {story.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
