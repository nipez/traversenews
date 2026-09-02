import { NextResponse, type NextRequest } from "next/server";

const DESK_COOKIE = "tn_desk_session";

/**
 * Gate Desk HTML routes before any RSC/page can await loadStore.
 * Unauthenticated /desk/* must be the fast login path (not a 3–10s store load).
 * /api/desk/* stays cookie-or-Bearer in route handlers — do not block imports here.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/desk/login" || pathname.startsWith("/desk/login/")) {
    return NextResponse.next();
  }

  if (request.cookies.get(DESK_COOKIE)?.value === "staff") {
    return NextResponse.next();
  }

  const login = request.nextUrl.clone();
  login.pathname = "/desk/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/desk", "/desk/:path*"],
};
