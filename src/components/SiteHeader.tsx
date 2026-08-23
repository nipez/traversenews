import Image from "next/image";
import Link from "next/link";
import { formatHeaderDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "Events" },
  { href: "/civic", label: "Civic Calendar" },
] as const;

export function SiteHeader({ active = "/" }: { active?: string }) {
  return (
    <header className="masthead">
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="masthead-date">{formatHeaderDate()}</p>
          <Link href="/email#signup" className="email-stamp shrink-0">
            Morning email
          </Link>
        </div>

        <div className="masthead-lockup relative mt-3 md:mt-4">
          <div className="relative z-10 min-w-0 max-w-[28rem] md:max-w-[36rem]">
            <Link
              href="/"
              className="masthead-wordmark block font-serif tracking-tight text-ink"
            >
              traverse.news
            </Link>
            <p className="mt-2 max-w-sm text-[0.95rem] leading-snug text-[#444] md:text-[1.05rem]">
              Local news for Traverse City — originals first, then the bay.
            </p>
          </div>

          <div className="masthead-bay-wrap" aria-hidden={false}>
            <Image
              src="/art/masthead-bay.png"
              alt="Letterpress bay and lighthouse"
              width={960}
              height={640}
              priority
              className="masthead-bay-img"
            />
          </div>
        </div>

        <nav className="masthead-nav relative z-10 mt-2 hidden items-center gap-8 border-t border-ink pt-4 md:flex">
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

        <div className="relative z-10 mt-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "whitespace-nowrap border border-ink bg-ink px-3 py-1.5 text-sm font-semibold text-white"
                  : "whitespace-nowrap border border-ink/40 px-3 py-1.5 text-sm text-[#444]"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="teal-band relative z-10 mt-6" aria-hidden />
    </header>
  );
}
