import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { SmartAddSource } from "@/components/desk/SmartAddSource";
import { beatSourceCounts } from "@/lib/data/seed";
import { getAppData } from "@/lib/data/store";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ beat?: string }> };

export default async function DeskSourcesPage({ searchParams }: Props) {
  const { beat: beatSlug } = await searchParams;
  const data = await getAppData();
  const counts = beatSourceCounts(data);
  const selected =
    data.beats.find((b) => b.slug === (beatSlug || "all")) ?? data.beats[0];

  const sources =
    selected.slug === "all"
      ? data.sources
      : data.sources.filter((s) => s.beat_id === selected.id);

  const offCount = sources.filter((s) => !s.enabled).length;
  const beatName = (id: string) =>
    data.beats.find((b) => b.id === id)?.name ?? "—";

  return (
    <DeskChrome
      active="sources"
      lastPullAt={data.last_pull_at}
      pulledItemCount={data.stories.filter((s) => !s.is_original).length}
    >
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:px-6">
        <aside className="desk-beats">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[0.68rem] font-bold tracking-[0.1em] text-ink uppercase">
              Beats
            </p>
            <span className="hidden text-xs font-semibold text-teal md:inline">Add</span>
          </div>
          <ul className="desk-beats-list">
            {data.beats.map((beat) => {
              const active = beat.id === selected.id;
              return (
                <li key={beat.id}>
                  <Link
                    href={
                      beat.slug === "all" ? "/desk" : `/desk?beat=${beat.slug}`
                    }
                    className={`desk-beat-link ${
                      active ? "is-active" : ""
                    }`}
                  >
                    <span>{beat.name}</span>
                    <span className="text-muted-2">{counts[beat.id] ?? 0}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <input
            className="input mt-3 hidden md:block"
            placeholder="New beat"
            disabled
            title="Beat creation ships next"
          />
        </aside>

        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-ink">{selected.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {sources.length} sources. {offCount} off.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" disabled>
                Export
              </button>
              <Link href="/desk/sources/new" className="btn-teal">
                Add source
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <SmartAddSource beats={data.beats} compact />
          </div>

          <div className="mt-4 border border-[#ddd4c4] bg-paper-2 px-4 py-3">
            <p className="text-sm font-medium text-ink">Hand-add an alert</p>
            <p className="mt-0.5 text-sm text-muted">
              {getSite().pageCopy.deskAlertHint}
            </p>
            <Link href="/desk/alerts" className="mt-2 inline-block text-sm font-semibold text-teal hover:underline">
              Open Alerts →
            </Link>
          </div>

          <ul className="desk-source-cards mt-6 md:hidden">
            {sources.map((source) => (
              <li key={source.id}>
                <Link href={`/desk/sources/${source.id}`}>
                  <strong>{source.name}</strong>
                  <span>{beatName(source.beat_id)} · {source.enabled ? "On" : "Off"}</span>
                  <em>{source.pull_method}</em>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="desk-table w-full min-w-[760px]">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Beat</th>
                  <th>Pull</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td>
                      <Link
                        href={`/desk/sources/${source.id}`}
                        className="font-semibold text-teal hover:underline"
                      >
                        {source.name}
                      </Link>
                      <div className="text-xs text-muted">
                        {source.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </div>
                    </td>
                    <td>{beatName(source.beat_id)}</td>
                    <td>
                      <span className="source-pill text-teal">
                        {source.pull_method}
                      </span>
                      <div className="mt-0.5 text-xs text-muted">
                        {source.last_pulled_at
                          ? new Date(source.last_pulled_at).toLocaleString(
                              "en-US",
                              {
                                timeZone: "America/Detroit",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          : "No pull yet"}
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            source.enabled ? "bg-teal" : "bg-[#c5c5c5]"
                          }`}
                        />
                        {source.enabled ? "On" : "Off"}
                      </span>
                    </td>
                    <td className="max-w-[240px] text-sm text-[#444]">
                      {source.notes || "—"}
                    </td>
                    <td>
                      <Link
                        href={`/desk/sources/${source.id}`}
                        className="font-semibold text-teal"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-xs text-muted-2">
            Disabled sources are never pulled. Aggregated items publish as
            headline, dek and a link out.
          </p>
        </section>
      </div>
    </DeskChrome>
  );
}
