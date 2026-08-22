"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function DeskLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("nick@traverse.news");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/desk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Sign in failed");
      router.push("/desk");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-2xl text-ink">traverse.news</h1>
          <span className="text-xs font-semibold tracking-[0.12em] text-muted-2 uppercase">
            The Desk
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Email
            </span>
            <input
              className="input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-muted-2 uppercase">
              Password
            </span>
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" className="btn-teal w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
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
