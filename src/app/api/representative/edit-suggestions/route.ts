import { z } from "zod";

import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireRepresentativeAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const suggestionSchema = z.object({
  templeId: z.string().min(1),
  fieldName: z.string().min(1),
  newValue: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  comment: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    const payload = suggestionSchema.parse(await request.json());
    const auth = await requireRepresentativeAccess(payload.templeId);

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const current = await prisma.temple.findUnique({
      where: { id: payload.templeId },
      select: { id: true }
    });

    if (!current) {
      return notFound("Храм не найден");
    }

    const suggestion = await prisma.templeEditSuggestion.create({
      data: {
        templeId: payload.templeId,
        userId: auth.user.id,
        fieldName: payload.fieldName,
        newValue: payload.newValue,
        sourceUrl: payload.sourceUrl,
        comment: payload.comment
      },
      select: { id: true, status: true, createdAt: true }
    });

    return ok({ message: "Правка отправлена администратору", suggestion });
  } catch (error) {
    return badRequest(error);
  }
}
