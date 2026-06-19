import { z } from "zod";

import { badRequest, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const themeSchema = z.object({
  themePreference: z.enum(["LIGHT", "DARK", "SYSTEM"])
});

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const payload = themeSchema.parse(await request.json());
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { themePreference: payload.themePreference }
    });

    return ok({ message: "Тема сохранена", themePreference: payload.themePreference });
  } catch (error) {
    return badRequest(error);
  }
}
