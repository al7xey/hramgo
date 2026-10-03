"use client";
import { useEffect,useState } from 'react';
import type { TempleView } from '@/features/temples/types';
import { moscowDate,servicesForDate } from '@/features/temples/schedules';
import { formatDate } from '@/lib/utils';
import { nextService, serviceDateLabel } from '@/features/temples/worship';
export function TempleSchedule({temple}:{temple:Pick<TempleView,'id'|'scheduleSummary'|'scheduleEntries'|'scheduleSourceUrl'|'websiteUrl'|'lastVerifiedAt'>}) {
  const [date,setDate]=useState('');
  useEffect(()=>{
    setDate(moscowDate());
  },[]);
  const today=date?servicesForDate(temple.scheduleEntries??[],date):[];
  const source=temple.scheduleSourceUrl??temple.websiteUrl;
  const upcoming=date?nextService(temple.scheduleEntries??[]):undefined;
  return <div className="grid gap-3">{upcoming&&<div className="border-l-2 border-primary pl-4"><p className="text-xs text-muted-foreground">Ближайшая служба · {serviceDateLabel(upcoming.date)}</p><p className="mt-1 font-semibold text-primary">{upcoming.entry.startsAt.slice(0,5)} — {upcoming.entry.title}</p></div>}<label className="flex flex-wrap items-center gap-3 text-sm font-medium">Расписание на дату<input type="date" aria-label="Дата расписания" value={date} onChange={e=>setDate(e.target.value)} className="h-11 rounded-xl border border-card-border bg-card px-3"/></label><p className="text-xs text-muted-foreground">Время Москвы</p>{today.length?<ul className="divide-y divide-card-border">{today.map(e=><li key={e.id} className="flex gap-4 py-3"><time className="font-semibold">{e.startsAt.slice(0,5)}</time><span className="text-sm">{e.title}{e.comment&&<span className="block text-muted-foreground">{e.comment}</span>}</span></li>)}</ul>:<p className="text-sm text-muted-foreground">Расписание уточняется. Проверьте службы в официальном источнике перед поездкой.</p>}
    {temple.scheduleSummary&&<details className="rounded-xl border border-card-border p-4"><summary className="cursor-pointer text-sm font-medium">Сведения из справочника{temple.lastVerifiedAt&&' · '+formatDate(temple.lastVerifiedAt)}</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{temple.scheduleSummary}</p><p className="mt-3 text-xs text-muted-foreground">Это справочная запись. Она может быть устаревшей и не используется как подтверждение службы сегодня.</p></details>}
    {source&&<a href={source} target="_blank" rel="noreferrer" className="inline-block py-2 text-sm font-semibold text-primary underline">Проверить актуальное расписание ↗</a>}
  </div>;
}
