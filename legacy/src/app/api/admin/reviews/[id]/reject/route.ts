import { actionQueued } from "@/lib/api/response";

export async function POST() {
  return actionQueued("Отзыв отклонен с причиной");
}
