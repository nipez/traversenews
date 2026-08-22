import { cookies } from "next/headers";

const COOKIE = "tn_desk_session";

export function getDevDeskPassword(): string {
  return process.env.DEV_DESK_PASSWORD || "desk";
}

export function getDevDeskEmail(): string {
  return process.env.DEV_DESK_EMAIL || "nick@traverse.news";
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

export async function requireDeskAuth(): Promise<boolean> {
  return isDeskAuthed();
}
