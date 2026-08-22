import { PublicShell } from "@/components/PublicShell";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { TonightBlock } from "@/components/TonightBlock";
import { emailDateLabel } from "@/lib/dates";
import { getEmailPreviewData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Morning email",
};

export default async function EmailPreviewPage() {
  const { featuredOriginal, oneToRead, rest, weekendEvents, civic } =
    await getEmailPreviewData();

  const subjectLead =
    oneToRead?.title.split(/[,:—]/)[0] ??
    featuredOriginal?.title.split(/[,:—]/)[0] ??
    "Saturday in Traverse City";

  return (
    <PublicShell active="/">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          Preview only. Sending is not wired up yet.
        </p>

        <div className="mt-4 border border-rule bg-white/70 p-5 md:p-8">
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-3">
            <p className="font-serif text-xl">traverse.news</p>
            <p className="text-[0.68rem] font-semibold tracking-[0.06em] text-muted uppercase">
              {emailDateLabel()}
            </p>
          </div>

          <p className="mt-5 font-serif text-[1.05rem] leading-relaxed text-[#333]">
            {featuredOriginal
              ? `Good morning. We have original reporting on ${featuredOriginal.title.split(".")[0].toLowerCase()}, plus the wires on ${subjectLead.toLowerCase()} and what's on tonight.`
              : `Good morning. Here's Saturday in Traverse City — five things, then what's on tonight.`}
          </p>

          {featuredOriginal ? (
            <div className="mt-6 border border-rule bg-paper-2 p-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-teal uppercase">
                The one to read
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-snug">
                <a href={featuredOriginal.url}>{featuredOriginal.title}</a>
              </h2>
              <p className="mt-2 text-sm text-[#444]">{featuredOriginal.dek}</p>
              <div className="mt-3">
                <span className="source-pill text-teal">traverse.news</span>
              </div>
            </div>
          ) : oneToRead ? (
            <div className="mt-6 border border-rule bg-paper-2 p-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-teal uppercase">
                The one to read
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-snug">
                <a href={oneToRead.url} target="_blank" rel="noopener noreferrer">
                  {oneToRead.title}
                </a>
              </h2>
              <p className="mt-2 text-sm text-[#444]">{oneToRead.dek}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {oneToRead.sources.map((s) => (
                  <span key={s.id} className="source-pill text-teal">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">
            The rest of the town
          </p>
          <ul className="mt-2">
            {rest
              .filter((r) => r.title !== featuredOriginal?.title)
              .map((item) => (
                <li key={item.title} className="border-t border-rule py-4">
                  <h3 className="font-serif text-lg leading-snug">
                    <a href={item.url}>{item.title}</a>
                  </h3>
                  <p className="mt-1 text-sm text-[#444]">{item.dek}</p>
                  <p className="mt-2 text-sm text-teal">
                    {item.sources.join(" · ")}
                  </p>
                </li>
              ))}
          </ul>

          <div className="mt-6">
            <TonightBlock events={weekendEvents} />
          </div>

          <div className="mt-6">
            <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-teal uppercase">
              Civic this week
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {civic.map((e) => (
                <li key={e.id}>
                  <strong>
                    {new Date(e.starts_at).toLocaleDateString("en-US", {
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

          <div className="mt-8 border-t border-rule pt-4 text-sm text-muted">
            <p>
              Send us a tip:{" "}
              <a className="font-semibold text-teal" href="mailto:tips@traverse.news">
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
