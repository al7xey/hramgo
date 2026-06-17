import { MessageCircle } from "lucide-react";

import { RatingStars } from "@/components/reviews/rating-stars";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function ReviewSummary({ temple }: { temple: TempleView }) {
  return (
    <LiquidGlassCard className="grid gap-3 p-4 sm:grid-cols-2">
      <div className="rounded-[24px] bg-muted p-4">
        <p className="text-sm font-medium text-muted-foreground">Средняя оценка</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-2xl font-semibold">{temple.averageHelpfulnessRating.toFixed(1)}</p>
          <RatingStars value={temple.averageHelpfulnessRating} />
        </div>
      </div>
      <div className="rounded-[24px] bg-muted p-4">
        <MessageCircle className="size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-2xl font-semibold">{temple.approvedReviewsCount}</p>
        <p className="text-sm text-muted-foreground">отзывов</p>
      </div>
    </LiquidGlassCard>
  );
}
