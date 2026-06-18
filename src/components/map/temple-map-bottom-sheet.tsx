import Link from "next/link";
import { memo } from "react";
import { ExternalLink, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { TemplePhoto } from "@/components/temples/temple-photo";
import { TransitSummary } from "@/components/temples/transit-chip";
import type { TempleMapView } from "@/features/temples/types";
import { routeToYandexMaps } from "@/lib/utils";

export const TempleMapBottomSheet = memo(function TempleMapBottomSheet({ temple }: { temple: TempleMapView }) {
  const templeHref = `/temples/${temple.slug}?returnTo=${encodeURIComponent(`/map?temple=${temple.slug}`)}`;
  const mainPhoto = temple.photos[0];
  const displayAddress = formatMapAddress(temple.address);

  return (
    <LiquidGlassCard className="p-3">
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <TemplePhoto src={mainPhoto?.imageUrl} alt={mainPhoto?.alt ?? temple.name} className="aspect-square rounded-[18px]" />
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold">{temple.shortName ?? temple.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{displayAddress}</p>
        </div>
      </div>
      <div className="mt-3">
        <TransitSummary transit={temple.transit} limit={2} />
      </div>
      {temple.websiteUrl ? (
        <a
          href={temple.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          Официальный сайт
          <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button asChild>
          <Link href={templeHref}>
            <ExternalLink className="size-4" aria-hidden />
            Перейти к храму
          </Link>
        </Button>
        <Button asChild variant="outline">
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
