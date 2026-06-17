"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import type { TempleParishServiceView, TransitLineView, TransitStationOptionView } from "@/features/temples/types";
import { cn } from "@/lib/utils";

type FilterDefaults = {
  query?: string;
  districts: string[];
  metros: string[];
  metroLines: string[];
  services: TempleParishServiceView["kind"][];
  sundaySchool?: string;
  hasSchedule?: string;
  hasWebsite?: string;
  hasPhotos?: string;
  childFriendly?: string;
  hasParking?: string;
};

export function TempleFilters({
  districts,
  metros,
  metroLines,
  serviceKinds,
  defaultValues
}: {
  districts: string[];
  metros: TransitStationOptionView[];
  metroLines: TransitLineView[];
  serviceKinds: TempleParishServiceView["kind"][];
  defaultValues: FilterDefaults;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFiltersCount = useMemo(
    () =>
      [
        defaultValues.districts.length,
        defaultValues.metros.length,
        defaultValues.metroLines.length,
        defaultValues.services.length,
        defaultValues.sundaySchool === "true" ? 1 : 0,
        defaultValues.hasSchedule === "true" ? 1 : 0,
        defaultValues.hasWebsite === "true" ? 1 : 0,
        defaultValues.hasPhotos === "true" ? 1 : 0,
        defaultValues.childFriendly === "true" ? 1 : 0,
        defaultValues.hasParking === "true" ? 1 : 0
      ].reduce((sum, value) => sum + value, 0),
    [defaultValues]
  );

  return (
    <div className="grid gap-3">
      <Button type="button" variant="outline" size="lg" className="justify-between bg-white hover:bg-white dark:bg-white dark:text-[#172033]" onClick={() => setIsOpen((value) => !value)}>
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {activeFiltersCount}
            </span>
          )}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
      </Button>

      {isOpen && (
        <LiquidGlassCard className="bg-white p-4 dark:bg-white dark:text-[#172033]">
          <form action="/temples" className="grid gap-4">
            <input type="hidden" name="query" value={defaultValues.query ?? ""} />

            <FilterGroup title="При храме">
              {serviceKinds.map((kind) => (
                <Check
                  key={kind}
                  name="service"
                  value={kind}
                  label={getParishServiceLabel(kind)}
                  defaultChecked={defaultValues.services.includes(kind)}
                />
              ))}
            </FilterGroup>

            <DetailsGroup title="Метро, МЦК и МЦД" count={metroLines.length}>
              <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                {metroLines.map((line) => (
                  <Check
                    key={line.id}
                    name="metroLine"
                    value={line.id}
                    label={line.name}
                    defaultChecked={defaultValues.metroLines.includes(line.id)}
                    swatch={line.color}
                  />
                ))}
              </div>
            </DetailsGroup>

            <DetailsGroup title="Районы Москвы" count={districts.length}>
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
                {districts.map((district) => (
                  <Check
                    key={district}
                    name="district"
                    value={district}
                    label={district}
                    defaultChecked={defaultValues.districts.includes(district)}
                  />
                ))}
              </div>
            </DetailsGroup>

            <DetailsGroup title="Станции" count={metros.length}>
              <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                {metros.map((metro) => (
                  <Check
                    key={`${metro.name}-${metro.lineId}`}
                    name="metro"
                    value={metro.name}
                    label={metro.name}
                    defaultChecked={defaultValues.metros.includes(metro.name)}
                    swatch={metro.lineColor}
                    title={metro.lineName}
                  />
                ))}
              </div>
            </DetailsGroup>

            <FilterGroup title="Дополнительно">
              <Check name="hasSchedule" value="true" label="Есть расписание" defaultChecked={defaultValues.hasSchedule === "true"} />
              <Check name="hasWebsite" value="true" label="Есть официальный сайт" defaultChecked={defaultValues.hasWebsite === "true"} />
              <Check name="hasPhotos" value="true" label="Есть фото" defaultChecked={defaultValues.hasPhotos === "true"} />
              <Check name="childFriendly" value="true" label="Удобно с детьми" defaultChecked={defaultValues.childFriendly === "true"} />
              <Check name="hasParking" value="true" label="Парковка" defaultChecked={defaultValues.hasParking === "true"} />
            </FilterGroup>

            <div className="grid grid-cols-2 gap-2">
              <Button type="submit">Применить</Button>
              <Button asChild variant="outline">
                <Link href="/temples">Сбросить</Link>
              </Button>
            </div>
          </form>
        </LiquidGlassCard>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function DetailsGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details className="details-panel rounded-[22px] border border-card-border bg-white p-3">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
        <span>{title}</span>
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {count}
          <ChevronDown className="size-4" aria-hidden />
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Check({
  name,
  value,
  label,
  defaultChecked,
  swatch,
  title
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  swatch?: string;
  title?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-10 max-w-full cursor-pointer items-center gap-2 rounded-[18px] border border-card-border bg-white px-3 text-sm transition hover:border-card-border hover:bg-white",
        defaultChecked && "border-foreground/25 bg-white"
      )}
    >
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {swatch && <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: swatch }} title={title} />}
      <span className="truncate">{label}</span>
    </label>
  );
}
