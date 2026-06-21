"use client";

import { Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ reviewId, userId }: { reviewId: string; userId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const role = session?.user?.role;
  const canDelete = session?.user?.id === userId || role === "ADMIN" || role === "MODERATOR";

  if (!canDelete) return null;

  async function deleteReview() {
    if (!window.confirm("Удалить отзыв? Он исчезнет с сайта и перестанет влиять на рейтинг храма.")) return;

    setPending(true);
    const response = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    setPending(false);

    if (!response.ok) {
      window.alert("Не удалось удалить отзыв.");
      return;
    }

    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void deleteReview()} disabled={pending} className="gap-2">
      <Trash2 className="size-4" aria-hidden />
      Удалить
    </Button>
  );
}
