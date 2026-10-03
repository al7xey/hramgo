"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { moscowDate } from '@/features/temples/schedules';
import { worshipLabels } from '@/features/temples/worship';
import type { TempleSearchInput } from '@/features/temples/types';
export function TempleSearchBar({defaultValue,defaults={},action='/temples/',autoFocus=false}:{defaultValue?:string;defaults?:TempleSearchInput;action?:string;autoFocus?:boolean}) {
  const router=useRouter();
  const [today,setToday]=useState(''),[locating,setLocating]=useState(false),[error,setError]=useState('');
  useEffect(()=>setToday(moscowDate()),[]);
  function locate() {
    setError('');
    if(!navigator.geolocation){setError('Местоположение недоступно. Введите адрес или станцию.');return;}
    setLocating(true);
    navigator.geolocation.getCurrentPosition(p=>{
      setLocating(false);
      if(p.coords.latitude<55||p.coords.latitude>56.2||p.coords.longitude<36.5||p.coords.longitude>38){setError('Каталог охватывает Москву и Новую Москву. Введите нужный адрес или станцию.');return;}
      const params=new URLSearchParams({latitude:String(p.coords.latitude),longitude:String(p.coords.longitude),radiusKm:'5',sort:'distance'});
      router.push('/temples/?'+params);
    },()=>{setLocating(false);setError('Не удалось определить местоположение. Введите адрес или станцию.');},{timeout:10000,maximumAge:60000});
  }
  const style='h-11 w-full bg-transparent text-sm text-foreground outline-none';
  return <div className="grid gap-2">
    <form action={action} className="search-form">
      <label className="search-field"><span>Место</span><input name="query" defaultValue={defaultValue??defaults.query} autoFocus={autoFocus} placeholder="Москва, район или метро" className={style}/></label>
      <label className="search-field"><span>Дата</span><input aria-label="Дата богослужения" type="date" name="date" min={today||undefined} defaultValue={defaults.date} className={style}/></label>
      <label className="search-field"><span>Время</span><select name="timeFrom" defaultValue={defaults.timeFrom??''} className={style}><option value="">Любое время</option>{['06:00','07:00','08:00','09:00','12:00','16:00','17:00','18:00','19:00'].map(v=><option key={v} value={v}>После {v}</option>)}</select></label>
      <label className="search-field"><span>Богослужение</span><select name="worship" defaultValue={defaults.worship??''} className={style}><option value="">Все службы</option>{Object.entries(worshipLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      {Object.entries(defaults).filter(([k,v])=>!['query','date','timeFrom','worship'].includes(k)&&v!==undefined&&v!==false).flatMap(([k,v])=>(Array.isArray(v)?v:[v]).map((value,i)=><input key={k+i} type="hidden" name={k} value={String(value)}/>))}
      <Button type="submit" size="lg" className="search-submit"><Search className="size-4" aria-hidden/>Найти</Button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Москва и Новая Москва · время Москвы</span><button type="button" onClick={locate} disabled={locating} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary disabled:opacity-50"><LocateFixed className="size-4" aria-hidden/>{locating?'Определяем место…':'Храмы рядом'}</button></div>
    {error&&<p role="status" className="text-sm text-muted-foreground">{error}</p>}
  </div>;
}
