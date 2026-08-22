import { DeskChrome } from "@/components/desk/DeskChrome";

export default async function DeskQueuePage() {
  return (
    <DeskChrome active="queue">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <h1 className="font-serif text-3xl">Queue</h1>
        <p className="mt-3 text-[#444]">
          Intake and clustering review ships next. For now, run{" "}
          <code className="bg-paper-2 px-1">/api/pull</code> and read the public
          homepage.
        </p>
      </div>
    </DeskChrome>
  );
}
