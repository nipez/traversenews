import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { formatEventWhen } from "@/lib/dates";
import { getAppData, listEvents } from "@/lib/data/store";
import { dedupeEvents, selectTonightEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "What's on",
};

export default async function WhatsOnPage() {
  const data = await getAppData();
  const all = await listEvents();
  const featured = selectTonightEvents(all, data.sources, {
    limit: 8,
    horizonDays: 7,
    maxMeetings: 1,
    maxPerSource: 3,
  });

  const upcoming = dedupeEvents(all).filter(
    (e) => new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000,
  );

  return (
    <PublicShell active="/whats-on">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">What&apos;s on</h1>
        <p className="mt-2 text-[#444]">
          Concerts, festivals, library programs, and things to do around Traverse
          City — meetings stay on Civic.
        </p>

        <div className="mt-8">
          <TonightBlock events={featured} />
        </div>

        <ul className="mt-10">
          {upcoming.map((event) => (
            <li key={event.id} className="border-t border-rule py-4">
              <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-teal uppercase">
                {formatEventWhen(event.starts_at)}
              </p>
              <h2 className="mt-1 font-serif text-xl">
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noopener noreferrer">
                    {event.title} ↗
                  </a>
                ) : (
                  event.title
                )}
              </h2>
              <p className="mt-1 text-sm text-muted">{event.place}</p>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
