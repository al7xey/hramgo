import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({ value, label = "Оценка" }: { value: number; label?: string }) {
  const rounded = Math.round(value);

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${label}: ${value} из 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("size-4 text-warning", index < rounded ? "fill-current" : "opacity-25")}
          aria-hidden
        />
      ))}
    </span>
  );
}
