import { getServerSession } from "next-auth";

import { reviewSchema } from "@/features/reviews/validation";
import { getTempleBySlug } from "@/features/temples/repository";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return unauthorized();
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
        userId,
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

    const [ratingStats, ratingGroups] = await Promise.all([
      prisma.review.aggregate({
        where: { templeId: temple.id, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true }
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { templeId: temple.id, status: "APPROVED" },
        _count: { rating: true }
      })
    ]);
    const counts = new Map(ratingGroups.map((item) => [item.rating, item._count.rating]));

    await prisma.temple.update({
      where: { id: temple.id },
      data: {
        reviewsCount: ratingStats._count._all,
        approvedReviewsCount: ratingStats._count._all,
        averageHelpfulnessRating: ratingStats._avg.rating ?? 0,
        rating5Count: counts.get(5) ?? 0,
        rating4Count: counts.get(4) ?? 0,
        rating3Count: counts.get(3) ?? 0,
        rating2Count: counts.get(2) ?? 0,
        rating1Count: counts.get(1) ?? 0
      }
    });

    return ok({ message: "Отзыв опубликован.", review });
  } catch (error) {
    return badRequest(error);
  }
}
