import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function PublicShell({
  children,
  active = "/",
  header = "compact",
  weatherLine = null,
}: {
  children: React.ReactNode;
  active?: string;
  /** hero = bay photo + ink nav; compact = cream mast + same ink nav */
  header?: "hero" | "compact";
  /** Today’s weather one-liner for the hero date row (omit when null). */
  weatherLine?: string | null;
  /** @deprecated kept for call-site compat */
  wide?: boolean;
}) {
  return (
    <div className="site-shell pb-mobile-nav">
      <SiteHeader
        active={active}
        variant={header}
        weatherLine={header === "hero" ? weatherLine : null}
      />
      <main className="stage">{children}</main>
      <SiteFooter />
      <MobileBottomNav active={active} />
    </div>
  );
}
