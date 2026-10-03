import { PrismaClient, type TemplePhoto } from "@prisma/client";

const prisma = new PrismaClient();

type TempleWithPhotos = {
  id: string;
  name: string;
  websiteUrl: string | null;
  sourcePrimaryUrl: string | null;
  photos: TemplePhoto[];
};

function getHostname(url?: string | null) {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

function scorePhoto(temple: TempleWithPhotos, photo: TemplePhoto) {
  const sourceHost = getHostname(photo.sourceUrl);
  const websiteHost = getHostname(temple.websiteUrl);
  const primaryHost = getHostname(temple.sourcePrimaryUrl);
  let score = 0;

  if (photo.isMain) score += 1000;
  if (photo.isApproved) score += 500;
  if (photo.moderationStatus === "APPROVED") score += 400;
  if (photo.copyrightStatus === "OFFICIAL_SITE") score += 300;
  if (photo.id.startsWith("moseparh-")) score += 250;
  if (sourceHost && websiteHost && sourceHost === websiteHost) score += 240;
  if (sourceHost && primaryHost && sourceHost === primaryHost) score += 220;
  if (photo.sourceUrl?.includes("sprav.moseparh.ru")) score += 200;
  if (photo.sourceUrl?.includes("patriarchia.ru")) score += 120;
  if (photo.sourceUrl?.includes("commons.wikimedia.org")) score -= 250;
  if (photo.sourceUrl?.includes("openverse")) score -= 250;
  if (photo.copyrightStatus === "OPEN_LICENSE") score -= 150;
  if (photo.copyrightStatus === "USER_UPLOADED") score -= 100;

  return score;
}

function choosePhoto(temple: TempleWithPhotos) {
  return [...temple.photos].sort((a, b) => {
    const diff = scorePhoto(temple, b) - scorePhoto(temple, a);
    if (diff !== 0) return diff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const temples = await prisma.temple.findMany({
    where: {
      photos: { some: {} }
    },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      sourcePrimaryUrl: true,
      photos: {
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  const stats = {
    templesScanned: temples.length,
    templesChanged: 0,
    photosDeleted: 0,
    alreadySinglePhoto: 0,
    withoutPhotos: 0
  };
  const changed: Array<{ temple: string; kept: string; deleted: number; sourceUrl: string | null }> = [];

  for (const temple of temples) {
    if (temple.photos.length === 0) {
      stats.withoutPhotos += 1;
      continue;
    }

    if (temple.photos.length === 1) {
      stats.alreadySinglePhoto += 1;
      const onlyPhoto = temple.photos[0];
      if (apply && (!onlyPhoto.isMain || !onlyPhoto.isApproved || onlyPhoto.moderationStatus !== "APPROVED")) {
        await prisma.templePhoto.update({
          where: { id: onlyPhoto.id },
          data: { isMain: true, isApproved: true, moderationStatus: "APPROVED" }
        });
      }
      continue;
    }

    const keep = choosePhoto(temple);
    const deleteIds = temple.photos.filter((photo) => photo.id !== keep.id).map((photo) => photo.id);

    stats.templesChanged += 1;
    stats.photosDeleted += deleteIds.length;
    changed.push({ temple: temple.name, kept: keep.id, deleted: deleteIds.length, sourceUrl: keep.sourceUrl });

    if (!apply) continue;

    await prisma.$transaction([
      prisma.templePhoto.deleteMany({ where: { id: { in: deleteIds } } }),
      prisma.templePhoto.update({
        where: { id: keep.id },
        data: {
          isMain: true,
          isApproved: true,
          moderationStatus: "APPROVED",
          copyrightStatus: keep.copyrightStatus === "MANUAL_REVIEW" ? "OFFICIAL_SITE" : keep.copyrightStatus
        }
      })
    ]);
  }

  console.log(JSON.stringify({ apply, stats, changed: changed.slice(0, 50) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
