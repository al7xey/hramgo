import { z } from "zod";

import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const patchSchema = z.object({
  isMain: z.boolean().optional(),
  alt: z.string().trim().max(240).optional(),
  sourceUrl: z.string().trim().url().optional().or(z.literal(""))
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(["ADMIN", "MODERATOR"]);
    if (isAuthFailure(auth)) return auth.response;

    const { id } = await params;
    const payload = patchSchema.parse(await request.json());
    const photo = await prisma.templePhoto.findUnique({ where: { id }, select: { id: true, templeId: true } });
    if (!photo) return notFound("Фото не найдено");

    if (payload.isMain) {
      await prisma.templePhoto.updateMany({ where: { templeId: photo.templeId }, data: { isMain: false } });
    }

    const updated = await prisma.templePhoto.update({
      where: { id: photo.id },
      data: {
        isMain: payload.isMain,
        alt: payload.alt,
        sourceUrl: payload.sourceUrl === "" ? null : payload.sourceUrl
      },
      select: { id: true, imageUrl: true, alt: true, sourceUrl: true, isMain: true }
    });

    return ok({ photo: updated });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MODERATOR"]);
  if (isAuthFailure(auth)) return auth.response;

  const { id } = await params;
  const photo = await prisma.templePhoto.findUnique({ where: { id }, select: { id: true } });
  if (!photo) return notFound("Фото не найдено");

  await prisma.templePhoto.delete({ where: { id: photo.id } });
  return ok({ message: "Фото удалено" });
}
