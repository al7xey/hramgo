"use client";
import { useEffect,useMemo,useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadCatalog } from '@/features/temples/client-catalog';
import { searchTemples } from '@/features/temples/search';
import type { TempleView } from '@/features/temples/types';
import { LazyTempleMap } from './lazy-temple-map';
import { TempleSearchBar } from '@/components/temples/temple-search-bar';
import { Button } from '@/components/ui/button';
export function MapBrowser(){
  const params=useSearchParams();const [items,setItems]=useState<TempleView[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);void loadCatalog().then(data=>{if(active){setItems(data);setError(false);}}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
  const query=params.get('query')??'';
  const temples=useMemo(()=>searchTemples(items,{query}).filter(t=>t.latitude!=null&&t.longitude!=null),[items,query]);
  return <div className="grid gap-5"><div><p className="eyebrow">Москва и Новая Москва</p><h1 className="mt-2 text-3xl font-semibold">Храмы на карте</h1><p className="mt-2 text-sm text-muted-foreground">{loading?'Загрузка…':`На карте: ${temples.length}. Объекты без проверенных координат доступны в каталоге.`}</p></div>
    {error?<div role="alert">Не удалось загрузить карту. <Button onClick={()=>setRetry(v=>v+1)}>Повторить</Button></div>:loading?<p role="status">Загрузка храмов…</p>:<LazyTempleMap temples={temples} activeSlug={params.get('temple')??undefined} sidebarTop={<TempleSearchBar action="/map/" defaultValue={query}/>}/>}</div>;
}
