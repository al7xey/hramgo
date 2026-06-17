import { z } from "zod";

import { actionQueued, badRequest } from "@/lib/api/response";

const suggestionSchema = z.object({
  templeId: z.string().min(1),
  fieldName: z.string().min(1),
  newValue: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  comment: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    suggestionSchema.parse(await request.json());

    return actionQueued("Правка отправлена администратору");
  } catch (error) {
    return badRequest(error);
  }
}
