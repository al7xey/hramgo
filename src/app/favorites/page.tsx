import { FavoritesView } from "@/components/favorites/favorites-view";
import { listTemples } from "@/features/temples/repository";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  const favoriteIds = session?.user?.id
    ? (
        await prisma.favorite.findMany({
          where: { userId: session.user.id },
          select: { templeId: true },
          orderBy: { createdAt: "desc" }
        })
      ).map((item) => item.templeId)
    : [];
  const temples = favoriteIds.length > 0 ? await listTemples({ ids: favoriteIds }) : [];

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Избранное</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Быстрый доступ к сохраненным храмам, сайтам и актуальной информации.
        </p>
      </div>
      <FavoritesView temples={temples} initialIds={favoriteIds} />
    </div>
  );
}
