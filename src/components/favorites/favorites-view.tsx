"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { TempleCard } from "@/components/temples/temple-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TempleCardView } from "@/features/temples/types";

const FAVORITES_STORAGE_KEY = "hramgo-favorites";

function readFavoriteIds() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

export function FavoritesView({ temples, initialIds = [] }: { temples: TempleCardView[]; initialIds?: string[] }) {
  const { status } = useSession();
  const [ids, setIds] = useState<string[]>(initialIds);

  useEffect(() => {
    const refresh = () => {
      const localIds = readFavoriteIds();
      setIds(status === "authenticated" ? localIds : Array.from(new Set([...initialIds, ...localIds])));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("hramgo:favorites-updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("hramgo:favorites-updated", refresh as EventListener);
    };
  }, [initialIds, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let isCancelled = false;
    async function loadServerFavorites() {
      const response = await fetch("/api/favorites", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = (await response.json()) as { favorites?: string[] };
      const nextIds = Array.from(new Set(payload.favorites ?? []));
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextIds));
      if (!isCancelled) setIds(nextIds);
    }
    void loadServerFavorites().catch(() => undefined);
    return () => { isCancelled = true; };
  }, [status]);

  const favorites = useMemo(() => {
    const favoriteIds = new Set(ids);
    return temples.filter((temple) => favoriteIds.has(temple.id));
  }, [ids, temples]);

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Избранное пока пусто"
        description="Сохраненные храмы появятся здесь сразу и останутся после перезагрузки."
      />
    );
  }

  return <div className="grid gap-3">{favorites.map((temple) => <TempleCard key={temple.id} temple={temple} />)}</div>;
}
