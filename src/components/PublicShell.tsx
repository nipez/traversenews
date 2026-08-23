import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function PublicShell({
  children,
  active = "/",
  wide = false,
}: {
  children: React.ReactNode;
  active?: string;
  /** Homepage uses a wider stage; interior pages can stay slightly tighter. */
  wide?: boolean;
}) {
  return (
    <div className="site-shell pb-mobile-nav">
      <SiteHeader active={active} />
      <main
        className={`mx-auto px-4 py-8 md:px-8 md:py-10 ${
          wide ? "max-w-7xl" : "max-w-6xl"
        }`}
      >
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav active={active} />
    </div>
  );
}
