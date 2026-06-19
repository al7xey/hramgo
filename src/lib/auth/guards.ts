import type { Role } from "@prisma/client";
import { getServerSession, type Session } from "next-auth";
import type { NextResponse } from "next/server";

import { forbidden, unauthorized } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

type AuthSuccess = { user: NonNullable<Session["user"]> };
type AuthFailure = { response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

export function isAuthFailure(result: AuthResult): result is AuthFailure {
  return "response" in result;
}

export async function requireUser(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { response: unauthorized() };
  }

  return { user: session.user };
}

export async function requireRole(roles: Role[]): Promise<AuthResult> {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth;
  }

  if (!roles.includes(auth.user.role as Role)) {
    return { response: forbidden() };
  }

  return auth;
}

export async function requireRepresentativeAccess(templeId: string): Promise<AuthResult> {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth;
  }

  if (auth.user.role === "ADMIN" || auth.user.role === "MODERATOR") {
    return auth;
  }

  if (auth.user.role !== "TEMPLE_REPRESENTATIVE") {
    return { response: forbidden() };
  }

  const claim = await prisma.templeRepresentative.findUnique({
    where: { userId_templeId: { userId: auth.user.id, templeId } },
    select: { status: true }
  });

  if (claim?.status !== "APPROVED") {
    return { response: forbidden("Нет доступа к этому храму") };
  }

  return auth;
}

export function canModerate(user: { role?: string | null }) {
  return user.role === "ADMIN" || user.role === "MODERATOR";
}
