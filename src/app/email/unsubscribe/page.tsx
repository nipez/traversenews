import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { removeSubscriber } from "@/lib/data/store";

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
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return null;
  return normalized;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const email = readEmailParam(params.email);

  let done = false;
  if (email) {
    await removeSubscriber(email);
    done = true;
  }

  return (
    <PublicShell active="/" header="compact">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">
          Unsubscribe
        </h1>

        {done && email ? (
          <>
            <p className="mt-4 max-w-xl font-serif text-base leading-relaxed text-muted-2 md:text-lg">
              You&apos;re off the morning letter list for{" "}
              <strong className="text-ink">{email}</strong>. If that address was
              never subscribed, nothing else changed.
            </p>
            <p className="mt-4 text-sm text-muted">
              Changed your mind?{" "}
              <Link href="/email#signup" className="font-bold text-teal">
                Sign up again
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 max-w-xl text-sm text-muted md:text-base">
              Enter the address on the morning letter list. One step. No
              confirmation email.
            </p>
            <form
              method="get"
              action="/email/unsubscribe"
              className="mt-6 flex max-w-md flex-wrap gap-2"
            >
              <input
                className="input min-w-[14rem] flex-1"
                type="email"
                name="email"
                required
                placeholder="Your email"
                aria-label="Email"
                autoComplete="email"
              />
              <button type="submit" className="btn-teal shrink-0">
                Unsubscribe
              </button>
            </form>
            {params.email != null && !email ? (
              <p className="mt-3 text-sm text-red-700">
                That doesn&apos;t look like a valid email.
              </p>
            ) : null}
          </>
        )}

        <p className="mt-8 text-sm text-muted">
          <Link href="/privacy" className="font-bold text-teal">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="font-bold text-teal">
            Terms
          </Link>
          {" · "}
          <Link href="/email" className="font-bold text-teal">
            Morning email
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
