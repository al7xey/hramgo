import type { Prisma } from "@prisma/client";

import { reviewSchema } from "@/features/reviews/validation";
import { badRequest, forbidden, notFound, ok } from "@/lib/api/response";
import { canModerate, isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { recalculateTempleReviewStats } from "@/lib/reviews/ratings";

function canManageReview(user: { id: string; role?: string }, ownerId: string) {
  return user.id === ownerId || canModerate(user);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const { reviewId } = await params;
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, templeId: true }
    });

    if (!review) {
      return notFound("Отзыв не найден");
    }

    if (!canManageReview(auth.user, review.userId)) {
      return forbidden();
    }

    const payload = reviewSchema.partial().parse(await request.json());
    const data: Prisma.ReviewUpdateInput = {
      editedAt: new Date(),
      status: "APPROVED",
      publishedAt: new Date()
    };

    if (payload.rating !== undefined) data.rating = payload.rating;
    if (payload.text !== undefined) data.text = payload.text;
    if (payload.visitType !== undefined) data.visitType = payload.visitType;
    if (payload.visitDate !== undefined) data.visitDate = payload.visitDate ? new Date(payload.visitDate) : null;
    if (payload.accessibilityRating !== undefined) data.accessibilityRating = payload.accessibilityRating;
    if (payload.territoryRating !== undefined) data.territoryRating = payload.territoryRating;
    if (payload.informationRating !== undefined) data.informationRating = payload.informationRating;
    if (payload.sundaySchoolRating !== undefined) data.sundaySchoolRating = payload.sundaySchoolRating;

    const updated = await prisma.review.update({
      where: { id: review.id },
      data,
      select: { id: true, rating: true, text: true, status: true, publishedAt: true, editedAt: true }
    });

    await recalculateTempleReviewStats(review.templeId);

    return ok({ message: "Отзыв обновлён", review: updated });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { reviewId } = await params;
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, templeId: true }
  });

  if (!review) {
    return notFound("Отзыв не найден");
  }

  if (!canManageReview(auth.user, review.userId)) {
    return forbidden();
  }

  await prisma.review.update({
    where: { id: review.id },
    data: { status: "HIDDEN", editedAt: new Date() }
  });
  await recalculateTempleReviewStats(review.templeId);

  return ok({ message: "Отзыв удалён" });
}
