"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadCatalog } from "@/features/temples/client-catalog";
import { searchTemples } from "@/features/temples/search";
import type { TempleView } from "@/features/temples/types";
import { LazyTempleMap } from "./lazy-temple-map";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { Button } from "@/components/ui/button";
import { templeSearchSchema } from "@/features/temples/validation";
export function MapBrowser() {
  const params = useSearchParams();
  const [items, setItems] = useState<TempleView[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadCatalog()
      .then((data) => {
        if (active) {
          setItems(data);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const input = useMemo(
    () =>
      templeSearchSchema.parse(
        Object.fromEntries(
          [...new Set(params.keys())].map((k) => [
            k,
            params.getAll(k).length > 1
              ? params.getAll(k)
              : (params.get(k) ?? undefined)
          ])
        )
      ),
    [params]
  );
  const query = input.query ?? "";
  const temples = useMemo(
    () =>
      searchTemples(items, input)
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({ ...t, photoUrl: t.photos[0]?.imageUrl })),
    [items, input]
  );
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">
          Карта храмов Москвы
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loading ? "Загрузка…" : `Показано храмов: ${temples.length}`}
        </p>
      </div>
      {error ? (
        <div role="alert">
          Не удалось загрузить карту.{" "}
          <Button onClick={() => setRetry((v) => v + 1)}>Повторить</Button>
        </div>
      ) : loading ? (
        <p role="status">Загрузка храмов…</p>
      ) : (
        <LazyTempleMap
          temples={temples}
          activeSlug={params.get("temple") ?? undefined}
          sidebarTop={
            <TempleSearchBar
              key={params.toString()}
              action="/map/"
              defaultValue={query}
            />
          }
        />
      )}
    </div>
  );
}
