"use client";
import { useEffect,useState } from 'react';
import { getSupabase,isSupabaseConfigured } from '@/lib/supabase/client';
import { useSession } from '@/lib/auth/client';
import type { TempleReviewView } from '@/features/temples/types';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import { Button } from '@/components/ui/button';
type Row={id:string;user_id:string;author_name:string;text:string;rating:number;helpful_count:number;visit_type:string;published_at:string;status:string};
export function TempleReviews({templeId}:{templeId:string}) {
  const {data:session}=useSession();
  const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[version,setVersion]=useState(0),[count,setCount]=useState(0),[average,setAverage]=useState(0),[limit,setLimit]=useState(20);
  useEffect(()=>{const refresh=()=>{setVersion(v=>v+1);setLimit(20);};window.addEventListener('hramgo:reviews-updated',refresh);return()=>window.removeEventListener('hramgo:reviews-updated',refresh);},[]);
  useEffect(()=>{
    if(!isSupabaseConfigured()){setLoading(false);return;}
    let active=true;setLoading(true);
    void Promise.all([getSupabase().rpc('temple_reviews',{target:templeId,page_offset:Math.max(0,limit-20)}),getSupabase().rpc('temple_rating',{target:templeId})]).then(([reviews,rating])=>{
      if(!active)return;if(reviews.error||rating.error){setError(true);return;}
      const next=reviews.data as Row[];
      setRows(current=>limit===20?next:[...current,...next]);setError(false);
      setCount(Number(rating.data?.[0]?.review_count??0));setAverage(Number(rating.data?.[0]?.average_rating??0));
    }).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[templeId,session?.user.id,version,limit]);
  function view(row:Row):TempleReviewView {return {id:row.id,userId:row.user_id,authorName:row.author_name,text:row.text,rating:row.rating,helpfulCount:row.helpful_count,visitType:row.visit_type,publishedAt:row.published_at,tags:[]};}
  return <div className="grid gap-4">
    {count>0&&<p className="text-sm text-muted-foreground">Оценка посетителей: {average.toLocaleString('ru')} из 5 · отзывов: {count}. Это мнение посетителей, а не оценка духовной жизни.</p>}
    {loading&&<p role="status">Загрузка отзывов…</p>}
    {error?<div role="alert"><p>Не удалось загрузить отзывы.</p><Button variant="outline" onClick={()=>{setLimit(20);setVersion(v=>v+1);}}>Повторить</Button></div>:!loading&&!rows.length&&<p className="text-sm text-muted-foreground">{isSupabaseConfigured()?'Пока нет опубликованных отзывов.':'Отзывы временно недоступны.'}</p>}
    {rows.map(row=><div key={row.id}>{row.status!=='APPROVED'&&<p className="mb-2 text-xs text-muted-foreground">Ваш отзыв · ожидает проверки</p>}<ReviewCard review={view(row)}/></div>)}
    {!error&&rows.length>=limit&&<Button variant="outline" disabled={loading} onClick={()=>setLimit(v=>v+20)}>Ещё отзывы</Button>}
    <ReviewForm templeId={templeId}/>
  </div>;
}
