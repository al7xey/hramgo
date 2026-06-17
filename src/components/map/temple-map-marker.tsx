import { Church } from "lucide-react";

import { cn } from "@/lib/utils";

export function TempleMapMarker({
  x,
  y,
  active,
  label
}: {
  x: number;
  y: number;
  active?: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-primary text-white shadow-glass",
        active && "bg-success"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={label}
    >
      <Church className="size-5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
