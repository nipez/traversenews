import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";

export const metadata = {
  title: "About traverse.news",
};

export default function AboutPage() {
  return (
    <PublicShell active="/" header="compact">
      <div className="about-layout">
        <article className="about-essay">
          <h1 className="about-hed">About traverse.news</h1>
          <p className="about-dek">
            A Traverse City desk. One place to read the bay.
          </p>

          <div className="about-body">
            <h2>Why this exists</h2>
            <p>
              Traverse City does not have a shortage of information. It has a
              shortage of one place to put it.
            </p>
            <p>
              If you want to know what happened, what’s tonight, and who is
              meeting on Tuesday, you still have to open the Record-Eagle, the
              Ticker, TCBN, Northern Express, IPR, 9&amp;10, Visit TC, CivicWeb,
              the library, Interlochen, Facebook groups, and a stack of org
              calendars. Most people do not. They miss the meeting, the detour,
              and the show.
            </p>
            <p>
              traverse.news exists so you do not have to do that circuit. One
              site. The original story when we have one. Everyone else’s
              headline when they have one. The night out. The civic calendar.
              The alert when the road is closed.
            </p>
            <p>
              That is the whole vision: be the one tab that covers Traverse City
              and the towns around the bay.
            </p>

            <h2>What you will find</h2>
            <p>
              <strong>Today</strong> is the paper. A traverse.news original
              leads when we have published one. Under that, Around the bay is
              other desks — Record-Eagle, the Ticker, IPR, 9&amp;10, Northern
              Express, and local orgs — as headlines that link out. We do not
              reprint their stories.
            </p>
            <p>
              <strong>Events</strong> is concerts, markets, library programs,
              and nights out. <strong>Civic Calendar</strong> is boards and
              government only. We pull from public listings. If a source does
              not print a time, we leave the time blank. We do not invent noon,
              “tomorrow,” or a show that is not on the calendar.
            </p>
            <p>
              <strong>Alerts</strong> is breaking and official: Grand Traverse
              911 and the Ticker’s Facebook when the post is a crash, outage,
              closure, or warning. It is not a Facebook dump and it is not
              Overheard.
            </p>
            <p>
              <strong>Morning email</strong> is the same desk in your inbox. One
              pass before the day starts.
            </p>

            <h2>How we write</h2>
            <p>
              Original reporting on this site is traverse.news reporting, under
              Nick Perez. Drafts can be built from real public sources. They
              stay in the Desk until they are published. We do not invent
              people, quotes, crashes, or “organizers say” lines. If we use a
              sentence that appeared in another outlet, we say so and we link
              it.
            </p>
            <p>
              When a story is a synthesis of the local record, the article ends
              with those permalinks. That is the paper trail, not a reprint.
            </p>

            <h2>What we will not do</h2>
            <p>
              We will not scrape a paywall and paste the body. Record-Eagle and
              anyone else with a wall stay as headline, dek, and a link.
            </p>
            <p>
              We will not empty Overheard in TC onto the homepage. That group is
              a tip wire. Complaint pile-ons, doxxing, and unverified
              accusations stay off the public site.
            </p>
            <p>
              We will not publish a calendar item we cannot point back to.
            </p>

            <h2>Who</h2>
            <p>
              This is a Traverse City desk run by Nick Perez. Tips, corrections,
              and things we missed:{" "}
              <Link href="/tips" className="font-semibold text-teal hover:underline">
                send a tip
              </Link>
              {" · "}
              <a href="mailto:nick@traverse.news">nick@traverse.news</a>.
            </p>
            <p>The newsroom is not public. The paper is.</p>
          </div>
        </article>

        <DeskRail active="/about" />
      </div>
    </PublicShell>
  );
}
