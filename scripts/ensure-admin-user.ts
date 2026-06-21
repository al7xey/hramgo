import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/options";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Администратор HramGo";

  if (!email || password.length < 8) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD with at least 8 chars are required");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE"
    },
    create: {
      email,
      name,
      passwordHash: hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE"
    },
    select: { id: true, email: true, role: true, status: true }
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(JSON.stringify({ email: user.email, role: user.role, status: user.status }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
