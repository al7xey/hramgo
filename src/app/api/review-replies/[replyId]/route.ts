import { z } from "zod";

import { badRequest, forbidden, notFound, ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const replySchema = z.object({
  text: z.string().trim().min(10).max(2000)
});

function canManageReply(user: { id: string; role?: string | null }, ownerId: string) {
  return user.id === ownerId || canModerate(user);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ replyId: string }> }) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const { replyId } = await params;
    const reply = await prisma.reviewReply.findUnique({
      where: { id: replyId },
      select: { id: true, userId: true }
    });

    if (!reply) {
      return notFound("Ответ не найден");
    }

    if (!canManageReply(auth.user, reply.userId)) {
      return forbidden();
    }

    const payload = replySchema.parse(await request.json());
    const updated = await prisma.reviewReply.update({
      where: { id: reply.id },
      data: { text: payload.text, status: "APPROVED", publishedAt: new Date() },
      select: { id: true, text: true, status: true, publishedAt: true }
    });

    return ok({ message: "Ответ обновлён", reply: updated });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ replyId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { replyId } = await params;
  const reply = await prisma.reviewReply.findUnique({
    where: { id: replyId },
    select: { id: true, userId: true }
  });

  if (!reply) {
    return notFound("Ответ не найден");
  }

  if (!canManageReply(auth.user, reply.userId)) {
    return forbidden();
  }

  await prisma.reviewReply.update({ where: { id: reply.id }, data: { status: "HIDDEN" } });

  return ok({ message: "Ответ удалён" });
}
