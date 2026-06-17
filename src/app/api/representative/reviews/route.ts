import { listTemples } from "@/features/temples/repository";
import { ok } from "@/lib/api/response";

export async function GET() {
  const temples = await listTemples({});

  return ok({ reviews: temples.slice(0, 1).flatMap((temple) => temple.reviews) });
}
