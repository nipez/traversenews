import { DeskChrome } from "@/components/desk/DeskChrome";
import { EventTipsDeskList } from "@/components/desk/EventTipsDeskList";
import { listEventTips } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskEventsPage() {
  const tips = await listEventTips();

  return (
    <DeskChrome active="events">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Events tips</h1>
        <p className="mt-2 text-[#444]">
          Reader nights out from /whats-on. Confirm adds one row to public
          Events as{" "}
          <code className="bg-paper-2 px-1">src_reader_events</code>. Dismiss
          skips it. Never auto-import. Civic meetings do not belong here.
        </p>
        <div className="mt-8">
          <EventTipsDeskList tips={tips} />
        </div>
      </div>
    </DeskChrome>
  );
}
