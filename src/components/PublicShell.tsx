import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function PublicShell({
  children,
  active = "/",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="site-shell pb-mobile-nav">
      <SiteHeader active={active} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      <SiteFooter />
      <MobileBottomNav active={active} />
    </div>
  );
}
