import Link from "next/link";
import { InteriorLayout } from "@/components/InteriorLayout";
import { PublicShell } from "@/components/PublicShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About traverse.news",
};

export default function AboutPage() {
  return (
    <PublicShell active="/" header="compact">
      <InteriorLayout>
        <article>
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
              is important district dates — calendars you can trust, not every
              bake sale.{" "}
              <Link href="/sports">
                <strong>Sports</strong>
              </Link>{" "}
              is area games and sports headlines.{" "}
              <Link href="/local">
                <strong>Local</strong>
              </Link>{" "}
              is useful outbound directories: where to look when you need a
              number, a map, or an office. We pull from public listings. If a
              source does not print a time, we leave it blank.
            </p>
            <p>
              <Link href="/#alerts">
                <strong>Alerts</strong>
              </Link>{" "}
              is official only: crashes, outages, closures, and warnings —
              Grand Traverse 911 and the same class of notice from the Ticker
              when it is that kind of post. It is not a Facebook firehose.
            </p>
            <p>
              <strong>Morning email</strong> is the same paper in your inbox.
              One pass before the day starts.
            </p>

            <h2>How we write</h2>
            <p>
              Original reporting on this site is traverse.news reporting. We do
              not invent people, quotes, crashes, or events. If a sentence came
              from another outlet, we say so and we link it.
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
              We will not dump group-chat accusations onto the homepage.
              Complaint pile-ons, doxxing, and unverified claims stay off the
              public site.
            </p>
            <p>
              We will not publish a calendar item we cannot point back to.
            </p>

            <h2>Who</h2>
            <p>
              This is a Traverse City desk. Tips, corrections, and things we
              missed go through the{" "}
              <Link href="/tips" className="font-semibold text-teal hover:underline">
                tip form
              </Link>
              .
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
      </InteriorLayout>
    </PublicShell>
  );
}
