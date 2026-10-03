"use client";
import {useEffect,useState} from 'react';
import {getSupabase,isSupabaseConfigured} from '@/lib/supabase/client';
import {useSession} from '@/lib/auth/client';
export type ReviewPhoto={id:string;reviewId:string;alt:string|null;url:string};
export function useReviewPhotos(ids:string[]){
 const {data:session}=useSession();const [photos,setPhotos]=useState<ReviewPhoto[]>([]),[error,setError]=useState(false),[retry,setRetry]=useState(0);const key=JSON.stringify(ids);
 useEffect(()=>{let active=true;const ids:string[]=JSON.parse(key);setPhotos([]);setError(false);if(!isSupabaseConfigured()||!ids.length)return;
 void (async()=>{const collected:ReviewPhoto[]=[];for(let i=0;i<ids.length;i+=20){if(!active)return;const {data,error}=await getSupabase().functions.invoke('review-media',{body:{reviewIds:ids.slice(i,i+20)}});if(error)throw error;collected.push(...(data.photos??[]));}if(active)setPhotos(collected);})().catch(()=>{if(active)setError(true);});return ()=>{active=false;};},[key,session?.user.id,retry]);
 return {photos,error,reload:()=>setRetry(v=>v+1)};
}
export function ReviewPhotos({items=[]}:{items?:ReviewPhoto[]}){
 const [failed,setFailed]=useState(false);const key=items.map(p=>p.url).join('|');useEffect(()=>setFailed(false),[key]);
 return <>{!failed&&items.length>0&&<div className="mt-3 flex flex-wrap gap-2">{items.map(p=><a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="relative size-24 overflow-hidden rounded-xl"><img src={p.url} alt={p.alt??'Фотография посетителя'} loading="lazy" className="h-full w-full object-cover" onError={()=>setFailed(true)}/></a>)}</div>}{failed&&<p className="mt-2 text-xs text-muted-foreground">Ссылка на фото истекла. Обновите страницу.</p>}</>;
}
