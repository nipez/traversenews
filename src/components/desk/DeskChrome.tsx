import Link from "next/link";
import { redirect } from "next/navigation";
import { DeskGlobalPull } from "@/components/desk/DeskGlobalPull";
import { SignOutButton } from "@/components/desk/SignOutButton";
import { CitiesSwitcher } from "@/components/desk/CitiesSwitcher";
import { getDevDeskEmail, isDeskAuthed } from "@/lib/auth";
import { getAppData } from "@/lib/data/store";
import { siteWordmark } from "@/lib/sites";

export async function DeskChrome({
  children,
  active = "sources",
  backHref,
  /** Optional: page already loaded the store — skip a second getAppData. */
  lastPullAt,
  pulledItemCount,
}: {
  children: React.ReactNode;
  active?:
    | "sources"
    | "alerts"
    | "tips"
    | "events"
    | "queue"
    | "originals"
    | "email"
    | "editions"
    | "headers";
  backHref?: string;
  lastPullAt?: string | null;
  pulledItemCount?: number;
}) {
  // Defense in depth — middleware already redirects unauth HTML routes.
  const authed = await isDeskAuthed();
  if (!authed) redirect("/desk/login");

  const email = getDevDeskEmail();
  const parts = email.split("@")[0]?.split(".") ?? ["Staff"];
  const display =
    parts[0].charAt(0).toUpperCase() +
    parts[0].slice(1) +
    (parts[1] ? ` ${parts[1].charAt(0).toUpperCase()}.` : "");

  let pullAt = lastPullAt;
  let itemCount = pulledItemCount;
  if (!backHref && (pullAt === undefined || itemCount === undefined)) {
    // Request-memoized with the page's getAppData / listDrafts loadStore.
    const data = await getAppData();
    pullAt = pullAt === undefined ? data.last_pull_at : pullAt;
    itemCount =
      itemCount === undefined
        ? data.stories.filter((s) => !s.is_original).length
        : itemCount;
  }

  const primaryNav = [
    { id: "sources", href: "/desk", label: "Sources" },
    { id: "alerts", href: "/desk/alerts", label: "Alerts" },
    { id: "email", href: "/desk/email", label: "Email" },
    { id: "originals", href: "/desk/originals", label: "Originals" },
  ] as const;
  const moreNav = [
    { id: "tips", href: "/desk/tips", label: "Tips" },
    { id: "queue", href: "/desk/queue", label: "Queue" },
    { id: "events", href: "/desk/events", label: "Events" },
    { id: "editions", href: "/desk/editions", label: "Editions" },
    { id: "headers", href: "/desk/headers", label: "Home & headers" },
  ] as const;
  const moreActive = moreNav.some((item) => item.id === active);

  return (
    <>
      <header className="desk-topnav">
        <div className="desk-topnav-bar">
          <div className="desk-topnav-brand">
            <div className="desk-topnav-wordmark">
              <Link href="/" className="desk-topnav-logo" prefetch={false}>
                {siteWordmark()}
              </Link>
              <span className="desk-topnav-rule" aria-hidden>
                |
              </span>
              <span className="desk-topnav-title">The Desk</span>
            </div>
            <div className="desk-topnav-cities">
              <CitiesSwitcher />
            </div>
          </div>

          {backHref ? (
            <Link href={backHref} prefetch={false} className="desk-topnav-back">
              ← Sources
            </Link>
          ) : (
            <nav className="desk-topnav-links" aria-label="Desk">
              {primaryNav.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  data-active={active === item.id ? "true" : "false"}
                >
                  {item.label}
                </Link>
              ))}
              <details className="desk-topnav-more">
                <summary data-active={moreActive ? "true" : "false"}>More</summary>
                <div className="desk-topnav-more-menu">
                  {moreNav.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch={false}
                      data-active={active === item.id ? "true" : "false"}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            </nav>
          )}

          <div className="desk-topnav-utils">
            {!backHref ? (
              <DeskGlobalPull
                variant="chrome"
                lastPullAt={pullAt ?? null}
                itemCount={itemCount ?? 0}
              />
            ) : null}
            <strong className="desk-topnav-staff">{display}</strong>
            <SignOutButton />
          </div>
        </div>
        {!backHref ? (
          <nav className="desk-mobile-nav" aria-label="Desk">
            {primaryNav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                data-active={active === item.id ? "true" : "false"}
              >
                {item.label}
              </Link>
            ))}
            <details className="desk-mobile-more">
              <summary data-active={moreActive ? "true" : "false"}>More</summary>
              <div className="desk-mobile-more-panel">
                {moreNav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={false}
                    data-active={active === item.id ? "true" : "false"}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
        ) : null}
      </header>
      {children}
    </>
  );
}
