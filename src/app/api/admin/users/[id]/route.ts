import { actionQueued } from "@/lib/api/response";

export async function PATCH() {
  return actionQueued("Роль или статус пользователя обновлены");
}
