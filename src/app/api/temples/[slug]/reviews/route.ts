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
    const review = await prisma.review.create({
      data: {
        templeId: temple.id,
        userId: auth.user.id,
        rating: payload.rating,
        text: payload.text,
        visitType: payload.visitType,
        status: "APPROVED",
        publishedAt: new Date(),
        accessibilityRating: payload.accessibilityRating ?? undefined,
        territoryRating: payload.territoryRating ?? undefined,
        informationRating: payload.informationRating ?? undefined,
        sundaySchoolRating: payload.sundaySchoolRating ?? undefined
      },
      select: { id: true, status: true }
    });

    await recalculateTempleReviewStats(temple.id);

    return ok({ message: "Отзыв опубликован.", review });
  } catch (error) {
    return badRequest(error);
  }
}
