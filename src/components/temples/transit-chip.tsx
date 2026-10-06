import { TrainFront } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  formatTransitShort,
  getNearestTransitList
} from "@/features/temples/transit";
import type {
  TempleTransitView,
  TransitLineView
} from "@/features/temples/types";

export function TransitChip({
  transit,
  compact = false
}: {
  transit: TempleTransitView;
  compact?: boolean;
}) {
  const label = formatTransitShort(transit);

  return (
    <span
      title={`${label}${label !== transit.station && !label.includes("на машине") ? " пешком" : ""}${label.includes("≈") ? " (расчётная оценка, без проверки маршрута)" : ""}`}
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-[18px] border border-card-border bg-background/70 px-2.5 py-1.5 text-xs font-medium leading-4 text-foreground",
        compact && "py-1 px-2"
      )}
    >
      <LineDot line={transit.line} />
      <span>
        {transit.station}
        {label !== transit.station ? (
          <>
            {" "}
            ·{" "}
            <span className="whitespace-nowrap">
              {label.slice(transit.station.length + 3)}
            </span>
          </>
        ) : null}
      </span>
    </span>
  );
}

export function LineDot({ line }: { line: TransitLineView }) {
  return (
    <span
      className="inline-flex size-3.5 shrink-0 rounded-full shadow-sm"
      style={{ backgroundColor: line.color }}
      title={line.name}
    >
      <span className="sr-only">{line.name}: </span>
    </span>
  );
}

export function TransitSummary({
  transit,
  limit = 3,
  compact = false
}: {
  transit: TempleTransitView[];
  limit?: number;
  compact?: boolean;
}) {
  const nearest = getNearestTransitList(transit, limit);

  if (nearest.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <TrainFront className="size-4" aria-hidden />
        Метро уточняется
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex flex-wrap gap-2",
        compact && "flex-col items-start gap-1.5"
      )}
    >
      {nearest.map((item) => (
        <TransitChip
          key={`${item.station}-${item.line.id}`}
          transit={item}
          compact={compact}
        />
      ))}
    </span>
  );
}
