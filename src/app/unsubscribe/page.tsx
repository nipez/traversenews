import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata = {
  title: "Unsubscribe",
};

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  searchParams: Promise<{ email?: string | string[] }>;
};

function readEmailParam(
  raw: string | string[] | undefined,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return "";
  return normalized;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const initialEmail = readEmailParam(params.email);

  return (
    <PublicShell active="/" header="compact">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">
          Unsubscribe
        </h1>
        <p className="mt-4 max-w-xl font-serif text-base leading-relaxed text-muted-2 md:text-lg">
          Opt out of the morning letter. We stop sending to that address.
        </p>
        <div className="mt-6">
          <UnsubscribeForm initialEmail={initialEmail} />
        </div>

        <p className="mt-8 text-sm text-muted">
          <Link href="/email" className="font-bold text-teal">
            Morning email
          </Link>
          {" · "}
          <Link href="/" className="font-bold text-teal">
            Today
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
