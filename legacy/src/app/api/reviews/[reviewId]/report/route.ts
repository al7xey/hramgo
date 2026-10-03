import { reviewReportSchema } from "@/features/reviews/validation";
import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  return ok({ message: "Жалобу на отзыв можно отправить POST-запросом" });
}

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const { reviewId } = await params;
    const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });

    if (!review) {
      return notFound("Отзыв не найден");
    }

    const payload = reviewReportSchema.parse(await request.json());
    await prisma.reviewReport.create({
      data: {
        reviewId,
        userId: auth.user.id,
        reason: payload.reason,
        comment: payload.comment
      }
    });
    const reportsCount = await prisma.reviewReport.count({ where: { reviewId, status: "OPEN" } });
    await prisma.review.update({ where: { id: reviewId }, data: { reportsCount } });

    return ok({ message: "Жалоба отправлена модератору", reportsCount });
  } catch (error) {
    return badRequest(error);
  }
}
