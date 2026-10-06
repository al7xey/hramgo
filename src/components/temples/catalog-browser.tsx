"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned } from "lucide-react";
import { TempleSearchBar } from "./temple-search-bar";
import { WorshipFilters } from "./worship-filters";
import { NearbyButton } from "./nearby-button";
import { ActiveFilters } from "./active-filters";
import { ContextLink } from "@/components/layout/context-link";
import { readListView, saveListView } from "@/features/temples/view-state";
import Link from "next/link";
import { TempleCard } from "./temple-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { loadCatalog } from "@/features/temples/client-catalog";
import { searchTemples } from "@/features/temples/search";
import { matchingServices, hasWorshipFilter } from "@/features/temples/worship";
import { templeSearchSchema } from "@/features/temples/validation";
import { filterableParishServiceKinds } from "@/features/temples/parish-services";
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
  useEffect(
    () => setLimit(readListView(`/temples/?${key}`)?.limit ?? 18),
    [key]
  );
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (loading || restored.current === key) return;
    const state = readListView(`/temples/?${key}`);
    if (state && limit >= state.limit) {
      const frame = requestAnimationFrame(() => {
        window.scrollTo({ top: state.scrollY, behavior: "instant" });
        restored.current = key;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [key, loading, limit]);
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
          <h1 className="page-title">Поиск храмов Москвы</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ищите по названию, адресу, метро, МЦД, ветке метро, расписанию и
            приходской деятельности.
          </p>
        </div>
        <TempleSearchBar
          key={key}
          defaultValue={input.query}
          parameters={key}
        />
        <NearbyButton />
        <div className="flex gap-2" aria-label="Режим результатов">
          <Button asChild variant="secondary">
            <ContextLink href="/temples/">Список</ContextLink>
          </Button>
          <Button asChild variant="outline">
            <ContextLink href="/map/">Карта</ContextLink>
          </Button>
        </div>
        <ActiveFilters input={input} parameters={key} />
        <WorshipFilters
          key={"filters:" + key}
          input={input}
          serviceKinds={filterableParishServiceKinds}
          districts={
            temples.filter((t) => t.district).length >= temples.length * 0.5
              ? [
                  ...new Set(
                    temples
                      .map((t) => t.district)
                      .filter((v): v is string => Boolean(v))
                  )
                ].sort()
              : []
          }
        />
      </aside>
      <section
        className="grid content-start gap-4"
        aria-label="Результаты поиска"
      >
        {(input.scheduleMode === "regular" ||
          input.liturgyTime ||
          input.eveningTime) && (
          <div className="rounded-[22px] border border-card-border bg-primary-soft p-4 text-sm">
            <p className="font-semibold">Обычное расписание богослужений</p>
            <p className="mt-1 text-muted-foreground">
              {input.worship === "evening" || input.eveningTime
                ? "Вечерняя служба"
                : input.worship === "liturgy" || input.liturgyTime
                  ? "Литургия"
                  : "Недельное расписание"}
              {input.timeFrom || input.eveningTime || input.liturgyTime
                ? ` · ${input.timeFrom ?? input.eveningTime ?? input.liturgyTime}`
                : ""}
              . Справочные сведения отмечены в карточках храмов. В праздники
              расписание может меняться.
            </p>
          </div>
        )}
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
          <div className="grid gap-3">
            <EmptyState
              icon={MapPinned}
              title="Храмы не найдены"
              description="Попробуйте снять фильтры или изменить запрос. Отсутствие подтверждённых данных не означает, что богослужений нет."
            />
            <Button asChild variant="outline">
              <Link
                href={`/temples/?${new URLSearchParams(input.query ? { query: input.query } : {})}`}
              >
                Снять фильтры
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/temples/">Все храмы</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Найдено: {results.length}
              {input.latitude != null && input.longitude != null
                ? ` · до ${input.radiusKm ?? 5} км от точки поиска по прямой`
                : " · по всей Москве"}
            </p>
            <div className="grid gap-3">
              {results.slice(0, limit).map((temple) => (
                <TempleCard
                  key={temple.id}
                  temple={temple}
                  returnTo={`/temples/?${key}`}
                  selected={params.get("temple") === temple.slug}
                  onOpen={() => saveListView(`/temples/?${key}`, limit)}
                  service={
                    hasWorshipFilter(input)
                      ? matchingServices(temple.scheduleEntries ?? [], input)[0]
                      : undefined
                  }
                />
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
