import { ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: auth.user.id },
    select: { templeId: true },
    orderBy: { createdAt: "desc" }
  });

  return ok({ favorites: favorites.map((item) => item.templeId) });
}
