import { DeskChrome } from "@/components/desk/DeskChrome";
import { AddAlertForm } from "@/components/desk/AddAlertForm";
import { DeskAlertsList } from "@/components/desk/DeskAlertsList";
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

  const stripIds = new Set(strip.map((a) => a.id));
  const storedOnly = allAlertStories
    .filter((s) => !stripIds.has(s.id))
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      title: s.title,
      dek: s.dek ?? "",
      url: s.url,
      source_name: sourceName(s.source_id),
    }));

  return (
    <DeskChrome active="alerts">
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

        <DeskAlertsList
          heading="On the strip now"
          empty="Empty — homepage Alerts strip stays hidden until something is saved."
          items={strip.map((a) => ({
            id: a.id,
            title: a.title,
            dek: a.dek ?? "",
            url: a.url,
            source_name: a.source_name,
          }))}
        />

        {storedOnly.length > 0 ? (
          <DeskAlertsList
            heading={`Stored alerts (${allAlertStories.length})`}
            empty=""
            items={storedOnly}
          />
        ) : null}
      </div>
    </DeskChrome>
  );
}
