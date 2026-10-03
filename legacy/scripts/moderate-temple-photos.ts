import { PrismaClient } from "@prisma/client";

import { isLikelyTemplePhoto } from "../src/features/temples/photo-quality";

const prisma = new PrismaClient();

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      photos: {
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          imageUrl: true,
          alt: true,
          sourceUrl: true,
          isMain: true,
          isApproved: true,
          moderationStatus: true
        }
      }
    }
  });

  let hidden = 0;
  let mainFixed = 0;
  let withoutGoodPhoto = 0;

  for (const temple of temples) {
    const goodPhotos = temple.photos.filter((photo) => isLikelyTemplePhoto(photo));
    const badPhotos = temple.photos.filter((photo) => !isLikelyTemplePhoto(photo));

    for (const photo of badPhotos) {
      if (photo.moderationStatus === "HIDDEN" && !photo.isApproved && !photo.isMain) continue;
      await prisma.templePhoto.update({
        where: { id: photo.id },
        data: { moderationStatus: "HIDDEN", isApproved: false, isMain: false }
      });
      hidden += 1;
    }

    if (goodPhotos.length === 0) {
      withoutGoodPhoto += 1;
      continue;
    }

    const currentMain = goodPhotos.find((photo) => photo.isMain && photo.isApproved && photo.moderationStatus !== "HIDDEN");
    if (!currentMain) {
      await prisma.templePhoto.updateMany({ where: { templeId: temple.id }, data: { isMain: false } });
      await prisma.templePhoto.update({
        where: { id: goodPhotos[0].id },
        data: { isMain: true, isApproved: true, moderationStatus: "APPROVED" }
      });
      mainFixed += 1;
    }
  }

  const stats = { temples: temples.length, hidden, mainFixed, withoutGoodPhoto };
  await prisma.importJob.create({
    data: {
      type: "moderate:temple-photos",
      status: "COMPLETED",
      startedAt: new Date(),
      finishedAt: new Date(),
      stats
    }
  });

  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
