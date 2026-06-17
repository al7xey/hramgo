import { reviewSchema } from "@/features/reviews/validation";
import { actionQueued, badRequest } from "@/lib/api/response";

export async function PATCH(request: Request) {
  try {
    reviewSchema.partial().parse(await request.json());

    return actionQueued("Изменение отзыва отправлено на модерацию");
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE() {
  return actionQueued("Отзыв скрыт");
}
