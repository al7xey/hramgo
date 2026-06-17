import { getUploadLimits } from "@/lib/storage/s3";
import { ok } from "@/lib/api/response";

export async function POST() {
  return ok({
    message: "Фото добавлено в очередь модерации",
    limits: getUploadLimits()
  });
}
