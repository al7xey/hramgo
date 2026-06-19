import { getUploadLimits } from "@/lib/storage/s3";
import { forbidden, notFound, ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { reviewId } = await params;
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true }
  });

  if (!review) {
    return notFound("Отзыв не найден");
  }

  if (review.userId !== auth.user.id && !canModerate(auth.user)) {
    return forbidden();
  }

  return ok({
    message: "Фото добавлено в очередь модерации",
    limits: getUploadLimits()
  });
}
