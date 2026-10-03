"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AdminDeleteReviewButton({ reviewId, onDeleted }: { reviewId: string; onDeleted?: () => void }) {
  const [pending, setPending] = useState(false);

  async function deleteReview() {
    if (!window.confirm("Удалить отзыв? Он будет скрыт и перестанет влиять на рейтинг.")) return;

    setPending(true);
    const response = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    setPending(false);

    if (!response.ok) {
      window.alert("Не удалось удалить отзыв.");
      return;
    }

    onDeleted?.();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void deleteReview()} disabled={pending}>
      <Trash2 className="size-4" aria-hidden />
      Удалить
    </Button>
  );
}
