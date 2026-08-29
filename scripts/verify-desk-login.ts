/**
 * Simulates iPhone-style Desk login: form-urlencoded POST (autofill-safe values
 * in the body, not React state), then GET /desk with the Set-Cookie.
 *
 * Usage:
 *   BASE=http://127.0.0.1:3000 npx tsx scripts/verify-desk-login.ts
 *   BASE=https://traverse.news npx tsx scripts/verify-desk-login.ts
 */
const BASE = (process.env.BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const EMAIL = process.env.DEV_DESK_EMAIL || "nick@traverse.news";
const PASSWORD = process.env.DEV_DESK_PASSWORD || "desk";

function cookieHeader(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function parseSetCookies(res: Response): string[] {
  // Node fetch: getSetCookie(); undici / browsers may only expose get("set-cookie")
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

async function main() {
  const bad = await fetch(`${BASE}/api/desk/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: "wrong-password" }),
  });
  const badLoc = bad.headers.get("location") || "";
  if (bad.status !== 303 || !badLoc.includes("/desk/login")) {
    throw new Error(
      `Expected 303 to /desk/login on bad password; got ${bad.status} ${badLoc}`,
    );
  }
  if (badLoc.includes("error=") === false) {
    throw new Error(`Expected error query on login redirect; got ${badLoc}`);
  }
  console.log("ok: form 401 → 303 /desk/login?error=…");

  const login = await fetch(`${BASE}/api/desk/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
  });
  const setCookies = parseSetCookies(login);
  const loc = login.headers.get("location") || "";
  if (login.status !== 303 || !/\/desk\/?$/.test(new URL(loc, BASE).pathname)) {
    throw new Error(
      `Expected 303 to /desk; got ${login.status} ${loc} cookies=${JSON.stringify(setCookies)}`,
    );
  }
  const session = setCookies.find((c) => c.startsWith("tn_desk_session="));
  if (!session || !session.includes("tn_desk_session=staff")) {
    throw new Error(`Missing tn_desk_session cookie: ${JSON.stringify(setCookies)}`);
  }
  const lower = session.toLowerCase();
  if (!lower.includes("httponly") || !lower.includes("samesite=lax")) {
    throw new Error(`Cookie flags incomplete: ${session}`);
  }
  if (BASE.includes("traverse.news") && !lower.includes("domain=.traverse.news")) {
    console.warn(
      "note: live cookie Domain not visible yet (deploy pending) —",
      session,
    );
  }
  console.log("ok: form login → 303 /desk + Set-Cookie tn_desk_session");

  const desk = await fetch(new URL(loc, BASE).toString(), {
    redirect: "manual",
    headers: { Cookie: cookieHeader(setCookies) },
  });
  if (desk.status !== 200) {
    const bounce = desk.headers.get("location") || "";
    throw new Error(
      `GET /desk with cookie expected 200; got ${desk.status} Location=${bounce}`,
    );
  }
  console.log("ok: GET /desk with cookie → 200 (no bounce to login)");

  // Simulate autofill: password present in FormData even if a controlled React
  // state would have been empty — this is what the native POST sends.
  const autofillBody = new URLSearchParams();
  autofillBody.set("email", EMAIL);
  autofillBody.set("password", PASSWORD);
  const autofill = await fetch(`${BASE}/api/desk/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: autofillBody,
  });
  if (autofill.status !== 303) {
    throw new Error(`Autofill-style POST expected 303; got ${autofill.status}`);
  }
  console.log("ok: FormData-style body (autofill values) succeeds");

  console.log("\nAll desk login checks passed against", BASE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
