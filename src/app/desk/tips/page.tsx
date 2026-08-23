import { DeskChrome } from "@/components/desk/DeskChrome";
import { formatStoryDateline } from "@/lib/dates";
import { listTips } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskTipsPage() {
  const tips = await listTips();

  return (
    <DeskChrome active="tips">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Tips</h1>
        <p className="mt-2 text-[#444]">
          From the public tip form. Newest first. Not emailed out — reading
          happens here. Do not invent tips.
        </p>
        <p className="mt-2 text-sm text-muted">
          {tips.length} tip{tips.length === 1 ? "" : "s"}
          {tips.length ? "" : " (none yet)"}.
        </p>

        {tips.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No tips yet. Public{" "}
            <a href="/tips" className="font-semibold text-teal hover:underline">
              /tips
            </a>{" "}
            writes here.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {tips.map((tip) => (
              <li
                key={tip.id}
                className="border border-[#ddd4c4] bg-paper-2 px-4 py-3"
              >
                <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
                  {formatStoryDateline(tip.created_at)}
                  {tip.name ? ` · ${tip.name}` : ""}
                  {tip.email ? ` · ${tip.email}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                  {tip.body}
                </p>
                {tip.url ? (
                  <p className="mt-2 text-sm">
                    <a
                      href={tip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-teal hover:underline"
                    >
                      {tip.url}
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DeskChrome>
  );
}
