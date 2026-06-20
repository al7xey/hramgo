import { Star } from "lucide-react";

export function RatingStars({ value, label = "Оценка" }: { value: number; label?: string }) {
  const normalized = Math.max(0, Math.min(5, value));

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${label}: ${value} из 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fillPercent = Math.max(0, Math.min(100, (normalized - index) * 100));

        return (
          <span key={index} className="relative inline-flex size-4 text-muted-foreground/35" aria-hidden>
            <Star className="absolute inset-0 size-4 fill-current" />
            <span className="absolute inset-0 overflow-hidden text-warning" style={{ width: `${fillPercent}%` }}>
              <Star className="size-4 fill-current" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
