"use client";

import { ThumbsUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function HelpfulButton({ reviewId, initialCount }: { reviewId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pressed, setPressed] = useState(false);

  return (
    <Button
      type="button"
      variant={pressed ? "primary" : "outline"}
      size="sm"
      aria-pressed={pressed}
      onClick={() => {
        setPressed((value) => !value);
        setCount((value) => value + (pressed ? -1 : 1));
        fetch(`/api/reviews/${reviewId}/helpful`, { method: pressed ? "DELETE" : "POST" }).catch(() => undefined);
      }}
    >
      <ThumbsUp className="size-4" aria-hidden />
      {count}
    </Button>
  );
}
