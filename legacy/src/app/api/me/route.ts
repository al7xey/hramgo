import { z } from "zod";

import { badRequest, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(120).optional(),
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
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, passwordHash: true }
    });

    if (!currentUser) {
      return badRequest("Профиль не найден");
    }

    const nextEmail = payload.email?.toLowerCase();
    const wantsEmailChange = Boolean(nextEmail && nextEmail !== currentUser.email);
    const wantsPasswordChange = Boolean(payload.newPassword);

    if (wantsEmailChange || wantsPasswordChange) {
      if (!currentUser.passwordHash || !payload.currentPassword || !verifyPassword(payload.currentPassword, currentUser.passwordHash)) {
        return badRequest("Укажите текущий пароль для изменения email или пароля");
      }
    }

    if (wantsEmailChange && nextEmail) {
      const existing = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } });
      if (existing && existing.id !== auth.user.id) {
        return badRequest("Этот email уже используется");
      }
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name: payload.name,
        email: wantsEmailChange ? nextEmail : undefined,
        passwordHash: payload.newPassword ? hashPassword(payload.newPassword) : undefined,
        image: payload.image === "" ? null : payload.image
      },
      select: { id: true, email: true, name: true, image: true, role: true }
    });

    return ok({ message: "Профиль обновлён", user });
  } catch (error) {
    return badRequest(error);
  }
}
