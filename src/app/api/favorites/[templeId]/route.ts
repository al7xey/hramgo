import { getServerSession } from "next-auth";

import { ok, unauthorized } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ templeId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return unauthorized();
  }

  const { templeId } = await params;

  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, templeId }
  });

  return ok({ message: "Храм убран из избранного" });
}
