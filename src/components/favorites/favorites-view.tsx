"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { TempleCard } from "@/components/temples/temple-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TempleView } from "@/features/temples/types";

const FAVORITES_STORAGE_KEY = "hramgo-favorites";

function readFavoriteIds() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

export function FavoritesView({ temples, initialIds = [] }: { temples: TempleView[]; initialIds?: string[] }) {
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

  const favorites = useMemo(() => temples.filter((temple) => ids.includes(temple.id)), [ids, temples]);

  if (favorites.length === 0) {
    return <EmptyState icon={Heart} title="\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e" description="\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043d\u044b\u0435 \u0445\u0440\u0430\u043c\u044b \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c \u0441\u0440\u0430\u0437\u0443 \u0438 \u043e\u0441\u0442\u0430\u043d\u0443\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u043f\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438." />;
  }

  return <div className="grid gap-3">{favorites.map((temple) => <TempleCard key={temple.id} temple={temple} />)}</div>;
}
