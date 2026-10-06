"use client";

import { Church } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import variants from "@/features/temples/photo-variants.json";

export function TemplePhoto({
  src,
  alt,
  className,
  imageClassName,
  priority = false
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  const preferredSrc = useMemo(
    () => getHigherQualityImageUrl(src, priority),
    [src, priority]
  );
  const [currentSrc, setCurrentSrc] = useState(preferredSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(preferredSrc);
    setFailed(false);
  }, [preferredSrc]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {currentSrc && !failed ? (
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => {
            if (src && currentSrc !== src) {
              setCurrentSrc(src);
              return;
            }

            setFailed(true);
          }}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,var(--primary-soft),var(--muted))] p-5 text-center text-muted-foreground"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm">
            <Church className="size-6" aria-hidden />
          </span>
          <span className="text-sm font-medium text-foreground">
            {failed ? "Фото не загрузилось" : "Фото пока не добавлено"}
          </span>
        </div>
      )}
    </div>
  );
}

function getHigherQualityImageUrl(src?: string | null, priority = false) {
  if (!src) {
    return null;
  }

  const own = (variants as Record<string, { url: string }[]>)[src];
  if (own?.length) return own[priority ? own.length - 1 : 0].url;
  if (
    src.startsWith("https://sprav.moseparh.ru/uploads/") &&
    !src.includes("/thumb_")
  )
    return src.replace(/\/([^/]+)$/, "/thumb_$1");
  return src;
}
