import { ok } from "@/lib/api/response";
import { isAuthFailure, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireRole(["ADMIN", "MODERATOR"]);
  if (isAuthFailure(auth)) return auth.response;

  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { reviews: true, favorites: true } }
    }
  });

  return ok({ users });
}
