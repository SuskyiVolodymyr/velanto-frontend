import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/src/shared/lib/safe-redirect";
import { SESSION_HINT_COOKIE } from "@/src/shared/lib/session-hint";

/**
 * Redirect an already-signed-in visitor away from /auth on the server, before
 * the page renders — so they never see the login form flash. We can only read
 * the frontend-origin session HINT cookie (the real httpOnly session lives on
 * the API origin and is invisible here); a stale hint self-heals once the
 * destination's bootstrap refresh fails and clears it.
 */
export function middleware(request: NextRequest): NextResponse {
  if (!request.cookies.has(SESSION_HINT_COOKIE)) return NextResponse.next();
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  // Never bounce back to /auth (that would loop); fall back to home.
  const target = next.startsWith("/auth") ? "/" : next;
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: ["/auth"],
};
