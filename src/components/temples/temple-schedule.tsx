"use client";
import { useEffect,useState } from 'react';
import type { TempleView,ScheduleEntry } from '@/features/temples/types';
import { moscowDate,servicesForDate } from '@/features/temples/schedules';
import { getSupabase,isSupabaseConfigured } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
export function TempleSchedule({temple}:{temple:Pick<TempleView,'id'|'scheduleSummary'|'scheduleEntries'|'scheduleSourceUrl'|'websiteUrl'|'lastVerifiedAt'>}) {
  const [entries,setEntries]=useState(temple.scheduleEntries??[]),[date,setDate]=useState(''),[failed,setFailed]=useState(false);
  useEffect(()=>{
    setDate(moscowDate());if(!isSupabaseConfigured())return;let active=true;
    void getSupabase().from('temple_schedule_entries').select('*').eq('temple_id',temple.id).eq('status','VERIFIED').then(({data,error})=>{
      if(!active)return;if(error){setFailed(true);return;}
      setEntries((data??[]).map(r=>({id:r.id,templeId:r.temple_id,serviceDate:r.service_date,weekdays:r.weekdays,startsAt:r.starts_at,kind:r.kind,title:r.title,comment:r.comment,isSpecial:r.is_special,validFrom:r.valid_from,validUntil:r.valid_until,sourceUrl:r.source_url,verifiedAt:r.verified_at,confidence:r.confidence,status:r.status})) as ScheduleEntry[]);
    });return()=>{active=false;};
  },[temple.id]);
  const today=date?servicesForDate(entries,date):[];
  const source=temple.scheduleSourceUrl??temple.websiteUrl;
  return <div className="grid gap-3"><p className="text-sm font-semibold">Сегодня · время Москвы</p>{today.length?<ul className="divide-y divide-card-border">{today.map(e=><li key={e.id} className="flex gap-4 py-3"><time className="font-semibold">{e.startsAt.slice(0,5)}</time><span className="text-sm">{e.title}{e.comment&&<span className="block text-muted-foreground">{e.comment}</span>}</span></li>)}</ul>:<p className="text-sm text-muted-foreground">Расписание уточняется. Проверьте службы в официальном источнике перед поездкой.</p>}
    {failed&&<p role="status" className="text-sm text-muted-foreground">Не удалось получить последнее обновление расписания.</p>}
    {temple.scheduleSummary&&<details className="rounded-xl border border-card-border p-4"><summary className="cursor-pointer text-sm font-medium">Сведения из справочника{temple.lastVerifiedAt&&' · '+formatDate(temple.lastVerifiedAt)}</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{temple.scheduleSummary}</p><p className="mt-3 text-xs text-muted-foreground">Это справочная запись. Она может быть устаревшей и не используется как подтверждение службы сегодня.</p></details>}
    {source&&<a href={source} target="_blank" rel="noreferrer" className="inline-block py-2 text-sm font-semibold text-primary underline">Проверить актуальное расписание ↗</a>}
  </div>;
}
