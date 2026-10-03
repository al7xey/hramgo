import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const repairs = [
  {
    slug: "sprav-1479-feodorovskoy-ikony-bozhiey-materi-v-vorsine",
    latitude: 55.342699,
    longitude: 37.242115,
    sourceUrl: "https://sobory.ru/article/?object=09187",
    note: "Verified church coordinates for the official address in the village of Vorsino."
  },
  {
    slug: "sprav-1125-serafima-sarovskogo-prepodobnogo-na-pokrovskom-kladbische",
    latitude: 55.596971,
    longitude: 37.634246,
    sourceUrl: "https://sobory.ru/article/?object=06008",
    note: "Verified church coordinates on the Pokrovskoye cemetery."
  },
  {
    slug: "sprav-1061-ermogena-moskovskogo-i-vseya-rusi-patriarha-svyaschennomuchenika-v-kryla",
    latitude: 55.769667,
    longitude: 37.406139,
    sourceUrl:
      "https://cyclowiki.org/wiki/%D0%A5%D1%80%D0%B0%D0%BC_%D1%81%D0%B2%D1%8F%D1%89%D0%B5%D0%BD%D0%BD%D0%BE%D0%BC%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%BA%D0%B0_%D0%95%D1%80%D0%BC%D0%BE%D0%B3%D0%B5%D0%BD%D0%B0%2C_%D0%9F%D0%B0%D1%82%D1%80%D0%B8%D0%B0%D1%80%D1%85%D0%B0_%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B8_%D0%B2%D1%81%D0%B5%D1%8F_%D0%A0%D1%83%D1%81%D0%B8_%D0%B2_%D0%9A%D1%80%D1%8B%D0%BB%D0%B0%D1%82%D1%81%D0%BA%D0%BE%D0%BC",
    note: "Verified coordinates for the church at 32 Osennyaya Street, building 1."
  },
  {
    slug: "sprav-1308-ksenii-peterburgskoy-blazhennoy-v-beskudnikove",
    latitude: 55.87644,
    longitude: 37.554111,
    sourceUrl: "https://sobory.ru/article/?object=36896",
    note: "Verified church-complex coordinates in Beskudnikovo."
  }
] as const;

async function main() {
  const report = [];
  let updated = 0;

  for (const repair of repairs) {
    const temple = await prisma.temple.findUnique({
      where: { slug: repair.slug },
      select: { id: true, slug: true, name: true, address: true, latitude: true, longitude: true }
    });
    if (!temple) {
      report.push({ slug: repair.slug, status: "missing" });
      continue;
    }

    const changed = temple.latitude !== repair.latitude || temple.longitude !== repair.longitude;
    report.push({
      slug: temple.slug,
      name: temple.name,
      address: temple.address,
      from: [temple.latitude, temple.longitude],
      to: [repair.latitude, repair.longitude],
      sourceUrl: repair.sourceUrl,
      status: changed ? "repair" : "unchanged"
    });

    if (!apply || !changed) continue;

    await prisma.$transaction([
      prisma.temple.update({
        where: { id: temple.id },
        data: { latitude: repair.latitude, longitude: repair.longitude, lastVerifiedAt: new Date() }
      }),
      prisma.templeFieldEvidence.create({
        data: {
          templeId: temple.id,
          fieldName: "coordinates",
          value: `${repair.latitude}, ${repair.longitude}`,
          sourceUrl: repair.sourceUrl,
          quote: repair.note,
          confidence: 0.85,
          lastCheckedAt: new Date()
        }
      })
    ]);
    updated += 1;
  }

  if (apply) {
    await prisma.importJob.create({
      data: {
        type: "repair:coordinate-collisions",
        status: "COMPLETED",
        startedAt: new Date(),
        finishedAt: new Date(),
        stats: { updated, report } as Prisma.InputJsonValue
      }
    });
  }

  console.log(JSON.stringify({ apply, updated, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
