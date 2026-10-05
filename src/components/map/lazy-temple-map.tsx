"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleMapView } from "@/features/temples/types";

const TempleMapDynamic = dynamic(
  () =>
    import("@/components/map/temple-map").then((module) => module.TempleMap),
  {
    ssr: false,
    loading: () => <MapPlaceholder />
  }
);

export function LazyTempleMap({
  temples,
  activeSlug,
  sidebarTop,
  showPreview = true
}: {
  temples: TempleMapView[];
  activeSlug?: string;
  sidebarTop?: ReactNode;
  showPreview?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );
    if (node.current) observer.observe(node.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={node}>
      {visible ? (
        <TempleMapDynamic
          temples={temples}
          activeSlug={activeSlug}
          sidebarTop={sidebarTop}
          showPreview={showPreview}
        />
      ) : (
        <MapPlaceholder sidebarTop={sidebarTop} />
      )}
    </div>
  );
}

function MapPlaceholder({ sidebarTop }: { sidebarTop?: ReactNode }) {
  return (
    <div
      className={`grid gap-4 ${sidebarTop ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""} xl:items-start`}
      role="status"
      aria-label="Загрузка карты"
    >
      {sidebarTop && <div className="xl:hidden">{sidebarTop}</div>}
      <LiquidGlassCard className="overflow-hidden p-2">
        <div className="aspect-square w-full animate-pulse rounded-[24px] bg-muted xl:aspect-auto xl:h-[640px]" />
      </LiquidGlassCard>
      {sidebarTop && <div className="hidden xl:block">{sidebarTop}</div>}
    </div>
  );
}
