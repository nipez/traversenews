import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { listDrafts } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskOriginalsPage() {
  const drafts = await listDrafts();
  const open = drafts.filter((d) => d.status === "draft");
  const published = drafts.filter((d) => d.status === "published");

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

        {drafts.length === 0 ? (
          <p className="mt-10 border-t border-rule pt-6 text-sm text-muted">
            No drafts yet. Empty is correct until Nick writes one from a real
            wire item.
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            <section>
              <h2 className="font-serif text-2xl">Drafts</h2>
              {open.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No open drafts.</p>
              ) : (
                <ul className="mt-4">
                  {open.map((d) => (
                    <li key={d.id} className="border-t border-rule py-3">
                      <Link
                        href={`/desk/originals/${d.id}`}
                        className="font-serif text-xl hover:text-teal"
                      >
                        {d.title || "Untitled draft"}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        draft · updated{" "}
                        {new Date(d.updated_at).toLocaleString("en-US", {
                          timeZone: "America/Detroit",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-serif text-2xl">Published</h2>
              {published.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Nothing published yet — homepage originals stay empty.
                </p>
              ) : (
                <ul className="mt-4">
                  {published.map((d) => (
                    <li key={d.id} className="border-t border-rule py-3">
                      <Link
                        href={`/desk/originals/${d.id}`}
                        className="font-serif text-xl hover:text-teal"
                      >
                        {d.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        published
                        {d.slug ? (
                          <>
                            {" · "}
                            <Link href={`/story/${d.slug}`} className="text-teal">
                              /story/{d.slug}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </DeskChrome>
  );
}
