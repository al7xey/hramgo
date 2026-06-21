import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="grid gap-5">
        <div>
          <h1 className="text-3xl font-semibold">Пользователи</h1>
          <p className="mt-2 text-sm text-muted-foreground">Для списка пользователей нужна подключённая база данных.</p>
        </div>
        <AdminUsersManager initialUsers={[]} />
      </div>
    );
  }

  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: { reviews: true, favorites: true }
      }
    }
  });

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Пользователи</h1>
        <p className="mt-2 text-sm text-muted-foreground">Управление аккаунтами, отзывами и избранным.</p>
      </div>
      <AdminUsersManager initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))} />
    </div>
  );
}
