"use client";

import { Trash2 } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { getSupabase } from "@/lib/supabase/client";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ reviewId, userId }: { reviewId: string; userId: string }) {
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);

  const role = session?.user?.role;
  const canDelete = session?.user?.id === userId || role === "ADMIN" || role === "MODERATOR";

  if (!canDelete) return null;

  async function deleteReview() {
    if (!window.confirm("Удалить отзыв? Он исчезнет с сайта и перестанет влиять на рейтинг храма.")) return;

    setPending(true);
    try {
      const {error}=await getSupabase().from('reviews').delete().eq('id',reviewId);
      if(error)throw error;
      window.dispatchEvent(new Event('hramgo:reviews-updated'));
    } catch {window.alert('Не удалось удалить отзыв. Попробуйте ещё раз.');}
    finally {setPending(false);}

  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void deleteReview()} disabled={pending} className="gap-2">
      <Trash2 className="size-4" aria-hidden />
      Удалить
    </Button>
  );
}
