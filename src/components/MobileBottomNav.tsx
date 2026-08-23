import Link from "next/link";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/whats-on", label: "Events" },
  { href: "/civic", label: "Civic" },
  { href: "/schools", label: "Schools" },
  { href: "/sports", label: "Sports" },
  { href: "/local", label: "Local" },
] as const;

export function MobileBottomNav({ active = "/" }: { active?: string }) {
  return (
    <nav className="mobile-tabs" aria-label="Mobile">
      {ITEMS.map((item) => {
        const on = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={on ? "mobile-tab mobile-tab-active" : "mobile-tab"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
