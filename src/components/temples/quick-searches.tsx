"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { moscowDate } from '@/features/temples/schedules';
import { offsetMoscowDate } from '@/features/temples/worship';
export function QuickSearches() {
  const [today,setToday]=useState('');
  useEffect(()=>setToday(moscowDate()),[]);
  const weekday=today?new Date(today+'T12:00:00Z').getUTCDay():6;
  const saturday=today?offsetMoscowDate((6-weekday+7)%7):'';
  const links=[{label:'Сегодня вечером',params:{date:today,timeFrom:'17:00',worship:'evening'}},{label:'Литургия завтра утром',params:{date:today?offsetMoscowDate(1):'',timeTo:'12:00',worship:'liturgy'}},{label:'Исповедь сегодня',params:{date:today,worship:'confession'}},{label:'Всенощная в субботу',params:{date:saturday,worship:'vigil'}}];
  return <div className="flex flex-wrap gap-2">{links.map(l=><Link key={l.label} href={'/temples/?'+new URLSearchParams(Object.fromEntries(Object.entries(l.params).filter(([,v])=>Boolean(v))))} className="inline-flex min-h-11 items-center rounded-xl border border-card-border px-4 text-sm hover:border-primary hover:bg-primary-soft">{l.label}<span aria-hidden className="ml-3 text-primary">↗</span></Link>)}</div>;
}
