import Link from "next/link";
import { MapPinned } from "lucide-react";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { TemplePhoto } from "@/components/temples/temple-photo";
import { TransitSummary } from "@/components/temples/transit-chip";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function TempleCard({ temple }: { temple: TempleView }) {
  const photo = temple.photos[0];
  const detailsHref = `/temples/${temple.slug}`;

  return (
    <LiquidGlassCard className="relative h-[176px] overflow-hidden">
      <Link
        href={detailsHref}
        className="absolute inset-0 z-10 rounded-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Открыть храм: ${temple.name}`}
      />
      <div className="absolute right-1.5 top-1.5 z-30">
        <FavoriteButton templeId={temple.id} compact />
      </div>

      <div className="pointer-events-none grid h-full grid-cols-[108px_1fr] gap-3 p-3 sm:grid-cols-[148px_1fr]">
        <div className="relative h-full overflow-hidden rounded-[22px] bg-muted">
          {photo ? (
            <TemplePhoto src={photo.imageUrl} alt={photo.alt} className="absolute inset-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <MapPinned className="size-7" aria-hidden />
            </div>
          )}
        </div>

        <div className="grid min-w-0 grid-rows-[auto_auto_1fr] py-1">
          <h2 className="line-clamp-2 min-h-10 pr-12 text-base font-semibold leading-5">{temple.name}</h2>

          <div className="mt-2 min-h-8">
            <TransitSummary transit={temple.transit} />
          </div>
          <p className="self-end line-clamp-2 text-sm leading-5 text-muted-foreground">{formatCardAddress(temple.address)}</p>
        </div>
      </div>
    </LiquidGlassCard>
  );
}

function formatCardAddress(address?: string | null) {
  return (address ?? "")
    .replace(/^\s*\d{6},?\s*/u, "")
    .replace(/^(г\.?\s*)?Москва,?\s*/iu, "")
    .trim();
}
