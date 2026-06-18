"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleMapView } from "@/features/temples/types";

const TempleMapDynamic = dynamic(() => import("@/components/map/temple-map").then((module) => module.TempleMap), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      <LiquidGlassCard className="overflow-hidden p-2">
        <div className="aspect-square w-full animate-pulse overflow-hidden rounded-[24px] bg-muted lg:aspect-auto lg:h-[640px]" />
      </LiquidGlassCard>
    </div>
  )
});

export function LazyTempleMap({
  temples,
  activeSlug,
  sidebarTop
}: {
  temples: TempleMapView[];
  activeSlug?: string;
  sidebarTop?: ReactNode;
}) {
  return <TempleMapDynamic temples={temples} activeSlug={activeSlug} sidebarTop={sidebarTop} />;
}
