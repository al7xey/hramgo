import { z } from "zod";

import { actionQueued, badRequest } from "@/lib/api/response";

const replySchema = z.object({
  text: z.string().trim().min(10).max(2000)
});

export async function POST(request: Request) {
  try {
    replySchema.parse(await request.json());

    return actionQueued("Ответ представителя отправлен на модерацию");
  } catch (error) {
    return badRequest(error);
  }
}
