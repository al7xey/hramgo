import { prisma } from "../src/lib/db/prisma";
import { filterTemplePhotos } from "../src/features/temples/photo-quality";

const TARGET_PHOTO_COUNT = 8;

const temples = await prisma.temple.findMany({
  where: { moderationStatus: "PUBLISHED" },
  select: {
    id: true,
    name: true,
    shortName: true,
    address: true,
    district: true,
    photos: {
      where: {
        OR: [{ isApproved: true }, { isMain: true }]
      },
      select: {
        imageUrl: true,
        alt: true,
        sourceUrl: true,
        isMain: true
      }
    }
  },
  orderBy: { name: "asc" }
});

const report = temples
  .map((temple) => {
    const photos = filterTemplePhotos(temple.photos);
    const address = temple.address?.replace(/^\s*\d{6},?\s*/u, "").trim();

    return {
      id: temple.id,
      name: temple.name,
      photos: photos.length,
      needs: Math.max(0, TARGET_PHOTO_COUNT - photos.length),
      query: [temple.name, "Москва", address, temple.district, "фото храма"].filter(Boolean).join(" ")
    };
  })
  .filter((item) => item.needs > 0);

console.log(JSON.stringify({ total: temples.length, target: TARGET_PHOTO_COUNT, needsPhotos: report.length, items: report }, null, 2));
