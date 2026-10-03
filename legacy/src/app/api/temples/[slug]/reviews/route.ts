import { reviewSchema } from "@/features/reviews/validation";
import { getTempleBySlug } from "@/features/temples/repository";
import { badRequest, notFound, ok } from "@/lib/api/response";
import { isAuthFailure, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { recalculateTempleReviewStats } from "@/lib/reviews/ratings";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    return notFound("Храм не найден");
  }

  return ok({ reviews: temple.reviews, count: temple.reviews.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const auth = await requireUser();

    if (isAuthFailure(auth)) {
      return auth.response;
    }

    const { slug } = await params;
    const temple = await prisma.temple.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
      select: { id: true }
    });

    if (!temple) {
      return notFound("Храм не найден");
    }

    const payload = reviewSchema.parse(await request.json());
    const review = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.review.findFirst({
        where: {
          templeId: temple.id,
          userId: auth.user.id,
          status: { in: ["PENDING", "APPROVED", "NEEDS_REVIEW"] }
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true }
      });
      const publishedAt = new Date();
      const data = {
        rating: payload.rating,
        text: payload.text,
        visitType: payload.visitType,
        visitDate: payload.visitDate ? new Date(payload.visitDate) : null,
        status: "APPROVED" as const,
        publishedAt,
        editedAt: existing ? publishedAt : null,
        accessibilityRating: payload.accessibilityRating ?? null,
        territoryRating: payload.territoryRating ?? null,
        informationRating: payload.informationRating ?? null,
        sundaySchoolRating: payload.sundaySchoolRating ?? null
      };

      const saved = existing
        ? await transaction.review.update({
            where: { id: existing.id },
            data,
            select: { id: true, status: true }
          })
        : await transaction.review.create({
            data: { ...data, templeId: temple.id, userId: auth.user.id },
            select: { id: true, status: true }
          });

      await recalculateTempleReviewStats(temple.id, transaction);
      return saved;
    });

    return ok({ message: "Отзыв опубликован.", review });
  } catch (error) {
    return badRequest(error);
  }
}
