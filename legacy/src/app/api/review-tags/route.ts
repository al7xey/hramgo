import { reviewTags } from "@/features/temples/demo-data";
import { ok } from "@/lib/api/response";

export async function GET() {
  return ok({ tags: reviewTags });
}
