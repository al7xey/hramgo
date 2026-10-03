import { Prisma } from "@prisma/client";

import { prisma } from "../src/lib/db/prisma";

export async function createImportJob(type: string, metadata: Record<string, unknown>) {
  const stats = JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;
  const job = await prisma.importJob.create({
    data: {
      type,
      status: "QUEUED",
      stats
    }
  });

  await prisma.importLog.create({
    data: {
      importJobId: job.id,
      level: "info",
      message: `${type} queued`,
      metadata: stats
    }
  });

  console.log(`${type} queued as ${job.id}`);
  await prisma.$disconnect();
}
