import { Prisma, PrismaClient, TempleModerationStatus } from "@prisma/client";

import { hasExplicitNonMoscowRegion, isKnownTechnicalMoscowCenterCoordinate } from "../src/features/temples/geo-quality";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: TempleModerationStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true
    },
    orderBy: { name: "asc" }
  });

  const outsideMoscow = temples.filter((temple) => hasExplicitNonMoscowRegion(temple.address));
  const technicalCenter = temples.filter((temple) =>
    isKnownTechnicalMoscowCenterCoordinate(temple.latitude, temple.longitude)
  );
  const aggregateRecords = temples.filter(
    (temple) => temple.slug === "sprav-2-russkaya-pravoslavnaya-tserkov" || temple.name === "Русская Православная Церковь"
  );
  const locationIds = Array.from(new Set([...technicalCenter, ...outsideMoscow].map((temple) => temple.id)));
  const outsideIds = Array.from(new Set(outsideMoscow.map((temple) => temple.id)));
  const aggregateIds = aggregateRecords.map((temple) => temple.id);

  const stats = {
    apply,
    publishedScanned: temples.length,
    technicalCenterCoordinates: technicalCenter.length,
    outsideMoscow: outsideMoscow.length,
    aggregateRecords: aggregateRecords.length,
    coordinatesCleared: 0,
    movedToReview: 0,
    rejectedAggregates: 0
  };

  if (apply) {
    await prisma.$transaction(async (tx) => {
      if (locationIds.length > 0) {
        await tx.templeTransit.deleteMany({ where: { templeId: { in: locationIds } } });
        await tx.temple.updateMany({
          where: { id: { in: locationIds } },
          data: { latitude: null, longitude: null, dataConfidence: 0.5 }
        });
        await tx.$executeRaw(Prisma.sql`UPDATE "Temple" SET "location" = NULL WHERE "id" IN (${Prisma.join(locationIds)})`);
        stats.coordinatesCleared = locationIds.length;
      }

      if (outsideIds.length > 0) {
        await tx.temple.updateMany({
          where: { id: { in: outsideIds } },
          data: { moderationStatus: TempleModerationStatus.REVIEW }
        });
        stats.movedToReview = outsideIds.length;
      }

      if (aggregateIds.length > 0) {
        await tx.temple.updateMany({
          where: { id: { in: aggregateIds } },
          data: { moderationStatus: TempleModerationStatus.REJECTED, latitude: null, longitude: null }
        });
        stats.rejectedAggregates = aggregateIds.length;
      }

      await tx.importJob.create({
        data: {
          type: "repair:suspicious-temple-locations",
          status: "COMPLETED",
          startedAt: new Date(),
          finishedAt: new Date(),
          stats: stats as Prisma.InputJsonValue
        }
      });
    });
  }

  console.log(
    JSON.stringify(
      {
        ...stats,
        technicalCenterSample: technicalCenter.slice(0, 30).map(toReportRow),
        outsideMoscow: outsideMoscow.map(toReportRow),
        aggregateRecords: aggregateRecords.map(toReportRow)
      },
      null,
      2
    )
  );
}

function toReportRow(temple: {
  slug: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  return {
    slug: temple.slug,
    name: temple.name,
    address: temple.address,
    latitude: temple.latitude,
    longitude: temple.longitude
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
