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
              other outlets — Record-Eagle, the Ticker, IPR, 9&amp;10, Northern
              Express, and local orgs — as their headlines.
            </p>
            <p>
              <Link href="/whats-on">
                <strong>Events</strong>
              </Link>{" "}
              is concerts, markets, library programs, and nights out.{" "}
              <Link href="/civic">
                <strong>Civic</strong>
              </Link>{" "}
              is boards and government only.{" "}
              <Link href="/schools">
                <strong>Schools</strong>
              </Link>{" "}
              is important district dates.{" "}
              <Link href="/sports">
                <strong>Sports</strong>
              </Link>{" "}
              is area games and sports headlines.{" "}
              <Link href="/local">
                <strong>Local</strong>
              </Link>{" "}
              is useful outbound directories: where to look when you need a
              number, a map, or an office.
            </p>
            <p>
              <Link href="/#alerts">
                <strong>Alerts</strong>
              </Link>{" "}
              is official notices: crashes, outages, closures, and warnings —
              Grand Traverse 911 and the same class of notice from the Ticker.
            </p>
            <p>
              <strong>Morning email</strong> is the same paper in your inbox.
              One pass before the day starts.
            </p>

            <h2>Who</h2>
            <p>
              This is a Traverse City desk. Tips, corrections, and things we
              missed go through the{" "}
              <Link href="/tips" className="font-semibold text-teal hover:underline">
                tip form
              </Link>
              {" "}
              on this site — or the one in the rail.
            </p>

            <h2>Useful local</h2>
            <p>
              Standing outbound directories and places live on{" "}
              <Link href="/local">Useful local</Link>
              . Not news. Not Events. Just the links you reach for twice a
              week.
            </p>
          </div>
        </article>

        <DeskRail active="/about" />
      </div>
    </PublicShell>
  );
}
