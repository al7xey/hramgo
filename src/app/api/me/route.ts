import { z } from "zod";

import { badRequest, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  image: z
    .string()
    .trim()
    .max(1_500_000)
    .refine((value) => value === "" || value.startsWith("data:image/") || /^https?:\/\//u.test(value), "Некорректное фото")
    .optional()
});

export async function GET() {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  return ok({ user: auth.user });
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const payload = profileSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...payload,
        image: payload.image === "" ? null : payload.image
      },
      select: { id: true, email: true, name: true, image: true, role: true }
    });

    return ok({ message: "Профиль обновлён", user });
  } catch (error) {
    return badRequest(error);
  }
}
