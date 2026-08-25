import { InteriorLayout } from "@/components/InteriorLayout";
import { PublicShell } from "@/components/PublicShell";
import { TipsForm } from "@/components/TipsForm";

export const dynamic = "force-dynamic";

export default function TipsPage() {
  return (
    <PublicShell active="/" header="compact">
      <InteriorLayout mainClassName="tips-main">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">Tips</h1>
        <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
          Corrections and things we missed. We read these — no invented
          auto-reply from a mailbox.
        </p>
        <div className="mt-6">
          <TipsForm variant="page" />
        </div>
      </InteriorLayout>
    </PublicShell>
  );
}
