export default function DeskLoading() {
  return (
    <div className="desk-shell min-h-screen">
      <div className="desk-topnav">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
          <span className="font-serif text-lg text-white">traverse.news</span>
          <span className="text-white/40">|</span>
          <span className="text-xs font-semibold tracking-[0.12em] text-white/80 uppercase">
            The Desk
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
