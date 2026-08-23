import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function PublicShell({
  children,
  active = "/",
  header = "compact",
  yesterdayEditionDate = null,
}: {
  children: React.ReactNode;
  active?: string;
  /** hero = bay photo + ink nav; compact = cream mast + same ink nav */
  header?: "hero" | "compact";
  /** When set, hero shows a Yesterday link to that edition date. */
  yesterdayEditionDate?: string | null;
  /** @deprecated kept for call-site compat */
  wide?: boolean;
}) {
  return (
    <div className="site-shell pb-mobile-nav">
      <SiteHeader
        active={active}
        variant={header}
        yesterdayEditionDate={yesterdayEditionDate}
      />
      <main className="stage">{children}</main>
      <SiteFooter />
      <MobileBottomNav active={active} />
    </div>
  );
}
