import { notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

async function updateHelpfulCount(reviewId: string) {
  const count = await prisma.reviewHelpfulVote.count({ where: { reviewId } });
  await prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: count } });
  return count;
}

export async function POST(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { reviewId } = await params;
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });

  if (!review) {
    return notFound("Отзыв не найден");
  }

  await prisma.reviewHelpfulVote.upsert({
    where: { reviewId_userId: { reviewId, userId: auth.user.id } },
    update: {},
    create: { reviewId, userId: auth.user.id }
  });

  return ok({ helpfulCount: await updateHelpfulCount(reviewId), helpful: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireUser();

  if (isAuthFailure(auth)) {
    return auth.response;
  }

  const { reviewId } = await params;
  await prisma.reviewHelpfulVote.deleteMany({ where: { reviewId, userId: auth.user.id } });

  return ok({ helpfulCount: await updateHelpfulCount(reviewId), helpful: false });
}
