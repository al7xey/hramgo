import { actionQueued } from "@/lib/api/response";

export async function POST() {
  return actionQueued("Отметка отзыва сохранена");
}

export async function DELETE() {
  return actionQueued("Отметка отзыва удалена");
}
