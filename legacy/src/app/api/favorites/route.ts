import { getServerSession } from "next-auth";
import { z } from "zod";

import { badRequest, ok, unauthorized } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

const favoriteSchema = z.object({
  templeId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { templeId } = favoriteSchema.parse(await request.json());

    await prisma.favorite.upsert({
      where: { userId_templeId: { userId: session.user.id, templeId } },
      update: {},
      create: { userId: session.user.id, templeId }
    });

    return ok({ message: "Храм сохранён в избранное" });
  } catch (error) {
    return badRequest(error);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return unauthorized();
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { templeId: true }
  });

  return ok({ favorites: favorites.map((item) => item.templeId) });
}
