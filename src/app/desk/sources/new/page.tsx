import { DeskChrome } from "@/components/desk/DeskChrome";
import { SmartAddSource } from "@/components/desk/SmartAddSource";
import { SourceForm } from "@/components/desk/SourceForm";
import { getAppData } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function NewSourcePage() {
  const data = await getAppData();
  return (
    <DeskChrome backHref="/desk">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <p className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
          New source
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Add source</h1>

        <div className="mt-6">
          <SmartAddSource beats={data.beats} />
        </div>

        <div className="mt-10 border-t border-rule pt-8">
          <h2 className="font-serif text-2xl text-ink">Manual add</h2>
          <p className="mt-1 text-sm text-[#444]">
            Fallback if research misses — fill every field yourself.
          </p>
          <div className="mt-6">
            <SourceForm beats={data.beats} />
          </div>
        </div>
      </div>
    </DeskChrome>
  );
}
