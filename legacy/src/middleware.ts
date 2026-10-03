import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["ADMIN", "MODERATOR"]);
const REPRESENTATIVE_ROLES = new Set(["ADMIN", "MODERATOR", "TEMPLE_REPRESENTATIVE"]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();

  if (host === "www.hramgo.ru" || (host === "hramgo.ru" && forwardedProto === "http")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "hramgo.ru";
    return NextResponse.redirect(url, 301);
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = String(token?.role ?? "USER");

  if (pathname.startsWith("/api/admin/")) {
    return token && ADMIN_ROLES.has(role) ? NextResponse.next() : json("Недостаточно прав", 403);
  }

  if (pathname.startsWith("/api/representative/apply")) {
    return token ? NextResponse.next() : json("Нужно войти", 401);
  }

  if (pathname.startsWith("/api/representative/")) {
    if (!token) return json("Нужно войти", 401);
    return REPRESENTATIVE_ROLES.has(role) ? NextResponse.next() : json("Недостаточно прав", 403);
  }

  if (pathname.startsWith("/api/me/")) {
    return token ? NextResponse.next() : json("Нужно войти", 401);
  }

  if (
    MUTATION_METHODS.has(request.method) &&
    (pathname.startsWith("/api/reviews/") || pathname.startsWith("/api/review-photos/") || pathname.startsWith("/api/review-replies/"))
  ) {
    return token ? NextResponse.next() : json("Нужно войти", 401);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/representative/:path*",
    "/api/me/:path*",
    "/api/reviews/:path*",
    "/api/review-photos/:path*",
    "/api/review-replies/:path*"
  ]
};
