"use client";
import { useEffect,useMemo,useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TempleSearchBar } from './temple-search-bar';
import { TempleFilters } from './temple-filters';
import { TempleCard } from './temple-card';
import { LazyTempleMap } from '@/components/map/lazy-temple-map';
import { Button } from '@/components/ui/button';
import { loadCatalog } from '@/features/temples/client-catalog';
import { distanceKm, searchTemples } from '@/features/temples/search';
import { templeSearchSchema } from '@/features/temples/validation';
import { hasWorshipFilter } from '@/features/temples/worship';
import { filterableParishServiceKinds } from '@/features/temples/parish-services';
import { metroLines } from '@/features/temples/metro';
import type { TempleView } from '@/features/temples/types';
export function CatalogBrowser() {
  const params=useSearchParams(),key=params.toString();
  const [temples,setTemples]=useState<TempleView[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[limit,setLimit]=useState(18),[selected,setSelected]=useState<string>(),[view,setView]=useState<'list'|'map'>('list');
  const [area,setArea]=useState<{south:number;west:number;north:number;east:number}|null>(null);
  const input=useMemo(()=>templeSearchSchema.parse(Object.fromEntries([...new Set(params.keys())].map(k=>[k,params.getAll(k).length>1?params.getAll(k):params.get(k)??undefined]))),[params]);
  useEffect(()=>{let active=true;setLoading(true);void loadCatalog().then(data=>{if(active){setTemples(data);setError(false);}}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
  useEffect(()=>{setLimit(18);setSelected(undefined);setArea(null);},[key]);
  const allResults=useMemo(()=>searchTemples(temples,input),[temples,input]);
  const results=useMemo(()=>area?allResults.filter(t=>t.latitude!=null&&t.longitude!=null&&t.latitude>=area.south&&t.latitude<=area.north&&t.longitude>=area.west&&t.longitude<=area.east):allResults,[allResults,area]);
  const points=useMemo(()=>allResults.filter(t=>t.latitude!=null&&t.longitude!=null).map(t=>({...t,photoUrl:t.photos[0]?.imageUrl})),[allResults]);
  function select(slug:string){setSelected(slug);setView('map');}
  function selectFromMap(slug:string){setSelected(slug);const index=results.findIndex(t=>t.slug===slug);if(index>=limit)setLimit(Math.ceil((index+1)/18)*18);setView('list');requestAnimationFrame(()=>document.getElementById('result-'+slug)?.scrollIntoView({block:'nearest',behavior:'smooth'}));}
  return <div className="grid gap-5">
    <div><p className="eyebrow">Поиск HramGo</p><h1 className="mt-2 text-3xl font-semibold">Найдите храм и время службы</h1></div>
    <TempleSearchBar key={key} defaults={input}/>
    <div className="flex flex-wrap items-start justify-between gap-3"><TempleFilters key={'filters:'+key} preserved={input} districts={[...new Set(temples.map(t=>t.district).filter((v):v is string=>Boolean(v)))].sort()} metros={[]} metroLines={metroLines} serviceKinds={filterableParishServiceKinds} defaultValues={{query:input.query,districts:input.district??[],metros:input.metro??[],metroLines:input.metroLine??[],services:input.service??[],objectType:input.objectType,liturgyTime:input.liturgyTime,eveningTime:input.eveningTime,sundaySchool:String(input.sundaySchool),hasSchedule:String(input.hasSchedule),hasWebsite:String(input.hasWebsite),hasPhotos:String(input.hasPhotos),childFriendly:String(input.childFriendly),hasParking:String(input.hasParking)}}/>
      <div className="flex gap-1 lg:hidden" aria-label="Вид результатов"><Button variant={view==='list'?'primary':'outline'} aria-pressed={view==='list'} onClick={()=>setView('list')}>Список</Button><Button variant={view==='map'?'primary':'outline'} aria-pressed={view==='map'} onClick={()=>setView('map')}>Карта</Button></div></div>
    {loading?<p role="status">Загрузка храмов…</p>:error?<div role="alert"><p>Не удалось загрузить каталог.</p><Button onClick={()=>setRetry(v=>v+1)}>Повторить</Button></div>:<>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p aria-live="polite" className="font-semibold">Найдено храмов: {results.length}</p><p className="text-xs text-muted-foreground">{hasWorshipFilter(input)?'Только проверенные расписания · время Москвы':'Поиск по всему каталогу'}</p></div>
      {hasWorshipFilter(input)&&<p className="text-sm leading-6 text-muted-foreground">Проверенные расписания пока есть у части храмов. Отсутствие результата не означает, что в других храмах нет службы.</p>}
      {!allResults.length?<div className="border-y border-card-border py-8"><h2 className="text-xl font-semibold">Подходящие храмы не найдены</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Попробуйте другую дату или снимите ограничение по службе и времени. Можно найти храм и уточнить расписание на его сайте.</p><a href={'/temples/?'+new URLSearchParams(input.query?{query:input.query}:{})} className="mt-4 inline-block min-h-11 py-3 font-semibold text-primary underline">Найти храмы без фильтра расписания</a></div>:
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className={(view==='map'?'hidden lg:block':'block')} aria-label="Список храмов">{area&&<div className="border-b border-card-border py-3 text-sm"><span>В выбранной области: {results.length}</span><button type="button" onClick={()=>setArea(null)} className="ml-3 min-h-11 font-semibold text-primary underline">Вся Москва</button></div>}<div>{results.slice(0,limit).map(t=><TempleCard key={t.id} temple={t} input={input} selected={selected===t.slug} onSelect={t.latitude!=null&&t.longitude!=null?()=>select(t.slug):undefined} distance={input.latitude!=null&&input.longitude!=null&&t.latitude!=null&&t.longitude!=null?distanceKm(input.latitude,input.longitude,t.latitude,t.longitude):undefined}/>)}</div>{results.length>limit&&<Button className="mt-5 w-full" variant="outline" onClick={()=>setLimit(v=>v+18)}>Показать ещё</Button>}</section>
        <section className={(view==='list'?'hidden lg:block ':'block ')+'lg:sticky lg:top-24'} aria-label="Карта результатов">{points.length?<LazyTempleMap temples={points} activeSlug={selected} onSelect={selectFromMap} onAreaChange={setArea} showPreview={false}/>:<p className="rounded-xl border border-card-border p-6 text-sm text-muted-foreground">Для найденных храмов пока нет проверенных координат.</p>}{points.length<results.length&&<p className="mt-2 text-xs text-muted-foreground">На карте {points.length} из {results.length} храмов. Остальные доступны в списке.</p>}</section>
      </div>}
    </>}
  </div>;
}
