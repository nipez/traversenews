import Link from "next/link";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "Events" },
  { href: "/civic", label: "Civic Calendar" },
] as const;

export function MobileBottomNav({ active = "/" }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/25 bg-paper md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {ITEMS.map((item) => {
          const on = active === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-center text-[0.68rem] leading-tight ${
                  on ? "font-semibold text-teal" : "text-[#555]"
                }`}
              >
                <span
                  className={`h-1 w-6 ${on ? "bg-teal" : "bg-transparent"}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
