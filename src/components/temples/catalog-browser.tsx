"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned } from "lucide-react";
import { TempleSearchBar } from "./temple-search-bar";
import { TempleFilters } from "./temple-filters";
import { TempleCard } from "./temple-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { loadCatalog } from "@/features/temples/client-catalog";
import { searchTemples } from "@/features/temples/search";
import { templeSearchSchema } from "@/features/temples/validation";
import { filterableParishServiceKinds } from "@/features/temples/parish-services";
import { metroLines } from "@/features/temples/metro";
import type { TempleView } from "@/features/temples/types";
export function CatalogBrowser() {
  const params = useSearchParams(),
    key = params.toString();
  const [temples, setTemples] = useState<TempleView[]>([]);
  const [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0),
    [limit, setLimit] = useState(18);
  const loader = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadCatalog()
      .then((data) => {
        if (active) {
          setTemples(data);
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
  useEffect(() => setLimit(18), [key]);
  const results = useMemo(
    () => searchTemples(temples, input),
    [temples, input]
  );
  useEffect(() => {
    if (!loader.current || loading || limit >= results.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLimit((value) => value + 18);
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(loader.current);
    return () => observer.disconnect();
  }, [limit, loading, results.length]);
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="grid gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            Поиск храмов Москвы
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ищите по названию, улице, району, метро, МЦД, ветке метро,
            расписанию и приходской деятельности.
          </p>
        </div>
        <TempleSearchBar key={key} defaultValue={input.query} autoFocus />
        <TempleFilters
          key={"filters:" + key}
          districts={[
            ...new Set(
              temples
                .map((t) => t.district)
                .filter((v): v is string => Boolean(v))
            )
          ].sort()}
          metros={[]}
          metroLines={metroLines}
          serviceKinds={filterableParishServiceKinds}
          defaultValues={{
            query: input.query,
            districts: input.district ?? [],
            metros: input.metro ?? [],
            metroLines: input.metroLine ?? [],
            services: input.service ?? [],
            objectType: input.objectType,
            liturgyTime: input.liturgyTime,
            eveningTime: input.eveningTime,
            sundaySchool: String(input.sundaySchool),
            hasSchedule: String(input.hasSchedule),
            hasWebsite: String(input.hasWebsite),
            hasPhotos: String(input.hasPhotos),
            childFriendly: String(input.childFriendly),
            hasParking: String(input.hasParking)
          }}
        />
      </aside>
      <section
        className="grid content-start gap-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2"
        aria-label="Результаты поиска"
      >
        {loading ? (
          <LoadingState label="Загрузка храмов" />
        ) : error ? (
          <>
            <EmptyState
              icon={MapPinned}
              title="Не удалось загрузить храмы"
              description="Попробуйте загрузить каталог ещё раз."
            />
            <Button onClick={() => setRetry((v) => v + 1)}>Повторить</Button>
          </>
        ) : !results.length ? (
          <EmptyState
            icon={MapPinned}
            title="Храмы не найдены"
            description="Попробуйте убрать часть фильтров или изменить запрос."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Найдено: {results.length}
            </p>
            <div className="grid gap-3">
              {results.slice(0, limit).map((temple) => (
                <TempleCard key={temple.id} temple={temple} />
              ))}
            </div>
            {results.length > limit && (
              <div ref={loader} className="pb-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLimit((v) => v + 18)}
                >
                  Показать ещё
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
