import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const concurrency = Math.max(1, Math.min(20, Number(process.env.TEMPLE_PHOTO_AUDIT_CONCURRENCY ?? 10)));
const timeoutMs = Math.max(2000, Number(process.env.TEMPLE_PHOTO_AUDIT_TIMEOUT_MS ?? 10000));

async function main() {
  const temples = await prisma.temple.findMany({
    where: { moderationStatus: "PUBLISHED" },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      photos: {
        where: { OR: [{ isApproved: true }, { isMain: true }] },
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { imageUrl: true, sourceUrl: true }
      }
    }
  });

  const withoutPhoto = temples.filter((temple) => temple.photos.length === 0);
  const withPhoto = temples.filter((temple) => temple.photos.length > 0);
  const unavailable: Array<{ slug: string; name: string; imageUrl: string; sourceUrl: string | null; reason: string }> = [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < withPhoto.length) {
        const temple = withPhoto[cursor++];
        const photo = temple.photos[0];
        const result = await checkImage(photo.imageUrl);

        if (!result.ok) {
          unavailable.push({
            slug: temple.slug,
            name: temple.name,
            imageUrl: photo.imageUrl,
            sourceUrl: photo.sourceUrl,
            reason: result.reason
          });
        }
      }
    })
  );

  console.log(
    JSON.stringify(
      {
        published: temples.length,
        withPhoto: withPhoto.length,
        withoutPhoto: withoutPhoto.map((temple) => ({ slug: temple.slug, name: temple.name })),
        unavailable
      },
      null,
      2
    )
  );
}

async function checkImage(imageUrl: string): Promise<{ ok: boolean; reason: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        range: "bytes=0-2047",
        "user-agent": "HramGo public photo health check/1.0 (https://hramgo.ru)"
      },
      redirect: "follow",
      signal: controller.signal
    });
    const contentType = response.headers.get("content-type") ?? "";
    await response.body?.cancel();

    if (!response.ok && response.status !== 206) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    return contentType.toLocaleLowerCase().startsWith("image/")
      ? { ok: true, reason: "ok" }
      : { ok: false, reason: `content-type ${contentType || "missing"}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "request failed" };
  } finally {
    clearTimeout(timeout);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
