"use client";

import { MapPinned } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TempleCard } from "@/components/temples/temple-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import type { TempleView } from "@/features/temples/types";

type TempleListResponse = {
  items: TempleView[];
  nextCursor: string | null;
  total: number;
};

const PAGE_SIZE = 18;

export function TempleInfiniteList({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [items, setItems] = useState<TempleView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const searchKey = useMemo(() => JSON.stringify(searchParams), [searchParams]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFirstPage() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      appendSearchParams(params, searchParams);

      const response = await fetch(`/api/temples?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить храмы");
      }

      const payload = (await response.json()) as TempleListResponse;

      if (isCancelled) {
        return;
      }

      setItems(payload.items ?? []);
      setNextCursor(payload.nextCursor ?? null);
      setTotal(payload.total ?? 0);
      setIsLoading(false);
      setHasLoadedOnce(true);
    }

    void loadFirstPage().catch((loadError: unknown) => {
      if (isCancelled) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить храмы");
      setIsLoading(false);
      setHasLoadedOnce(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [searchKey, searchParams]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("cursor", nextCursor);
    appendSearchParams(params, searchParams);

    const response = await fetch(`/api/temples?${params.toString()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      setError("Не удалось загрузить следующую страницу");
      setIsLoadingMore(false);
      return;
    }

    const payload = (await response.json()) as TempleListResponse;

    setItems((current) => [...current, ...(payload.items ?? [])]);
    setNextCursor(payload.nextCursor ?? null);
    setTotal(payload.total ?? total);
    setIsLoadingMore(false);
  }, [isLoadingMore, nextCursor, searchParams, total]);

  useEffect(() => {
    if (!loaderRef.current || !nextCursor || isLoading || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [isLoading, isLoadingMore, loadMore, nextCursor, searchKey]);

  if (isLoading) {
    return <LoadingState label="Загрузка храмов" />;
  }

  if (error) {
    return <EmptyState icon={MapPinned} title="Не удалось загрузить храмы" description={error} />;
  }

  if (hasLoadedOnce && items.length === 0) {
    return <EmptyState icon={MapPinned} title="Храмы не найдены" description="Попробуйте убрать часть фильтров или изменить запрос." />;
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Найдено: {total}</p>
      <div className="grid gap-3">
        {items.map((temple) => (
          <TempleCard key={temple.id} temple={temple} />
        ))}
      </div>
      {nextCursor ? (
        <div ref={loaderRef} className="pb-2">
          {isLoadingMore && <LoadingState label="Загрузка еще храмов" />}
        </div>
      ) : null}
    </div>
  );
}

function appendSearchParams(params: URLSearchParams, searchParams: Record<string, string | string[] | undefined>) {
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, value);
  });
}
