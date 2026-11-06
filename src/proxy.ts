import { NextResponse, type NextRequest } from "next/server";

/**
 * 1) Staging gate (optional): when STAGING_GATE_USER and STAGING_GATE_PASSWORD
 *    are set, every page and API requires HTTP Basic Auth and responses are
 *    marked noindex. Netlify's own password protection is not on the Free plan,
 *    so we do it in app code. Exempt: the Razorpay webhook (authenticated by its
 *    HMAC signature) and public static assets.
 * 2) Optimistic admin gate: no session cookie → 307 to /admin/login. NOT the
 *    security boundary — admin pages and actions re-verify against the DB.
 */

const GATE_USER = process.env.STAGING_GATE_USER ?? "";
const GATE_PASS = process.env.STAGING_GATE_PASSWORD ?? "";
const GATE_ON = GATE_USER.length > 0 && GATE_PASS.length >= 12;

/** Constant-time string compare without Node-only APIs (proxy may run on an edge runtime). */
function eq(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function gateAllows(req: NextRequest): boolean {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(h.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  // Evaluate both comparisons to avoid short-circuit timing differences.
  const u = eq(decoded.slice(0, i), GATE_USER);
  const p = eq(decoded.slice(i + 1), GATE_PASS);
  return u && p;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (GATE_ON && pathname !== "/api/webhooks/razorpay") {
    if (!gateAllows(request)) {
      return new NextResponse("Staging site — authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="AI SEEKHO staging", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
      });
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !request.cookies.has("ais_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const res = NextResponse.next();
  if (GATE_ON) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}

export const config = {
  // Everything except framework static files and public images (not secret;
  // the image optimizer must be able to fetch them without credentials).
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico).*)"],
};
