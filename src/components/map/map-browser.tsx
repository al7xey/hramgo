"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadCatalog } from "@/features/temples/client-catalog";
import { searchTemples } from "@/features/temples/search";
import type { TempleView } from "@/features/temples/types";
import { LazyTempleMap } from "./lazy-temple-map";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { ActiveFilters } from "@/components/temples/active-filters";
import { ContextLink } from "@/components/layout/context-link";
import { Button } from "@/components/ui/button";
import { templeSearchSchema } from "@/features/temples/validation";
import { routeToYandexMaps } from "@/lib/utils";

export function MapBrowser() {
  const params = useSearchParams(),
    router = useRouter();
  const [items, setItems] = useState<TempleView[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(18);
  const activeSlug = params.get("temple") ?? undefined;
  const queryParams = new URLSearchParams(params.toString());
  queryParams.delete("temple");
  const viewKey = queryParams.toString();
  useEffect(() => {
    setLimit(18);
  }, [viewKey]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCatalog()
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
          [...new Set(params.keys())].map((key) => [
            key,
            params.getAll(key).length > 1
              ? params.getAll(key)
              : (params.get(key) ?? undefined)
          ])
        )
      ),
    [params]
  );
  const results = useMemo(() => searchTemples(items, input), [items, input]);
  const temples = useMemo(
    () =>
      results
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({ ...t, photoUrl: t.photos[0]?.imageUrl })),
    [results]
  );
  const selected = temples.find((t) => t.slug === activeSlug);
  const ordered = selected
    ? [selected, ...temples.filter((t) => t.slug !== activeSlug)]
    : temples;
  function select(slug: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set("temple", slug);
    else next.delete("temple");
    router.replace("/map/" + (next.size ? "?" + next : ""), { scroll: false });
  }
  function templeHref(slug: string) {
    const next = new URLSearchParams(params.toString());
    next.set("temple", slug);
    return `/temples/${slug}/?returnTo=${encodeURIComponent(`/map/?${next}`)}`;
  }
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">Храмы на карте</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loading
            ? "Загрузка храмов…"
            : `${temples.length} на карте${results.length > temples.length ? ` · ${results.length - temples.length} без координат — доступны в списке` : ""}`}
        </p>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Режим результатов"
      >
        <Button asChild variant="outline">
          <ContextLink href="/temples/">Список</ContextLink>
        </Button>
        <Button asChild variant="secondary">
          <ContextLink href="/map/">Карта</ContextLink>
        </Button>
        <span className="text-sm text-muted-foreground">
          {input.latitude != null && input.longitude != null
            ? `До ${input.radiusKm ?? 5} км от точки поиска по прямой`
            : "По всей Москве"}
        </span>
      </div>
      <ActiveFilters
        input={input}
        parameters={params.toString()}
        basePath="/map/"
      />
      {error ? (
        <div role="alert" className="grid gap-3">
          <p>Не удалось загрузить храмы.</p>
          <Button onClick={() => setRetry((value) => value + 1)}>
            Повторить
          </Button>
        </div>
      ) : loading ? (
        <p role="status">Загрузка данных…</p>
      ) : (
        <LazyTempleMap
          temples={temples}
          activeSlug={activeSlug}
          onSelect={select}
          viewKey={viewKey}
          sidebarTop={
            <div className="grid gap-3">
              <TempleSearchBar
                key={viewKey}
                action="/map/"
                defaultValue={input.query}
                parameters={params.toString()}
                compact
              />
              {!temples.length ? (
                <p role="status">
                  На карте нет совпадений. У части храмов уточняются координаты.{" "}
                  <Link
                    href={`/temples/?${params}`}
                    className="text-primary underline"
                  >
                    Смотреть списком
                  </Link>
                </p>
              ) : (
                <section
                  className="hidden max-h-[520px] gap-3 overflow-y-auto xl:grid"
                  aria-label="Храмы на карте"
                >
                  {ordered.slice(0, limit).map((t) => (
                    <article
                      key={t.id}
                      className={`rounded-[20px] border bg-background p-3 ${t.slug === activeSlug ? "border-primary ring-1 ring-primary" : "border-card-border"}`}
                    >
                      <h2>
                        <button
                          type="button"
                          className="min-h-11 w-full text-left text-base font-semibold leading-6"
                          aria-pressed={t.slug === activeSlug}
                          aria-label={`Показать на карте: ${t.name}`}
                          onClick={() => select(t.slug)}
                        >
                          {t.name}
                        </button>
                      </h2>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {t.address}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3">
                        <Link
                          className="inline-flex min-h-11 items-center text-sm text-primary underline"
                          href={templeHref(t.slug)}
                        >
                          О храме
                        </Link>
                        <a
                          className="inline-flex min-h-11 items-center text-sm text-primary underline"
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
                      </div>
                    </article>
                  ))}
                  {ordered.length > limit && (
                    <Button
                      variant="outline"
                      onClick={() => setLimit((value) => value + 18)}
                    >
                      Показать ещё
                    </Button>
                  )}
                </section>
              )}
              <Link
                className="inline-flex min-h-11 items-center text-sm text-primary underline"
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
