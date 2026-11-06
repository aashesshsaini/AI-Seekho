import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic admin gate: requests without a session cookie get a real 307 to
 * the login page. This is NOT the security boundary — every admin page and
 * server action re-verifies the session against the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !request.cookies.has("ais_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
