"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import * as Dialog from '@radix-ui/react-dialog';

import { TemplePhoto } from "@/components/temples/temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TemplePhotoView } from "@/features/temples/types";
import { cn } from "@/lib/utils";

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const safePhotos = useMemo(() => photos.slice(0, 8), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open,setOpen]=useState(false);
  const photo = safePhotos[activeIndex] ?? safePhotos[0];
  const canGoBack = activeIndex > 0;
  const canGoNext = activeIndex < safePhotos.length - 1;

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-muted">
        {photo ? (
          <button type="button" aria-label="Посмотреть фото целиком" className="absolute inset-0 w-full h-full" onClick={()=>setOpen(true)}><TemplePhoto src={photo.imageUrl} alt={photo.alt} priority className="absolute inset-0 rounded-[22px]" /></button>
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
      {photo?.sourceUrl&&<p className="px-2 pt-3 text-xs leading-5 text-muted-foreground"><a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline">Источник фотографии</a>{photo.author&&` · ${photo.author}`}{photo.license&&` · ${photo.license} · размер и формат изменены`}</p>}
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
              aria-pressed={index===activeIndex}
            >
              <TemplePhoto src={item.imageUrl} alt={item.alt} className="absolute inset-0" />
            </button>
          ))}
        </div>
      ) : null}
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/80"/><Dialog.Content className="fixed inset-4 z-[1001] grid place-items-center rounded-2xl bg-background p-4" onKeyDown={event=>{if(event.key==='ArrowRight')setActiveIndex(v=>Math.min(safePhotos.length-1,v+1));if(event.key==='ArrowLeft')setActiveIndex(v=>Math.max(0,v-1));}}><Dialog.Title className="sr-only">Фотографии: {name}</Dialog.Title><Dialog.Description className="sr-only">Листайте фотографии стрелками на клавиатуре. Escape закрывает просмотр.</Dialog.Description><Dialog.Close className="absolute right-3 top-3 z-10 min-h-11 min-w-11 rounded-full bg-background" aria-label="Закрыть просмотр">×</Dialog.Close>{photo&&<img src={photo.imageUrl} alt={photo.alt} className="max-h-[80vh] max-w-full object-contain"/>}<div className="flex gap-4"><button type="button" disabled={!canGoBack} className="min-h-11 px-3 disabled:opacity-40" onClick={()=>setActiveIndex(v=>v-1)}>← Назад</button><span className="self-center text-sm">{activeIndex+1} / {safePhotos.length}</span><button type="button" disabled={!canGoNext} className="min-h-11 px-3 disabled:opacity-40" onClick={()=>setActiveIndex(v=>v+1)}>Далее →</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    </LiquidGlassCard>
  );
}
