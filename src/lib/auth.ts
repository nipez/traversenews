import { cookies } from "next/headers";

const COOKIE = "tn_desk_session";
/** Shared across apex + www so a phone that still hits www keeps the session. */
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? ".traverse.news" : undefined;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
}

export function getDevDeskPassword(): string {
  return process.env.DEV_DESK_PASSWORD || "desk";
}

export function getDevDeskEmail(): string {
  return process.env.DEV_DESK_EMAIL || "nick@traverse.news";
}

/** Optional shared secret for Traverse News / browser imports (falls back to desk password). */
export function getDeskImportToken(): string {
  return (
    process.env.DESK_IMPORT_TOKEN?.trim() ||
    process.env.DEV_DESK_PASSWORD ||
    "desk"
  );
}

export async function createDeskSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "staff", sessionCookieOptions(60 * 60 * 24 * 14));
}

export async function clearDeskSession(): Promise<void> {
  const jar = await cookies();
  // Expire domain-scoped cookie (production) and any leftover host-only cookie.
  jar.set(COOKIE, "", sessionCookieOptions(0));
  if (COOKIE_DOMAIN) {
    jar.set(COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 0,
    });
  }
}

export async function isDeskAuthed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === "staff";
}

/**
 * Cookie session OR Bearer token (DESK_IMPORT_TOKEN / DEV_DESK_PASSWORD).
 * Lets Traverse News POST browser-pulled event lists without inventing data.
 */
export async function isDeskRequestAuthed(request: Request): Promise<boolean> {
  if (await isDeskAuthed()) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return token === getDeskImportToken() || token === getDevDeskPassword();
}

export async function requireDeskAuth(): Promise<boolean> {
  return isDeskAuthed();
}
