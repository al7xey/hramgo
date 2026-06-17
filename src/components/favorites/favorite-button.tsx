"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAVORITES_STORAGE_KEY = "hramgo-favorites";
let serverFavoritesPromise: Promise<Set<string>> | null = null;

function readFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new CustomEvent("hramgo:favorites-updated"));
}

async function syncFavorite(templeId: string, nextValue: boolean) {
  if (nextValue) {
    const response = await fetch("/api/favorites", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templeId })
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    return;
  }

  const response = await fetch(`/api/favorites/${templeId}`, {
    method: "DELETE",
    credentials: "same-origin"
  });
  if (!response.ok) {
    throw new Error(String(response.status));
  }
}

async function readServerFavorites() {
  if (!serverFavoritesPromise) {
    serverFavoritesPromise = fetch("/api/favorites", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          return readFavorites();
        }

        const payload = (await response.json()) as { favorites?: string[] };
        const favorites = readFavorites();
        (payload.favorites ?? []).forEach((id) => favorites.add(id));
        return favorites;
      })
      .catch(() => readFavorites());
  }

  return serverFavoritesPromise;
}

export function FavoriteButton({ templeId }: { templeId: string; compact?: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(() => {
    setIsFavorite(readFavorites().has(templeId));
  }, [templeId]);

  useEffect(() => {
    refresh();

    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("hramgo:favorites-updated", onStorage as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hramgo:favorites-updated", onStorage as EventListener);
    };
  }, [refresh]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isCancelled = false;

    async function loadServerFavorites() {
      const favorites = await readServerFavorites();

      if (!isCancelled) {
        writeFavorites(favorites);
        setIsFavorite(favorites.has(templeId));
      }
    }

    void loadServerFavorites();

    return () => {
      isCancelled = true;
    };
  }, [status, templeId]);

  const goToLogin = () => {
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?intent=favorites&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  const toggleFavorite = async () => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      goToLogin();
      return;
    }

    const favorites = readFavorites();
    const nextValue = !favorites.has(templeId);

    if (nextValue) {
      favorites.add(templeId);
    } else {
      favorites.delete(templeId);
    }

    setPending(true);
    setIsFavorite(nextValue);
    writeFavorites(favorites);
    serverFavoritesPromise = Promise.resolve(favorites);

    try {
      await syncFavorite(templeId, nextValue);
    } catch {
      if (nextValue) {
        favorites.delete(templeId);
      } else {
        favorites.add(templeId);
      }
      setIsFavorite(!nextValue);
      writeFavorites(favorites);
      serverFavoritesPromise = null;
      goToLogin();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-[54px] shrink-0 rounded-full border-0 bg-transparent p-0 text-danger shadow-none transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-auto disabled:opacity-100",
        isFavorite && "bg-danger/10 text-danger"
      )}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
      disabled={pending}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite();
      }}
    >
      <Heart className={cn("size-6", isFavorite && "fill-current")} aria-hidden />
    </Button>
  );
}
