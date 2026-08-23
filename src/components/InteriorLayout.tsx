import { InteriorRail } from "@/components/InteriorRail";

/**
 * Shared public interior chrome: main column + the same right rail.
 * Homepage hero stays its own grid; Desk stays desktop-admin.
 */
export function InteriorLayout({
  children,
  mainClassName = "",
  layoutClassName = "",
}: {
  children: React.ReactNode;
  /** Extra classes on the main column (e.g. sports-main, events-main). */
  mainClassName?: string;
  /** Extra classes on the outer grid (e.g. sports-layout). */
  layoutClassName?: string;
}) {
  return (
    <div className={`about-layout ${layoutClassName}`.trim()}>
      <div className={`about-essay ${mainClassName}`.trim()}>{children}</div>
      <InteriorRail />
    </div>
  );
}
