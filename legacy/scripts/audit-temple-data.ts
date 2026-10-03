import { Prisma, PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Temple data audit requires a real database connection.");
  process.exit(1);
}

const prisma = new PrismaClient();

function isMissing(value?: string | null) {
  return !value || value.trim().length === 0;
}

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED" },
    include: {
      photos: true,
      transitStations: true,
      parishServices: true,
      clergy: true,
      sources: true,
      evidences: true
    }
  });

  const duplicateNames = new Map<string, number>();
  for (const temple of temples) {
    const key = temple.name.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
    duplicateNames.set(key, (duplicateNames.get(key) ?? 0) + 1);
  }

  const report = {
    totalPublished: temples.length,
    withoutWebsite: temples.filter((temple) => isMissing(temple.websiteUrl)).length,
    withoutCoordinates: temples.filter((temple) => temple.latitude == null || temple.longitude == null).length,
    withoutAddress: temples.filter((temple) => isMissing(temple.address)).length,
    withoutSchedule: temples.filter((temple) => isMissing(temple.scheduleSummary)).length,
    withoutPhotos: temples.filter((temple) => temple.photos.length === 0).length,
    withoutHistory: temples.filter((temple) => isMissing(temple.historySummary)).length,
    withoutClergy: temples.filter((temple) => temple.clergy.length === 0 && isMissing(temple.rectorName)).length,
    withoutParishServices: temples.filter((temple) => temple.parishServices.length === 0 && temple.sundaySchoolStatus !== "YES").length,
    withoutSources: temples.filter((temple) => temple.sources.length === 0).length,
    withoutEvidence: temples.filter((temple) => temple.evidences.length === 0).length,
    withNearestMcd: temples.filter((temple) => temple.transitStations.sort((a, b) => a.walkMinutes - b.walkMinutes)[0]?.system === "mcd").length,
    suspiciousTransit: temples.filter((temple) => {
      const nearest = temple.transitStations.sort((a, b) => a.walkMinutes - b.walkMinutes)[0];
      return !nearest || nearest.walkMinutes > 60 || nearest.distanceMeters > 5000;
    }).length,
    possibleDuplicateNames: Array.from(duplicateNames.values()).filter((count) => count > 1).length,
    needsManualReview: temples
      .filter(
        (temple) =>
          isMissing(temple.address) ||
          temple.latitude == null ||
          temple.longitude == null ||
          temple.dataConfidence < 0.55 ||
          temple.sources.length === 0
      )
      .slice(0, 50)
      .map((temple) => ({ id: temple.id, slug: temple.slug, name: temple.name }))
  };

  await prisma.importJob.create({
    data: {
      type: "audit:temple-data",
      status: "COMPLETED",
      startedAt: new Date(),
      finishedAt: new Date(),
      stats: report as Prisma.InputJsonValue
    }
  });

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
