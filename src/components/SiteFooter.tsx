import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <Link href="/" className="font-serif text-xl text-ink">
          traverse.news
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#333]">
          <Link href="/email">About</Link>
          <a href="mailto:tips@traverse.news">Contact a reporter</a>
          <a href="mailto:tips@traverse.news">Corrections</a>
          <Link href="/editions">Editions</Link>
          <Link href="/email#signup">Support us</Link>
        </nav>
        <p className="text-sm text-muted">
          © 2026 traverse.news · Traverse City, Michigan
        </p>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-2 md:px-6">
        Aggregated headlines link out to the original outlet. We do not reprint
        full stories from other desks.
      </p>
    </footer>
  );
}
