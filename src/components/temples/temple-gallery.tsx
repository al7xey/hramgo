"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { TemplePhoto } from "./temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
import type { TemplePhotoView } from "@/features/temples/types";

export function TempleGallery({
  photos,
  name
}: {
  photos: TemplePhotoView[];
  name: string;
}) {
  const safePhotos = useMemo(() => photos.slice(0, 8), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const photo = safePhotos[activeIndex] ?? safePhotos[0];
  function go(index: number) {
    const node = viewport.current;
    if (node)
      node.scrollTo({
        left:
          Math.max(0, Math.min(safePhotos.length - 1, index)) *
          node.clientWidth,
        behavior: "instant"
      });
  }
  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      {safePhotos.length > 1 && (
        <div className="flex items-center justify-between gap-3 px-2 pb-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Фото {activeIndex + 1} из {safePhotos.length}
          </p>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex === 0}
              aria-label="Предыдущее фото"
              onClick={() => go(activeIndex - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={activeIndex >= safePhotos.length - 1}
              aria-label="Следующее фото"
              onClick={() => go(activeIndex + 1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={viewport}
        className="relative flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[22px] bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label={`Фотографии: ${name}`}
        tabIndex={safePhotos.length > 1 ? 0 : undefined}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (node.clientWidth)
            setActiveIndex(
              Math.max(
                0,
                Math.min(
                  safePhotos.length - 1,
                  Math.round(node.scrollLeft / node.clientWidth)
                )
              )
            );
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            go(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
        onPointerDown={(event) => {
          if (
            event.pointerType !== "mouse" ||
            event.button !== 0 ||
            safePhotos.length < 2
          )
            return;
          drag.current = {
            x: event.clientX,
            left: event.currentTarget.scrollLeft
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.style.scrollSnapType = "none";
        }}
        onPointerMove={(event) => {
          if (drag.current)
            event.currentTarget.scrollLeft =
              drag.current.left + drag.current.x - event.clientX;
        }}
        onPointerUp={(event) => {
          if (!drag.current) return;
          drag.current = null;
          event.currentTarget.style.scrollSnapType = "";
          go(
            Math.round(
              event.currentTarget.scrollLeft / event.currentTarget.clientWidth
            )
          );
        }}
        onPointerCancel={(event) => {
          drag.current = null;
          event.currentTarget.style.scrollSnapType = "";
        }}
      >
        {safePhotos.length ? (
          safePhotos.map((item, index) => (
            <div
              key={item.id}
              className="relative aspect-square w-full shrink-0 snap-start"
            >
              <TemplePhoto
                src={item.imageUrl}
                alt={item.alt || name}
                priority={index === 0}
                className="absolute inset-0 rounded-[22px]"
              />
            </div>
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-muted-foreground">
            Фото пока не добавлено
          </div>
        )}
      </div>
      {photo?.sourceUrl && (
        <p className="px-2 pt-3 text-xs leading-5 text-muted-foreground">
          <a
            href={photo.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Источник фотографии
          </a>
          {photo.author && ` · ${photo.author}`}
          {photo.license &&
            photo.license.toUpperCase() !== "UNKNOWN" &&
            ` · ${photo.license}`}
          {photo.imageUrl && (
            <a
              href={photo.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 underline"
            >
              Полное разрешение
            </a>
          )}
        </p>
      )}
      {safePhotos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {safePhotos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(index)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-[14px] border bg-muted ${index === activeIndex ? "border-primary ring-1 ring-primary" : "border-card-border"}`}
              aria-label={`Открыть фото ${index + 1}`}
              aria-pressed={index === activeIndex}
            >
              <TemplePhoto
                src={item.imageUrl}
                alt={item.alt}
                className="absolute inset-0"
              />
            </button>
          ))}
        </div>
      )}
    </LiquidGlassCard>
  );
}
