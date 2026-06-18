import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const url = new URL("/support", request.url);
  url.searchParams.set("status", "fail");
  const invId = request.nextUrl.searchParams.get("InvId");

  if (invId) {
    url.searchParams.set("invoice", invId);
  }

  return NextResponse.redirect(url);
}
