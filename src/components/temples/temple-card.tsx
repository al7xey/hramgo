import Link from "next/link";
import { MapPinned } from "lucide-react";

import { TemplePhoto } from "@/components/temples/temple-photo";
import { TransitSummary } from "@/components/temples/transit-chip";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleCardView, ScheduleEntry } from "@/features/temples/types";

export function TempleCard({
  temple,
  service
}: {
  temple: TempleCardView;
  service?: ScheduleEntry;
}) {
  const photo = temple.photos[0];
  const detailsHref = `/temples/${temple.slug}/`;

  return (
    <LiquidGlassCard className="relative min-h-[176px] overflow-hidden">
      <Link
        href={detailsHref}
        className="block rounded-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Открыть храм: ${temple.name}`}
      >
        <div className="grid min-h-[174px] grid-cols-[108px_1fr] gap-3 p-3 sm:grid-cols-[148px_1fr]">
          <div className="relative overflow-hidden rounded-[22px] bg-muted">
            {photo ? (
              <TemplePhoto
                src={photo.imageUrl}
                alt={photo.alt}
                className="absolute inset-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <MapPinned className="size-7" aria-hidden />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col py-1">
            <div className="min-h-10">
              <h2 className="break-words text-base font-semibold leading-5">
                {temple.name}
              </h2>
            </div>

            <div className="mt-3 min-h-8">
              <TransitSummary transit={temple.transit} />
            </div>
            {service && (
              <p className="mt-2 text-sm font-medium text-primary">
                {service.startsAt.slice(0, 5)} — {service.title}
                {service.status === "REVIEW" ? " · справочно" : ""}
              </p>
            )}
            <p className="mt-auto pt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
              {formatCardAddress(temple.address)}
            </p>
          </div>
        </div>
      </Link>
    </LiquidGlassCard>
  );
}

function formatCardAddress(address?: string | null) {
  return (address ?? "")
    .replace(/^\s*\d{6},?\s*/u, "")
    .replace(/^(г\.?\s*)?Москва,?\s*/iu, "")
    .trim();
}
