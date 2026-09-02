import { DeskChrome } from "@/components/desk/DeskChrome";
import { AddAlertForm } from "@/components/desk/AddAlertForm";
import { isAlertSourceId, selectAlerts } from "@/lib/alerts";
import { getAppData } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskAlertsPage() {
  const data = await getAppData();
  const strip = selectAlerts(data.stories, data.sources, { limit: 3 });
  const allAlertStories = data.stories
    .filter((s) => !s.is_original && isAlertSourceId(s.source_id))
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

  const sourceName = (id: string) =>
    data.sources.find((s) => s.id === id)?.name ?? id;

  return (
    <DeskChrome
      active="alerts"
      lastPullAt={data.last_pull_at}
      pulledItemCount={data.stories.filter((s) => !s.is_original).length}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="font-serif text-3xl text-ink">Alerts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Hand-add a Facebook or Grand Traverse 911 post when you see one.
          Uses the same stories import as browser pull (`src_gt911` /
          `src_ticker_fb`). Never invents posts. Does not write to Events.
        </p>

        <div className="mt-6">
          <AddAlertForm
            existingAlerts={allAlertStories.map((s) => ({
              id: s.id,
              title: s.title,
              url: s.url,
              source_id: s.source_id,
            }))}
          />
        </div>

        <section className="mt-10">
          <h2 className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
            On the strip now
          </h2>
          {strip.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Empty — homepage Alerts strip stays hidden until something is
              saved.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {strip.map((a) => (
                <li key={a.id} className="border-b border-[#e6ddd0] pb-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
                    {a.source_name}
                  </p>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block font-serif text-lg text-teal hover:underline"
                  >
                    {a.title}
                  </a>
                  {a.dek ? (
                    <p className="mt-0.5 text-sm text-muted">{a.dek}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {allAlertStories.length > strip.length ? (
          <section className="mt-8">
            <h2 className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
              Stored alerts ({allAlertStories.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {allAlertStories.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <span className="text-muted-2">{sourceName(s.source_id)}</span>
                  {" · "}
                  {s.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </DeskChrome>
  );
}
