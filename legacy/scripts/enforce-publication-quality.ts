import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const temples = await prisma.temple.findMany({
    where: {
      moderationStatus: "PUBLISHED",
      OR: [
        { address: null },
        { address: "" },
        { photos: { none: { OR: [{ isApproved: true }, { isMain: true }] } } }
      ]
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      _count: {
        select: {
          photos: { where: { OR: [{ isApproved: true }, { isMain: true }] } }
        }
      }
    }
  });

  const stats = {
    apply,
    candidates: temples.length,
    withoutAddress: temples.filter((temple) => !temple.address?.trim()).length,
    withoutApprovedPhoto: temples.filter((temple) => temple._count.photos === 0).length,
    movedToReview: 0
  };

  if (apply && temples.length > 0) {
    await prisma.$transaction([
      prisma.temple.updateMany({
        where: { id: { in: temples.map((temple) => temple.id) } },
        data: { moderationStatus: "REVIEW" }
      }),
      prisma.importJob.create({
        data: {
          type: "enforce:publication-quality",
          status: "COMPLETED",
          startedAt: new Date(),
          finishedAt: new Date(),
          stats: { ...stats, movedToReview: temples.length }
        }
      })
    ]);
    stats.movedToReview = temples.length;
  }

  console.log(
    JSON.stringify(
      {
        ...stats,
        sample: temples.slice(0, 100).map((temple) => ({
          slug: temple.slug,
          name: temple.name,
          address: temple.address,
          photos: temple._count.photos
        }))
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
