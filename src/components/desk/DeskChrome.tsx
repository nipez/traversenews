import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/desk/SignOutButton";
import { getDevDeskEmail, isDeskAuthed } from "@/lib/auth";
import { getAppData } from "@/lib/data/store";

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

  const nav = [
    { id: "sources", href: "/desk", label: "Sources" },
    { id: "alerts", href: "/desk/alerts", label: "Alerts" },
    { id: "tips", href: "/desk/tips", label: "Tips" },
    { id: "events", href: "/desk/events", label: "Events" },
    { id: "queue", href: "/desk/queue", label: "Queue" },
    { id: "originals", href: "/desk/originals", label: "Originals" },
    { id: "headers", href: "/desk/headers", label: "Headers" },
    { id: "editions", href: "/desk/editions", label: "Editions" },
    { id: "email", href: "/desk/email", label: "Email" },
  ] as const;

  return (
    <>
      <header className="desk-topnav">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-serif text-lg text-white" prefetch={false}>
              traverse.news
            </Link>
            <span className="text-white/40">|</span>
            <span className="text-xs font-semibold tracking-[0.12em] text-white/80 uppercase">
              The Desk
            </span>
          </div>

          {backHref ? (
            <Link
              href={backHref}
              prefetch={false}
              className="text-sm text-white/80 hover:text-white"
            >
              ← Sources
            </Link>
          ) : (
            <nav className="ml-4 hidden items-center gap-5 text-sm md:flex">
              {nav.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  className={
                    active === item.id
                      ? "border-b border-white pb-0.5 text-white"
                      : "text-white/75 hover:text-white"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3 text-sm text-white/80">
            {!backHref ? (
              <span className="hidden text-xs lg:inline">
                Last pull{" "}
                {pullAt
                  ? new Date(pullAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "not yet"}
                {" · "}
                {itemCount ?? 0} items
              </span>
            ) : null}
            <strong className="text-white">{display}</strong>
            <SignOutButton />
          </div>
        </div>
        {!backHref ? (
          <nav className="desk-mobile-nav md:hidden" aria-label="Desk">
            {nav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                data-active={active === item.id ? "true" : "false"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {children}
    </>
  );
}
