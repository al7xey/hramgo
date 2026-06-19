import { prisma } from "@/lib/db/prisma";

export async function recalculateTempleReviewStats(templeId: string) {
  const [ratingStats, ratingGroups] = await Promise.all([
    prisma.review.aggregate({
      where: { templeId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { templeId, status: "APPROVED" },
      _count: { rating: true }
    })
  ]);
  const counts = new Map(ratingGroups.map((item) => [item.rating, item._count.rating]));

  await prisma.temple.update({
    where: { id: templeId },
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
}
