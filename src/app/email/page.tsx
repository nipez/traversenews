import { PublicShell } from "@/components/PublicShell";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { emailDateLabel } from "@/lib/dates";
import { getEmailPreviewData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Morning email",
};

export default async function EmailPreviewPage() {
  const { featuredOriginal, rest, weekendEvents, civic } =
    await getEmailPreviewData();

  const wireOnly = rest.filter((r) => r.title !== featuredOriginal?.title);

  return (
    <PublicShell active="/" header="compact">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          Preview only. Sending is not wired up yet.
        </p>

        <div className="mt-4 border border-ink bg-paper p-5 md:p-8">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-3">
            <p className="wordmark wordmark-ink text-[1.4rem]">
              traverse<span className="wordmark-dot">.</span>news
            </p>
            <p className="text-[0.65rem] font-extrabold tracking-[0.08em] text-muted uppercase">
              {emailDateLabel()}
            </p>
          </div>

          <p className="mt-5 font-serif text-[1.05rem] leading-relaxed text-muted-2">
            {featuredOriginal
              ? "Good morning. Start with our reporting, then the rest of the town and what's on tonight."
              : "Good morning. Here's the rest of the town from other desks, then what's on tonight."}
          </p>

          {featuredOriginal ? (
            <div className="mt-6 border border-ink bg-peach p-4">
              <div className="lead-kicker-row">
                <span className="lead-sq" aria-hidden />
                <p className="lead-kicker">The one to read</p>
              </div>
              <h2 className="mt-2 font-display text-2xl leading-snug font-black tracking-tight">
                <a href={featuredOriginal.url}>{featuredOriginal.title}</a>
              </h2>
              {featuredOriginal.dek ? (
                <p className="mt-2 font-serif text-sm text-muted-2">
                  {featuredOriginal.dek}
                </p>
              ) : null}
              <div className="mt-3">
                <span className="source-box">traverse.news</span>
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-[0.65rem] font-extrabold tracking-[0.1em] text-muted uppercase">
            The rest of the town
          </p>
          <ul className="mt-2">
            {(featuredOriginal ? wireOnly : rest).map((item) => (
              <li key={item.title} className="border-t border-rule py-4">
                <h3 className="font-serif text-lg leading-snug font-semibold">
                  <a href={item.url}>{item.title}</a>
                </h3>
                {item.dek ? (
                  <p className="mt-1 text-sm text-muted-2">{item.dek}</p>
                ) : null}
                <p className="mt-2 text-sm font-bold text-teal">
                  {item.sources.join(" · ")}
                </p>
              </li>
            ))}
            {rest.length === 0 && !featuredOriginal ? (
              <li className="border-t border-rule py-4 text-sm text-muted">
                No wire yet — we do not invent stories.
              </li>
            ) : null}
          </ul>

          <div className="mt-6 border border-ink bg-peach p-4">
            <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-ink uppercase">
              Tonight
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {weekendEvents.map((e) => (
                <li key={e.id}>
                  <strong className="font-display">
                    {new Date(e.starts_at).toLocaleString("en-US", {
                      timeZone: "America/Detroit",
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </strong>
                  {" — "}
                  {e.title}. {e.place}
                </li>
              ))}
              {weekendEvents.length === 0 ? (
                <li className="text-muted">No night-out listings yet.</li>
              ) : null}
            </ul>
          </div>

          <div className="mt-6">
            <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-teal uppercase">
              Civic this week
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {civic.map((e) => (
                <li key={e.id}>
                  <strong>
                    {new Date(e.starts_at).toLocaleDateString("en-US", {
                      timeZone: "America/Detroit",
                      weekday: "short",
                      day: "numeric",
                    })}
                  </strong>
                  {" — "}
                  <span className="text-teal">{e.title}</span>. {e.place}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 border-t-2 border-ink pt-4 text-sm text-muted">
            <p>
              Send us a tip:{" "}
              <a className="font-bold text-teal" href="mailto:tips@traverse.news">
                tips@traverse.news
              </a>
            </p>
            <p className="mt-2 text-xs">
              Traverse City, Michigan · Unsubscribe · Weekdays and Saturdays
            </p>
          </div>
        </div>

        <div className="mt-10">
          <MorningScanSignup variant="box" />
        </div>
      </div>
    </PublicShell>
  );
}
