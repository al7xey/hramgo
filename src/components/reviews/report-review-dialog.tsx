import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReportReviewDialog({ reviewId }: { reviewId: string }) {
  return (
    <Button asChild variant="ghost" size="sm">
      <a href={`/api/reviews/${reviewId}/report`} aria-label="Пожаловаться на отзыв">
        <Flag className="size-4" aria-hidden />
        Пожаловаться
      </a>
    </Button>
  );
}
