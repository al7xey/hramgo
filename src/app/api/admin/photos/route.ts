import { z } from "zod";

import { badRequest, ok } from "@/lib/api/response";
import { isAuthFailure, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const photoSchema = z.object({
  templeId: z.string().min(1),
  imageUrl: z.string().trim().url(),
  sourceUrl: z.string().trim().url().optional().or(z.literal("")),
  alt: z.string().trim().max(240).optional(),
  isMain: z.boolean().optional()
});

export async function GET() {
  const auth = await requireRole(["ADMIN", "MODERATOR"]);
  if (isAuthFailure(auth)) return auth.response;

  const photos = await prisma.templePhoto.findMany({
    orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
    include: { temple: { select: { id: true, name: true, shortName: true, slug: true } } }
  });

  return ok({ photos });
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MODERATOR"]);
    if (isAuthFailure(auth)) return auth.response;

    const payload = photoSchema.parse(await request.json());
    const temple = await prisma.temple.findUnique({ where: { id: payload.templeId }, select: { id: true, name: true } });
    if (!temple) return badRequest("Храм не найден");

    if (payload.isMain) {
      await prisma.templePhoto.updateMany({ where: { templeId: temple.id }, data: { isMain: false } });
    }

    const photo = await prisma.templePhoto.create({
      data: {
        templeId: temple.id,
        imageUrl: payload.imageUrl,
        sourceUrl: payload.sourceUrl || null,
        alt: payload.alt || `${temple.name}: фотография храма`,
        copyrightStatus: "USER_UPLOADED",
        moderationStatus: "APPROVED",
        isApproved: true,
        isMain: Boolean(payload.isMain)
      },
      select: { id: true, imageUrl: true, alt: true, sourceUrl: true, isMain: true }
    });

    return ok({ photo });
  } catch (error) {
    return badRequest(error);
  }
}
