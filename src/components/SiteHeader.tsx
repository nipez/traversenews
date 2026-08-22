import Link from "next/link";
import { formatHeaderDate } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "What's on" },
  { href: "/civic", label: "Civic" },
] as const;

export function SiteHeader({ active = "/" }: { active?: string }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="font-serif text-2xl tracking-tight text-ink md:text-[1.7rem]">
          traverse.news
        </Link>

        <nav className="hidden items-center gap-6 text-[0.95rem] text-ink md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "font-semibold text-ink"
                  : "text-[#333] hover:text-teal"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-muted">{formatHeaderDate()}</span>
          <Link href="/email#signup" className="btn-teal whitespace-nowrap">
            Get the morning email
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold text-teal md:hidden">
          <Link href="/email">Search</Link>
          <Link href="/whats-on">Menu</Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              active === item.href
                ? "whitespace-nowrap bg-ink px-3 py-1.5 text-sm text-white"
                : "whitespace-nowrap border border-rule px-3 py-1.5 text-sm text-[#444]"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
