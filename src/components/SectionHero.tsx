import Image from "next/image";
import type { SectionHeaderMeta } from "@/lib/types";

/**
 * Public section page hero — matches homepage photo-band treatment when a
 * photo is set; otherwise a quiet type-only header (no cartoon stamp).
 */
export function SectionHero({
  kicker,
  title,
  dek,
  header,
  children,
}: {
  kicker: string;
  title: string;
  dek?: React.ReactNode;
  header: SectionHeaderMeta | null;
  /** Extra copy under the dek (e.g. Events “Going out” line). */
  children?: React.ReactNode;
}) {
  if (header?.src) {
    return (
      <header className="section-photo-hero">
        <div className="section-photo-band">
          <Image
            src={header.src}
            alt={header.alt || ""}
            fill
            priority
            className="section-photo-img"
            sizes="100vw"
          />
          <div className="section-photo-scrim" aria-hidden />
          <div className="section-photo-frame">
            <p className="section-photo-kicker">{kicker}</p>
            <h1 className="section-photo-hed">{title}</h1>
          </div>
        </div>
        {dek || children ? (
          <div className="section-photo-below">
            {dek ? <div className="section-photo-dek">{dek}</div> : null}
            {children}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="section-type-hero">
      <p className="section-type-kicker">{kicker}</p>
      <h1 className="section-type-hed">{title}</h1>
      {dek ? <div className="section-type-dek">{dek}</div> : null}
      {children}
    </header>
  );
}
