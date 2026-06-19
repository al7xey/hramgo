import { ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const where = canModerate(auth.user)
    ? { moderationStatus: "PUBLISHED" as const }
    : {
        representatives: {
          some: { userId: auth.user.id, status: "APPROVED" as const }
        }
      };
  const temples = await prisma.temple.findMany({
    where,
    select: { id: true, slug: true, name: true, address: true, websiteUrl: true },
    orderBy: { name: "asc" },
    take: canModerate(auth.user) ? 200 : 50
  });

  return ok({ temples });
}
