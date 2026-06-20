"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { TemplePhoto } from "@/components/temples/temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TemplePhotoView } from "@/features/temples/types";
import { cn } from "@/lib/utils";

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const safePhotos = useMemo(() => photos.slice(0, 8), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);
  const photo = safePhotos[activeIndex] ?? safePhotos[0];
  const canGoBack = activeIndex > 0;
  const canGoNext = activeIndex < safePhotos.length - 1;

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-muted">
        {photo ? (
          <TemplePhoto src={photo.imageUrl} alt={photo.alt} priority className="absolute inset-0 rounded-[22px]" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{name}</div>
        )}
        {canGoBack ? (
          <button
            type="button"
            onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm md:flex"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : null}
        {canGoNext ? (
          <button
            type="button"
            onClick={() => setActiveIndex((value) => Math.min(safePhotos.length - 1, value + 1))}
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm md:flex"
            aria-label="Следующее фото"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>
      {safePhotos.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {safePhotos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-[14px] border bg-muted",
                index === activeIndex ? "border-primary" : "border-card-border"
              )}
              aria-label={`Открыть фото ${index + 1}`}
            >
              <TemplePhoto src={item.imageUrl} alt={item.alt} className="absolute inset-0" />
            </button>
          ))}
        </div>
      ) : null}
    </LiquidGlassCard>
  );
}
