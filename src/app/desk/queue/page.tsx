import { DeskChrome } from "@/components/desk/DeskChrome";
import { DeskGlobalPull } from "@/components/desk/DeskGlobalPull";
import { getAppData } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskQueuePage() {
  const data = await getAppData();
  return (
    <DeskChrome
      active="queue"
      lastPullAt={data.last_pull_at}
      pulledItemCount={data.stories.filter((s) => !s.is_original).length}
    >
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <h1 className="font-serif text-3xl">Queue</h1>
        <p className="mt-3 text-[#444]">
          Intake and clustering review ships next. For now, pull all feeds from
          Desk (same{" "}
          <code className="bg-paper-2 px-1">POST /api/pull</code> as the Worker
          cron) and read the public homepage.
        </p>
        <div className="mt-6">
          <DeskGlobalPull
            variant="panel"
            lastPullAt={data.last_pull_at}
            itemCount={data.stories.filter((s) => !s.is_original).length}
          />
        </div>
      </div>
    </DeskChrome>
  );
}
