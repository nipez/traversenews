import Link from "next/link";
import { formatHeaderDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "What's on" },
  { href: "/civic", label: "Civic" },
] as const;

export function SiteHeader({ active = "/" }: { active?: string }) {
  return (
    <header className="masthead">
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="masthead-date">{formatHeaderDate()}</p>
            <Link
              href="/"
              className="masthead-wordmark mt-2 block font-serif tracking-tight text-ink"
            >
              traverse.news
            </Link>
          </div>
          <Link href="/email#signup" className="email-stamp shrink-0">
            Morning email
          </Link>
        </div>

        <nav className="mt-6 hidden items-center gap-8 border-t border-ink/15 pt-4 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "text-[0.95rem] font-bold tracking-[0.04em] text-ink"
                  : "text-[0.95rem] tracking-[0.04em] text-[#333] hover:text-teal"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "whitespace-nowrap bg-ink px-3 py-1.5 text-sm font-semibold text-white"
                  : "whitespace-nowrap border border-rule px-3 py-1.5 text-sm text-[#444]"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="teal-band mt-6" aria-hidden />
    </header>
  );
}
