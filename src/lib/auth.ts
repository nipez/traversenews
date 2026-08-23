import { cookies } from "next/headers";

const COOKIE = "tn_desk_session";

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
  jar.set(COOKIE, "staff", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearDeskSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
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
