"use client";

import { ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { getSupabase } from '@/lib/supabase/client';

import { Button } from "@/components/ui/button";

export function HelpfulButton({ reviewId, initialCount }: { reviewId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pressed, setPressed] = useState(false);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const {data:session}=useSession();const router=useRouter();
  useEffect(()=>{let active=true;setPressed(false);setCount(initialCount);if(session)getSupabase().from('review_votes').select('review_id').eq('review_id',reviewId).eq('user_id',session.user.id).then(({data})=>{if(active)setPressed(Boolean(data?.length));});return ()=>{active=false;};},[session,reviewId,initialCount]);

  return (
    <Button
      type="button"
      variant={pressed ? "primary" : "outline"}
      size="sm"
      aria-pressed={pressed}
      disabled={pending}
      title={error||'Этот отзыв был полезен'}
      onClick={async () => {
        if(!session){router.push('/login/?callbackUrl='+encodeURIComponent(window.location.pathname));return;}
        setPending(true);setError('');
        try{const {error}=await getSupabase().rpc('vote_review',{target:reviewId,helpful:!pressed});if(error)throw error;setPressed(!pressed);setCount(value=>Math.max(0,value+(pressed?-1:1)));}
        catch{setError('Не удалось сохранить голос. Попробуйте ещё раз.');}
        finally{setPending(false);}
      }}
    >
      <ThumbsUp className="size-4" aria-hidden />
      {count}
    </Button>
  );
}
