import { getDevDeskEmail } from "@/lib/auth";

type Props = { searchParams: Promise<{ error?: string }> };

/**
 * Native form POST only — no client fetch / React-controlled inputs.
 * iOS Safari autofill often skips onChange on controlled password fields;
 * preventDefault + router.push also races cookie storage on phones.
 * The API 303s to /desk (success) or /desk/login?error=… (failure).
 */
export default async function DeskLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const email = getDevDeskEmail();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-2xl text-ink">traverse.news</h1>
          <span className="text-xs font-semibold tracking-[0.12em] text-muted-2 uppercase">
            The Desk
          </span>
        </div>

        <form
          method="POST"
          action="/api/desk/login"
          className="mt-8 space-y-4"
        >
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Email
            </span>
            <input
              className="input mt-1"
              type="email"
              name="email"
              defaultValue={email}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Password
            </span>
            <input
              className="input mt-1"
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" className="btn-teal w-full">
            Sign in
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <a className="underline" href="mailto:tips@traverse.news">
            Forgot password
          </a>
          <span>Staff access only</span>
        </div>
        <p className="mt-6 text-xs text-muted-2">
          Local demo: use the email above and password from{" "}
          <code>DEV_DESK_PASSWORD</code> (default <code>desk</code>).
        </p>
      </div>
    </div>
  );
}
