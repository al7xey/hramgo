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
import Link from "next/link";
import { routeToYandexMaps } from "@/lib/utils";
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
  const results = useMemo(() => searchTemples(items, input), [items, input]);
  const temples = useMemo(
    () =>
      results
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({ ...t, photoUrl: t.photos[0]?.imageUrl })),
    [results]
  );
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">
          Карта храмов Москвы
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loading
            ? "Загрузка…"
            : `На карте: ${temples.length} из ${results.length}`}
          {!loading && results.length > temples.length && (
            <>
              {" "}
              · У {results.length - temples.length} храмов координаты
              уточняются; они доступны в списке.
            </>
          )}
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
            <div className="grid gap-4">
              <TempleSearchBar
                key={params.toString()}
                action="/map/"
                defaultValue={query}
                parameters={params.toString()}
              />
              {temples.length === 0 ? (
                <p role="status">
                  На карте нет совпадений. У части храмов уточняются координаты.{" "}
                  <Link href={`/temples/?${params}`} className="underline">
                    Смотреть все результаты списком
                  </Link>
                </p>
              ) : (
                <section
                  aria-label="Храмы на карте"
                  className="hidden max-h-[480px] gap-3 overflow-y-auto xl:grid"
                >
                  {temples.slice(0, 18).map((t) => (
                    <article
                      key={t.id}
                      className="rounded-[20px] border border-card-border bg-background p-3"
                    >
                      <h2 className="text-sm font-semibold">
                        <Link
                          href={`/temples/${t.slug}/?returnTo=${encodeURIComponent(`/map/?${params}`)}`}
                        >
                          {t.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.address}
                      </p>
                      <a
                        className="mt-2 inline-flex min-h-11 items-center text-sm text-action underline"
                        href={routeToYandexMaps(
                          t.address,
                          t.latitude,
                          t.longitude
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Построить маршрут
                      </a>
                    </article>
                  ))}
                </section>
              )}
              <Link
                className="text-sm text-action underline"
                href={`/temples/?${params}`}
              >
                Все результаты списком
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
