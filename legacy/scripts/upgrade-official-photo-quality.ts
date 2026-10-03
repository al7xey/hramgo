import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getHigherQualityUrl(url: string) {
  return url.replace(/\/thumb_/u, "/").replace(/(^|\/)thumb_/u, "$1");
}

async function isImageAvailable(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "user-agent": "HramGo photo quality check" }
    });

    if (!response.ok) return false;
    return (response.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const photos = await prisma.templePhoto.findMany({
    where: {
      imageUrl: { contains: "thumb_" },
      OR: [{ isMain: true }, { isApproved: true }]
    },
    select: {
      id: true,
      imageUrl: true,
      sourceUrl: true,
      temple: { select: { name: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const stats = {
    scanned: photos.length,
    upgraded: 0,
    unavailable: 0,
    unchanged: 0
  };
  const changed: Array<{ temple: string; from: string; to: string }> = [];

  for (const photo of photos) {
    const nextUrl = getHigherQualityUrl(photo.imageUrl);
    if (nextUrl === photo.imageUrl) {
      stats.unchanged += 1;
      continue;
    }

    const available = await isImageAvailable(nextUrl);
    if (!available) {
      stats.unavailable += 1;
      continue;
    }

    stats.upgraded += 1;
    changed.push({ temple: photo.temple.name, from: photo.imageUrl, to: nextUrl });

    if (apply) {
      await prisma.templePhoto.update({
        where: { id: photo.id },
        data: { imageUrl: nextUrl }
      });
    }
  }

  console.log(JSON.stringify({ apply, stats, changed: changed.slice(0, 30) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
