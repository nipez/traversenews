import Link from "next/link";
import { DeskChrome } from "@/components/desk/DeskChrome";
import { getAppData } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DeskEmailPage() {
  const data = await getAppData();
  return (
    <DeskChrome active="email">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-serif text-3xl">Email</h1>
        <p className="mt-2 text-[#444]">
          Send pipeline comes later. Preview the morning scan and collect
          addresses now.
        </p>
        <p className="mt-4 text-sm text-muted">
          {data.subscribers.length} subscriber
          {data.subscribers.length === 1 ? "" : "s"} stored locally
          {data.subscribers.length ? "" : " (none yet)"}.
        </p>
        <Link href="/email" className="btn-teal mt-6 inline-flex">
          Open preview
        </Link>
      </div>
    </DeskChrome>
  );
}
