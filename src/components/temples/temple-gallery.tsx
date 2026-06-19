"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { TemplePhoto } from "@/components/temples/temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TemplePhotoView } from "@/features/temples/types";
import { cn } from "@/lib/utils";

const MAX_GALLERY_PHOTOS = 8;

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const visiblePhotos = useMemo(() => photos.slice(0, MAX_GALLERY_PHOTOS), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activePhoto = visiblePhotos[activeIndex] ?? visiblePhotos[0];
  const canSlide = visiblePhotos.length > 1;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < visiblePhotos.length - 1;

  const showPrevious = () => setActiveIndex((index) => Math.max(0, index - 1));
  const showNext = () => setActiveIndex((index) => Math.min(visiblePhotos.length - 1, index + 1));

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div
        className="relative aspect-[4/3] w-full touch-pan-y bg-muted md:aspect-[16/9]"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 45) return;
          if (delta < 0 && canGoNext) showNext();
          if (delta > 0 && canGoPrevious) showPrevious();
        }}
      >
        {activePhoto ? (
          <>
            <TemplePhoto src={activePhoto.imageUrl} alt={activePhoto.alt} priority className="absolute inset-0 rounded-[22px]" />
            {canSlide ? (
              <div className="hidden md:block">
                {canGoPrevious ? (
                  <button
                    type="button"
                    aria-label="Предыдущее фото"
                    onClick={showPrevious}
                    className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                ) : null}
                {canGoNext ? (
                  <button
                    type="button"
                    aria-label="Следующее фото"
                    onClick={showNext}
                    className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{name}</div>
        )}
      </div>

      {canSlide ? (
        <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
          {visiblePhotos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Показать фото ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-[4/3] w-28 shrink-0 snap-start overflow-hidden rounded-[18px] border transition",
                index === activeIndex ? "border-primary ring-2 ring-primary/25" : "border-transparent"
              )}
            >
              <TemplePhoto src={photo.imageUrl} alt={photo.alt} className="absolute inset-0" />
            </button>
          ))}
        </div>
      ) : null}
    </LiquidGlassCard>
  );
}
