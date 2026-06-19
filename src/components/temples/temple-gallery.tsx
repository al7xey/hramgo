"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { TemplePhoto } from "@/components/temples/temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { cn } from "@/lib/utils";
import type { TemplePhotoView } from "@/features/temples/types";

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex] ?? photos[0];
  const canSlide = photos.length > 1;

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + photos.length) % photos.length);
  };

  const showNext = () => {
    setActiveIndex((index) => (index + 1) % photos.length);
  };

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div className="relative aspect-[4/3] w-full bg-muted md:aspect-[16/9]">
        {activePhoto ? (
          <>
            <TemplePhoto src={activePhoto.imageUrl} alt={activePhoto.alt} priority className="absolute inset-0 rounded-[22px]" />
            {canSlide && (
              <>
                <button
                  type="button"
                  aria-label="Предыдущее фото"
                  onClick={showPrevious}
                  className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Следующее фото"
                  onClick={showNext}
                  className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{name}</div>
        )}
      </div>
      {canSlide && (
        <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
          {photos.slice(0, 8).map((photo, index) => (
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
      )}
    </LiquidGlassCard>
  );
}
