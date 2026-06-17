import { TrainFront } from "lucide-react";

import { formatTransitShort, getNearestTransitList } from "@/features/temples/transit";
import type { TempleTransitView, TransitLineView } from "@/features/temples/types";

export function TransitChip({ transit }: { transit: TempleTransitView }) {
  return (
    <span className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border border-card-border bg-background/70 px-2.5 text-xs font-medium text-foreground">
      <LineDot line={transit.line} />
      <span className="truncate">{formatTransitShort(transit)}</span>
    </span>
  );
}

export function LineDot({ line }: { line: TransitLineView }) {
  return <span className="inline-flex size-3.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: line.color }} title={line.name} />;
}

export function TransitSummary({ transit, limit = 1 }: { transit: TempleTransitView[]; limit?: number }) {
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
    <span className="flex flex-wrap gap-2">
      {nearest.map((item) => (
        <TransitChip key={`${item.station}-${item.line.id}`} transit={item} />
      ))}
    </span>
  );
}
