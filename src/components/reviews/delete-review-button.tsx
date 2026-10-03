"use client";

import { Trash2 } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { getSupabase } from "@/lib/supabase/client";
import {deleteOwnReview} from '@/lib/supabase/delete-review';
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ reviewId, userId }: { reviewId: string; userId: string }) {
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);

  const role = session?.user?.role;
  const canDelete = session?.user?.id === userId || role === "ADMIN" || role === "MODERATOR";

  if (!canDelete) return null;

  async function deleteReview() {
    const own=session?.user.id===userId;
    if (!window.confirm(own?"Удалить свой отзыв и его фотографии?":"Скрыть отзыв? Решение будет записано в журнал.")) return;

    setPending(true);
    try {
      if(own)await deleteOwnReview(reviewId,userId);
      else{const {error}=await getSupabase().rpc('moderate_review',{target:reviewId,new_status:'HIDDEN',reason_text:'Скрыт модератором со страницы храма'});if(error)throw error;}
      window.dispatchEvent(new Event('hramgo:reviews-updated'));
    } catch {window.alert('Не удалось удалить отзыв. Попробуйте ещё раз.');}
    finally {setPending(false);}

  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void deleteReview()} disabled={pending} className="gap-2">
      <Trash2 className="size-4" aria-hidden />
      {session?.user.id===userId?'Удалить':'Скрыть'}
    </Button>
  );
}
