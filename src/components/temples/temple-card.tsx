"use client";
import Link from "next/link";
import { MapPinned } from "lucide-react";

import { TemplePhoto } from "@/components/temples/temple-photo";
import { TransitSummary } from "@/components/temples/transit-chip";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { formatServiceDays, nextService } from "@/features/temples/worship";
import type { TempleCardView, ScheduleEntry } from "@/features/temples/types";

export function TempleCard({
  temple,
  service: selectedService,
  returnTo,
  onOpen,
  selected = false
}: {
  temple: TempleCardView;
  service?: ScheduleEntry;
  returnTo?: string;
  onOpen?: () => void;
  selected?: boolean;
}) {
  const photo = temple.photos[0];
  const next = !selectedService
    ? nextService(temple.scheduleEntries ?? [])
    : undefined;
  const service =
    selectedService ??
    (next ? { ...next.entry, serviceDate: next.date } : undefined);
  const detailsHref = `/temples/${temple.slug}/${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <LiquidGlassCard
      className={`relative overflow-hidden ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <Link
        href={detailsHref}
        onClick={onOpen}
        className="block rounded-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        aria-label={`Открыть храм: ${temple.name}`}
      >
        <div className="grid grid-cols-[minmax(0,34%)_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-[20px] bg-muted">
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

          <div className="flex min-w-0 flex-col">
            <div>
              <h2
                title={temple.name}
                className="break-words text-base font-semibold leading-5"
              >
                {temple.name}
              </h2>
            </div>
            {service && (
              <div className="mt-2 text-xs leading-4 text-primary">
                <p>
                  <strong>{service.startsAt.slice(0, 5)}</strong> ·{" "}
                  {formatServiceDays(service)} · {service.title}
                </p>
                {service.status === "REVIEW" && (
                  <p className="text-muted-foreground">Справочное расписание</p>
                )}
              </div>
            )}

            <div className="mt-2">
              <TransitSummary transit={temple.transit} compact />
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
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
