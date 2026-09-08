import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function PublicShell({
  children,
  active = "/",
  header = "compact",
  weatherLine = null,
  heroSrc = null,
  heroAlt = null,
  heroDek = null,
}: {
  children: React.ReactNode;
  active?: string;
  /** hero = bay photo + ink nav; compact = cream mast + same ink nav */
  header?: "hero" | "compact";
  /** Today’s weather one-liner under the hero tagline (omit when null). */
  weatherLine?: string | null;
  heroSrc?: string | null;
  heroAlt?: string | null;
  heroDek?: string | null;
  /** @deprecated kept for call-site compat */
  wide?: boolean;
}) {
  return (
    <div className="site-shell pb-mobile-nav">
      <SiteHeader
        active={active}
        variant={header}
        weatherLine={header === "hero" ? weatherLine : null}
        heroSrc={header === "hero" ? heroSrc : null}
        heroAlt={header === "hero" ? heroAlt : null}
        heroDek={header === "hero" ? heroDek : null}
      />
      <main className="stage">{children}</main>
      <SiteFooter />
      <MobileBottomNav active={active} />
    </div>
  );
}
