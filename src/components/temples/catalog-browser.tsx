"use client";
import { useEffect,useMemo,useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TempleSearchBar } from './temple-search-bar';
import { TempleFilters } from './temple-filters';
import { TempleCard } from './temple-card';
import { Button } from '@/components/ui/button';
import { loadCatalog } from '@/features/temples/client-catalog';
import { searchTemples } from '@/features/temples/search';
import { templeSearchSchema } from '@/features/temples/validation';
import { filterableParishServiceKinds } from '@/features/temples/parish-services';
import { metroLines } from '@/features/temples/metro';
import type { TempleView } from '@/features/temples/types';

export function CatalogBrowser() {
  const params=useSearchParams(),key=params.toString();
  const [temples,setTemples]=useState<TempleView[]>([]),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[limit,setLimit]=useState(18);
  const input=useMemo(()=>templeSearchSchema.parse(Object.fromEntries([...new Set(params.keys())].map(k=>[k,params.getAll(k).length>1?params.getAll(k):params.get(k)??undefined]))),[params]);
  useEffect(()=>{let active=true;setLoading(true);void loadCatalog().then(data=>{if(active){setTemples(data);setError(null);}}).catch(()=>{if(active)setError('Не удалось загрузить каталог.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
  useEffect(()=>setLimit(18),[key]);
  const results=useMemo(()=>searchTemples(temples,input),[temples,input]);
  return <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
    <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto">
      <div><p className="eyebrow">Каталог HramGo</p><h1 className="mt-2 text-3xl font-semibold">Храмы Москвы</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Найдите храм по адресу, станции или названию.</p></div>
      <TempleSearchBar key={key} defaultValue={input.query}/>
      <TempleFilters key={'filters:'+key} districts={[...new Set(temples.map(t=>t.district).filter((v):v is string=>Boolean(v)))].sort()} metros={[]} metroLines={metroLines} serviceKinds={filterableParishServiceKinds} defaultValues={{query:input.query,districts:input.district??[],metros:input.metro??[],metroLines:input.metroLine??[],services:input.service??[],objectType:input.objectType,liturgyTime:input.liturgyTime,eveningTime:input.eveningTime,sundaySchool:String(input.sundaySchool),hasSchedule:String(input.hasSchedule),hasWebsite:String(input.hasWebsite),hasPhotos:String(input.hasPhotos),childFriendly:String(input.childFriendly),hasParking:String(input.hasParking)}}/>
    </aside>
    <section className="grid content-start gap-4" aria-live="polite">
      {loading?<p role="status">Загрузка храмов…</p>:error?<div role="alert"><p>{error}</p><Button onClick={()=>setRetry(v=>v+1)}>Повторить</Button></div>:<>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Найдено: {results.length}</p><a href={'/map/?'+key} className="text-sm font-medium text-primary underline">Посмотреть на карте</a></div>
        {!results.length&&<div className="rounded-2xl border border-card-border p-6"><h2 className="text-lg font-semibold">Храмы не найдены</h2><p className="mt-2 text-sm text-muted-foreground">Измените запрос или уберите часть фильтров. В фильтры служб попадают только проверенные расписания.</p><a href="/temples/" className="mt-4 inline-block text-primary underline">Сбросить фильтры</a></div>}
        <div className="grid gap-4 xl:grid-cols-2">{results.slice(0,limit).map(t=><TempleCard key={t.id} temple={t}/>)}</div>
        {results.length>limit&&<Button variant="outline" onClick={()=>setLimit(v=>v+18)}>Показать ещё</Button>}
      </>}
    </section>
  </div>;
}
