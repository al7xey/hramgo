import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MOSCOW_CENTER = { latitude: 55.751244, longitude: 37.618423 };

function distanceKm(left, right) {
  if (!left.latitude || !left.longitude || !right.latitude || !right.longitude) return Number.POSITIVE_INFINITY;
  const earthRadiusKm = 6371;
  const dLat = ((right.latitude - left.latitude) * Math.PI) / 180;
  const dLon = ((right.longitude - left.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((left.latitude * Math.PI) / 180) * Math.cos((right.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function moveRelation(model, fromTempleId, toTempleId) {
  await model.updateMany({ where: { templeId: fromTempleId }, data: { templeId: toTempleId } });
}

async function mergePokrovGorodne() {
  const keeper = await prisma.temple.findUnique({
    where: { slug: "hram-pokrova-presvyatoy-bogoroditsy-na-gorodne" }
  });

  if (!keeper) return { merged: 0 };

  const duplicates = await prisma.temple.findMany({
    where: {
      id: { not: keeper.id },
      moderationStatus: "PUBLISHED",
      name: "Храм Покрова Пресвятой Богородицы на Городне"
    }
  });

  let merged = 0;
  for (const duplicate of duplicates) {
    if (distanceKm(keeper, duplicate) > 0.5) continue;

    await prisma.favorite.deleteMany({ where: { templeId: duplicate.id } });
    await prisma.templeTransit.deleteMany({ where: { templeId: duplicate.id } });
    await moveRelation(prisma.templePhoto, duplicate.id, keeper.id);
    await moveRelation(prisma.templeSource, duplicate.id, keeper.id);
    await moveRelation(prisma.templeFieldEvidence, duplicate.id, keeper.id);
    await moveRelation(prisma.templeSocialLink, duplicate.id, keeper.id);
    await moveRelation(prisma.templeClergy, duplicate.id, keeper.id);
    await moveRelation(prisma.templeParishService, duplicate.id, keeper.id);
    await moveRelation(prisma.review, duplicate.id, keeper.id);
    await moveRelation(prisma.templeRepresentative, duplicate.id, keeper.id);
    await moveRelation(prisma.templeEditSuggestion, duplicate.id, keeper.id);
    await prisma.temple.delete({ where: { id: duplicate.id } });
    merged += 1;
  }

  const hasMain = await prisma.templePhoto.findFirst({ where: { templeId: keeper.id, isMain: true } });
  if (!hasMain) {
    const firstPhoto = await prisma.templePhoto.findFirst({ where: { templeId: keeper.id }, orderBy: { createdAt: "asc" } });
    if (firstPhoto) {
      await prisma.templePhoto.update({
        where: { id: firstPhoto.id },
        data: { isMain: true, isApproved: true, moderationStatus: "APPROVED" }
      });
    }
  }

  await prisma.templeTransit.deleteMany({ where: { templeId: keeper.id } });
  await prisma.templeTransit.create({
    data: {
      templeId: keeper.id,
      station: "Покровское",
      lineId: "D2",
      lineName: "МЦД-2 Курско-Рижский",
      lineColor: "#E94282",
      system: "mcd",
      distanceMeters: 180,
      walkMinutes: 2
    }
  });

  return { merged };
}

async function removeSuspiciousCoordinateClusters() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED", latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, address: true, latitude: true, longitude: true }
  });
  const groups = new Map();

  for (const temple of temples) {
    const key = `${temple.latitude.toFixed(6)},${temple.longitude.toFixed(6)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(temple);
  }

  const suspicious = [...groups.entries()]
    .filter(([, items]) => items.length >= 10)
    .filter(([key]) => {
      const [latitude, longitude] = key.split(",").map(Number);
      return distanceKm(MOSCOW_CENTER, { latitude, longitude }) < 3;
    });

  let cleared = 0;
  const clusters = [];

  for (const [key, items] of suspicious) {
    const ids = items.map((item) => item.id);
    await prisma.templeTransit.deleteMany({ where: { templeId: { in: ids } } });
    await prisma.temple.updateMany({
      where: { id: { in: ids } },
      data: { latitude: null, longitude: null }
    });
    cleared += ids.length;
    clusters.push({ key, count: ids.length, names: items.slice(0, 5).map((item) => item.name) });
  }

  return { cleared, clusters };
}

const result = {
  pokrovGorodne: await mergePokrovGorodne(),
  suspiciousCoordinateClusters: await removeSuspiciousCoordinateClusters()
};

console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
