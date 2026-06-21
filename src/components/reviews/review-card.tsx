import { CalendarDays } from "lucide-react";

import { DeleteReviewButton } from "@/components/reviews/delete-review-button";
import { RatingStars } from "@/components/reviews/rating-stars";
import { ReportReviewDialog } from "@/components/reviews/report-review-dialog";
import { Badge } from "@/components/ui/badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleReviewView } from "@/features/temples/types";
import { formatDate } from "@/lib/utils";

export function ReviewCard({ review }: { review: TempleReviewView }) {
  return (
    <LiquidGlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{review.authorName}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(review.publishedAt)}
          </p>
        </div>
        <RatingStars value={review.rating} />
      </div>
      <p className="mt-3 text-sm leading-6">{review.text}</p>
      {review.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag, index) => (
            <Badge key={`${review.id}-${tag}-${index}`} tone="muted">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <DeleteReviewButton reviewId={review.id} userId={review.userId} />
        <ReportReviewDialog reviewId={review.id} />
      </div>
    </LiquidGlassCard>
  );
}
