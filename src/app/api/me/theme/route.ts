import { z } from "zod";

import { badRequest, ok } from "@/lib/api/response";

const themeSchema = z.object({
  themePreference: z.enum(["LIGHT", "DARK", "SYSTEM"])
});

export async function PATCH(request: Request) {
  try {
    const payload = themeSchema.parse(await request.json());

    return ok({ message: "Тема сохранена", themePreference: payload.themePreference });
  } catch (error) {
    return badRequest(error);
  }
}
