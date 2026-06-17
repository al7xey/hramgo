import { actionQueued } from "@/lib/api/response";

export async function DELETE() {
  return actionQueued("Фото удалено из отзыва");
}
