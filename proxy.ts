import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION_KEY } from "@/auth/constants";

export async function proxy(request: NextRequest) {
  console.log("proxy: checking session for", request.url);
    const { pathname } = request.nextUrl;

  // Only care about /private and /sign-in (per matcher below)
  const sessionId = request.cookies.get(COOKIE_SESSION_KEY)?.value;

  // ---- Protect /private ----
  if (pathname.startsWith("/private")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const ok = await isSessionValid(request);
    if (ok) return NextResponse.next();

    // Invalid session: delete cookie + go to sign-in
    const res = NextResponse.redirect(new URL("/sign-in", request.url));
    res.cookies.delete(COOKIE_SESSION_KEY);
    return res;
  }

  // ---- Keep valid sessions out of /sign-in ----
  if (pathname === "/sign-in" && sessionId) {
    const ok = await isSessionValid(request);

    if (ok) {
      return NextResponse.redirect(new URL("/private", request.url));
    }

    // Stale cookie: delete it and allow sign-in page
    const res = NextResponse.next();
    res.cookies.delete(COOKIE_SESSION_KEY);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/private/:path*", "/sign-in"],
};

async function isSessionValid(request: NextRequest): Promise<boolean> {
  const validateUrl = new URL("/api/auth/session", request.url);

  const res = await fetch(validateUrl, {
    method: "GET",
    // forward cookies so the API route can read the session cookie
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  return res.ok;
}