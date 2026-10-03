import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const replacements = [
  {
    slug: "sprav-986-ioanna-predtechi-na-hovanskom-kladbische",
    imageUrl: "https://sobory.ru/pic/08500/08523_20200921_212513.jpg",
    sourceUrl: "https://sobory.ru/photo/419193"
  }
];

async function main() {
  const apply = process.argv.includes("--apply");
  const report: Array<{ slug: string; status: string; previousUrl?: string }> = [];

  for (const replacement of replacements) {
    const temple = await prisma.temple.findUnique({
      where: { slug: replacement.slug },
      select: {
        id: true,
        name: true,
        photos: {
          orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { id: true, imageUrl: true }
        }
      }
    });

    if (!temple) {
      report.push({ slug: replacement.slug, status: "temple-not-found" });
      continue;
    }

    const current = temple.photos[0];
    if (!current) {
      report.push({ slug: replacement.slug, status: "photo-not-found" });
      continue;
    }

    if (apply) {
      await prisma.templePhoto.update({
        where: { id: current.id },
        data: {
          imageUrl: replacement.imageUrl,
          sourceUrl: replacement.sourceUrl,
          alt: `${temple.name}, Москва`,
          copyrightStatus: "PERMISSION_NEEDED",
          moderationStatus: "APPROVED",
          isApproved: true,
          isMain: true
        }
      });
    }

    report.push({
      slug: replacement.slug,
      status: apply ? "updated" : "would-update",
      previousUrl: current.imageUrl
    });
  }

  if (apply) {
    await prisma.importJob.create({
      data: {
        type: "repair:known-photo-links",
        status: "COMPLETED",
        startedAt: new Date(),
        finishedAt: new Date(),
        stats: { updated: report.filter((item) => item.status === "updated").length, report }
      }
    });
  }

  console.log(JSON.stringify({ apply, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
