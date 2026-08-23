import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { SourceForm } from "@/components/desk/SourceForm";
import { buildSourceInventory } from "@/lib/desk/source-inventory";
import { formatEventWhen, formatShortDate } from "@/lib/dates";
import { getAppData, getSource } from "@/lib/data/store";
import { getHomepageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditSourcePage({ params }: Props) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();
  const data = await getAppData();
  const beat = data.beats.find((b) => b.id === source.beat_id);
  const homepage = await getHomepageData();
  const homepageStoryUrls = new Set<string>();
  const homepageStoryIds = new Set<string>();
  for (const card of [
    ...(homepage.lead ? [homepage.lead] : []),
    ...homepage.around,
    ...homepage.moreFromUs,
  ]) {
    if (card.url) homepageStoryUrls.add(card.url);
    homepageStoryIds.add(card.id);
  }

  const inventory = buildSourceInventory({
    source,
    beat_name: beat?.name ?? "—",
    stories: data.stories,
    events: data.events,
    editions: data.editions,
    homepageStoryUrls,
    homepageStoryIds,
  });

  const lastPull =
    source.last_pulled_at ||
    (data.last_pull_at && source.enabled ? data.last_pull_at : null);

  return (
    <DeskChrome backHref="/desk">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Source
            </p>
            <h1 className="mt-1 font-serif text-3xl text-ink md:text-4xl">
              {source.name}
            </h1>
            <p className="mt-2 text-sm text-[#444]">
              {inventory.beat_name} · {source.pull_method} ·{" "}
              {source.enabled ? "On" : "Off"} · {inventory.story_count} stories ·{" "}
              {inventory.event_count} events
            </p>
            <p className="mt-1 text-sm text-muted">
              Last pull:{" "}
              {lastPull
                ? new Date(lastPull).toLocaleString("en-US", {
                    timeZone: "America/Detroit",
                  })
                : "—"}
            </p>
            {source.last_pull_error ? (
              <p className="mt-2 max-w-2xl text-sm text-red-800">
                {source.last_pull_error}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-2">
              <a
                href={source.homepage}
                className="text-teal"
                target="_blank"
                rel="noreferrer"
              >
                {source.homepage.replace(/^https?:\/\//, "")}
              </a>
              {source.feed_url ? (
                <>
                  {" "}
                  · feed{" "}
                  <a
                    href={source.feed_url}
                    className="text-teal"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.feed_url.replace(/^https?:\/\//, "")}
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/desk" className="btn-ghost">
              Back
            </Link>
          </div>
        </div>

        <section className="mb-10 border border-rule bg-white/80 p-5">
          <h2 className="font-serif text-2xl text-ink">Ingested items</h2>
          <p className="mt-1 text-sm text-[#444]">
            Read from store filtered by this source — nothing invented here.
          </p>

          {inventory.empty_hint ? (
            <p className="mt-4 text-sm text-muted">{inventory.empty_hint}</p>
          ) : null}

          {inventory.stories.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Stories ({inventory.story_count})
              </h3>
              <ul className="mt-3 divide-y divide-rule">
                {inventory.stories.map((story) => (
                  <li key={story.id} className="py-3">
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink hover:text-teal"
                    >
                      {story.title}
                    </a>
                    {story.dek ? (
                      <p className="mt-1 text-sm text-[#444]">{story.dek}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      {formatShortDate(story.published_at)}
                      {story.on_homepage ? " · On homepage" : ""}
                      {story.edition_dates.length > 0
                        ? ` · Editions: ${story.edition_dates.slice(0, 5).join(", ")}${
                            story.edition_dates.length > 5 ? "…" : ""
                          }`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {inventory.events.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
                Events ({inventory.event_count})
              </h3>
              <ul className="mt-3 divide-y divide-rule">
                {inventory.events.map((event) => (
                  <li key={event.id} className="py-3">
                    {event.url ? (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-ink hover:text-teal"
                      >
                        {event.title}
                      </a>
                    ) : (
                      <p className="font-medium text-ink">{event.title}</p>
                    )}
                    <p className="mt-1 text-sm text-[#444]">
                      {formatEventWhen(event.starts_at, new Date(), {
                        timeUnknown: event.time_unknown,
                      })}
                      {event.place ? ` · ${event.place}` : ""}
                    </p>
                    {event.edition_dates.length > 0 ? (
                      <p className="mt-1 text-xs text-muted">
                        Editions: {event.edition_dates.slice(0, 5).join(", ")}
                        {event.edition_dates.length > 5 ? "…" : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="border-t border-rule pt-8">
          <h2 className="font-serif text-2xl text-ink">Edit source</h2>
          <p className="mt-1 mb-6 text-sm text-[#444]">
            Change wiring, beat, or enable flag.
          </p>
          <SourceForm
            beats={data.beats}
            initial={source}
            recentStories={inventory.stories}
          />
        </div>
      </div>
    </DeskChrome>
  );
}
