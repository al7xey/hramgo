import { ThumbsUp } from "lucide-react";

export function HelpfulnessRating({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <ThumbsUp className="size-4 text-success" aria-hidden />
      {count} отметили отзыв
    </span>
  );
}
