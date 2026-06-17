import { actionQueued } from "@/lib/api/response";

export async function PATCH() {
  return actionQueued("Ответ представителя обновлён");
}

export async function DELETE() {
  return actionQueued("Ответ представителя удалён");
}
