import Link from "next/link";
import { memo } from "react";
import { ExternalLink, Navigation, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { TemplePhoto } from "@/components/temples/temple-photo";
import { TransitSummary } from "@/components/temples/transit-chip";
import type { TempleMapView } from "@/features/temples/types";
import { routeToYandexMaps } from "@/lib/utils";

export const TempleMapBottomSheet = memo(function TempleMapBottomSheet({ temple, onClose }: { temple: TempleMapView; onClose?: () => void }) {
  const templeHref = `/temples/${temple.slug}?returnTo=${encodeURIComponent(`/map?temple=${temple.slug}`)}`;
  const displayAddress = formatMapAddress(temple.address);

  return (
    <LiquidGlassCard className="relative p-2.5">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground"
          aria-label="Закрыть карточку"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="grid grid-cols-[72px_1fr] gap-2.5 pr-8">
        <TemplePhoto src={temple.photoUrl} alt={temple.photoAlt ?? temple.name} className="aspect-square rounded-[16px]" />
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-semibold leading-5">{temple.shortName ?? temple.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{displayAddress}</p>
        </div>
      </div>
      <div className="mt-2">
        <TransitSummary transit={temple.transit} limit={1} />
      </div>
      {temple.websiteUrl ? (
        <a
          href={temple.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          Официальный сайт
          <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm">
          <Link href={templeHref}>
            <ExternalLink className="size-4" aria-hidden />
            Перейти к храму
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={routeToYandexMaps(temple.address, temple.latitude, temple.longitude)} target="_blank" rel="noreferrer">
            <Navigation className="size-4" aria-hidden />
            Маршрут
          </a>
        </Button>
      </div>
    </LiquidGlassCard>
  );
});

function formatMapAddress(address?: string | null) {
  return (address ?? "")
    .replace(/^\s*\d{6},?\s*/u, "")
    .replace(/^(г\.?\s*)?Москва,?\s*/iu, "")
    .trim();
}
