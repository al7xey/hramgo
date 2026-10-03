import { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const activeReviewStatuses: ReviewStatus[] = ["PENDING", "APPROVED", "NEEDS_REVIEW"];

function normalizeName(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/\s+/gu, " ").trim();
}

function normalizeAddress(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/\b\d{6}\b/gu, " ")
    .replace(/(?:^|[\s,])г(?:ород)?\.?\s*москва(?=$|[\s,])/giu, " ")
    .replace(/(?:^|[\s,])(?:улица|ул)\.?(?=$|[\s,])/giu, " ул ")
    .replace(/(?:^|[\s,])(?:переулок|пер)\.?(?=$|[\s,])/giu, " пер ")
    .replace(/(?:^|[\s,])(?:площадь|пл)\.?(?=$|[\s,])/giu, " пл ")
    .replace(/(?:^|[\s,])(?:набережная|наб)\.?(?=$|[\s,])/giu, " наб ")
    .replace(/(?:^|[\s,])(?:проезд|пр-д|пр)\.?(?=$|[\s,])/giu, " прд ")
    .replace(/(?:^|[\s,])(?:дом|д)\.?(?=$|[\s,])/giu, " ")
    .replace(/(?:^|[\s,])(?:строение|стр)\.?(?=$|[\s,])/giu, " стр ")
    .replace(/(?:^|[\s,])б\.?(?=$|[\s,])/giu, " большая ")
    .replace(/[–—]/gu, "-")
    .replace(/[^а-яa-z0-9/-]+/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function completenessScore(temple: TempleCandidate) {
  const fields = [
    temple.websiteUrl,
    temple.description,
    temple.historySummary,
    temple.scheduleSummary,
    temple.sourcePrimaryUrl,
    temple.latitude,
    temple.longitude
  ];
  const verifiedDay = (temple.lastVerifiedAt?.getTime() ?? 0) / 86_400_000;
  return fields.filter((value) => value !== null && value !== "").length * 10 + Math.min(temple._count.sources, 1) * 5 + temple._count.photos * 3 + verifiedDay;
}

type TempleCandidate = Prisma.TempleGetPayload<{
  select: {
    id: true;
    slug: true;
    name: true;
    address: true;
    websiteUrl: true;
    description: true;
    historySummary: true;
    scheduleSummary: true;
    sourcePrimaryUrl: true;
    latitude: true;
    longitude: true;
    lastVerifiedAt: true;
    _count: { select: { sources: true; photos: true; reviews: true; favorites: true } };
  };
}>;

async function recalculateReviewStats(templeId: string, tx: Prisma.TransactionClient) {
  const reviews = await tx.review.findMany({
    where: { templeId, status: "APPROVED" },
    select: { rating: true }
  });
  const counts = [1, 2, 3, 4, 5].map((rating) => reviews.filter((review) => review.rating === rating).length);
  const average = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  await tx.temple.update({
    where: { id: templeId },
    data: {
      reviewsCount: reviews.length,
      approvedReviewsCount: reviews.length,
      averageHelpfulnessRating: average,
      rating1Count: counts[0],
      rating2Count: counts[1],
      rating3Count: counts[2],
      rating4Count: counts[3],
      rating5Count: counts[4]
    }
  });
}

async function mergeUserRelations(keeperId: string, duplicateId: string, tx: Prisma.TransactionClient) {
  const favorites = await tx.favorite.findMany({ where: { templeId: duplicateId }, select: { userId: true } });
  for (const favorite of favorites) {
    await tx.favorite.upsert({
      where: { userId_templeId: { userId: favorite.userId, templeId: keeperId } },
      create: { userId: favorite.userId, templeId: keeperId },
      update: {}
    });
  }
  await tx.favorite.deleteMany({ where: { templeId: duplicateId } });

  const reviews = await tx.review.findMany({ where: { templeId: duplicateId }, select: { id: true, userId: true, status: true } });
  for (const review of reviews) {
    const hasActiveReview = activeReviewStatuses.includes(review.status)
      ? await tx.review.findFirst({
          where: { templeId: keeperId, userId: review.userId, status: { in: activeReviewStatuses } },
          select: { id: true }
        })
      : null;
    if (!hasActiveReview) {
      await tx.review.update({ where: { id: review.id }, data: { templeId: keeperId } });
    }
  }

  await tx.templeEditSuggestion.updateMany({ where: { templeId: duplicateId }, data: { templeId: keeperId } });
}

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED", address: { not: null } },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      websiteUrl: true,
      description: true,
      historySummary: true,
      scheduleSummary: true,
      sourcePrimaryUrl: true,
      latitude: true,
      longitude: true,
      lastVerifiedAt: true,
      _count: { select: { sources: true, photos: true, reviews: true, favorites: true } }
    }
  });

  const groups = new Map<string, TempleCandidate[]>();
  for (const temple of temples) {
    const address = normalizeAddress(temple.address ?? "");
    if (!address) continue;
    const key = `${normalizeName(temple.name)}|${address}`;
    groups.set(key, [...(groups.get(key) ?? []), temple]);
  }

  const duplicates = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((left, right) => completenessScore(right) - completenessScore(left)));

  let hidden = 0;
  let reviewsMoved = 0;
  let favoritesMoved = 0;
  const report = duplicates.map(([keeper, ...items]) => ({
    keeper: { slug: keeper.slug, name: keeper.name, address: keeper.address },
    duplicates: items.map((item) => ({
      slug: item.slug,
      address: item.address,
      reviews: item._count.reviews,
      favorites: item._count.favorites
    }))
  }));

  if (apply) {
    for (const [keeper, ...items] of duplicates) {
      await prisma.$transaction(async (tx) => {
        for (const duplicate of items) {
          await mergeUserRelations(keeper.id, duplicate.id, tx);
          await tx.temple.update({ where: { id: duplicate.id }, data: { moderationStatus: "REVIEW" } });
          hidden += 1;
          reviewsMoved += duplicate._count.reviews;
          favoritesMoved += duplicate._count.favorites;
        }
        await recalculateReviewStats(keeper.id, tx);
      });
    }

    await prisma.importJob.create({
      data: {
        type: "dedupe:published-temples",
        status: "COMPLETED",
        startedAt: new Date(),
        finishedAt: new Date(),
        stats: { groups: duplicates.length, hidden, reviewsMoved, favoritesMoved, report } as Prisma.InputJsonValue
      }
    });
  }

  console.log(JSON.stringify({ apply, groups: duplicates.length, hidden, reviewsMoved, favoritesMoved, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
