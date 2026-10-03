import { z } from "zod";

import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const applySchema = z.object({
  templeId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const payload = applySchema.parse(await request.json());
    const temple = await prisma.temple.findUnique({ where: { id: payload.templeId }, select: { id: true } });

    if (!temple) {
      return notFound("Храм не найден");
    }

    const claim = await prisma.templeRepresentative.upsert({
      where: { userId_templeId: { userId: auth.user.id, templeId: temple.id } },
      update: {},
      create: { userId: auth.user.id, templeId: temple.id },
      select: { id: true, status: true, createdAt: true }
    });

    return ok({ message: "Заявка представителя отправлена администратору", claim });
  } catch (error) {
    return badRequest(error);
  }
}
