import { reviewReportSchema } from "@/features/reviews/validation";
import { actionQueued, badRequest, ok } from "@/lib/api/response";

export async function GET() {
  return ok({ message: "Сообщение об отзыве можно отправить POST-запросом" });
}

export async function POST(request: Request) {
  try {
    reviewReportSchema.parse(await request.json());

    return actionQueued("Сообщение отправлено модератору");
  } catch (error) {
    return badRequest(error);
  }
}
