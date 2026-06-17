import { actionQueued, ok } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return ok({ id });
}

export async function PATCH() {
  return actionQueued("Правки храма отправлены в журнал модерации");
}
