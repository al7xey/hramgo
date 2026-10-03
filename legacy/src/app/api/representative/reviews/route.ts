import { ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const reviews = await prisma.review.findMany({
    where: canModerate(auth.user)
      ? {}
      : {
          temple: {
            representatives: {
              some: { userId: auth.user.id, status: "APPROVED" }
            }
          }
        },
    select: {
      id: true,
      rating: true,
      text: true,
      status: true,
      helpfulCount: true,
      reportsCount: true,
      publishedAt: true,
      createdAt: true,
      temple: { select: { id: true, slug: true, name: true } },
      user: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return ok({ reviews });
}
