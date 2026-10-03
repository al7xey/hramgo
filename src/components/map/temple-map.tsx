"use client";
import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import Link from 'next/link';
import type { TempleMapView } from '@/features/temples/types';
import { Button } from '@/components/ui/button';
import { TemplePhoto } from '@/components/temples/temple-photo';
export function TempleMap({temples,activeSlug,sidebarTop,showPreview=true}:{temples:TempleMapView[];activeSlug?:string;sidebarTop?:ReactNode;showPreview?:boolean}) {
  const node=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),cluster=useRef<L.MarkerClusterGroup|null>(null),markers=useRef(new Map<string,L.Marker>());
  const [selected,setSelected]=useState(activeSlug),[bounds,setBounds]=useState<L.LatLngBounds|null>(null),[area,setArea]=useState<L.LatLngBounds|null>(null),[error,setError]=useState<string|null>(null),[ready,setReady]=useState(false);
  const points=useMemo(()=>temples.filter(t=>Number.isFinite(t.latitude)&&Number.isFinite(t.longitude)&&t.latitude!=null&&t.longitude!=null),[temples]);
  useEffect(()=>{
    if(!node.current)return;
    const instance=L.map(node.current,{scrollWheelZoom:false}).setView([55.7558,37.6173],10);map.current=instance;const markerStore=markers.current;
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(instance);
    tiles.on('tileerror',()=>setError('Не удалось загрузить часть карты. Список храмов остаётся доступен.'));
    cluster.current=L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:48,showCoverageOnHover:false});instance.addLayer(cluster.current);
    const moved=()=>setBounds(instance.getBounds());instance.on('moveend',moved);instance.on('click',()=>setSelected(undefined));
    const resize=new ResizeObserver(()=>instance.invalidateSize());resize.observe(node.current);setReady(true);
    return()=>{resize.disconnect();instance.remove();map.current=null;cluster.current=null;markerStore.clear();};
  },[]);
  useEffect(()=>{
    if(!ready||!cluster.current||!map.current)return;
    cluster.current.clearLayers();markers.current.clear();
    const icon=L.divIcon({className:'temple-pin',html:'<span aria-hidden="true">✝</span>',iconSize:[32,40],iconAnchor:[16,40]});
    for(const t of points){const marker=L.marker([t.latitude!,t.longitude!],{icon,title:t.name,alt:t.name});marker.on('click',()=>setSelected(t.slug));markers.current.set(t.slug,marker);cluster.current.addLayer(marker);}
    if(points.length){map.current.fitBounds(L.latLngBounds(points.map(t=>[t.latitude!,t.longitude!] as [number,number])),{padding:[24,24],maxZoom:15});setBounds(map.current.getBounds());}
    setArea(null);
  },[points,ready]);
  useEffect(()=>setSelected(activeSlug),[activeSlug]);
  useEffect(()=>{if(!ready||!selected)return;const marker=markers.current.get(selected);if(marker)cluster.current?.zoomToShowLayer(marker,()=>map.current?.panTo(marker.getLatLng()));},[selected,ready]);
  const visible=area?points.filter(t=>area.contains([t.latitude!,t.longitude!])):points;
  const active=points.find(t=>t.slug===selected);
  function locate(){if(!navigator.geolocation){setError('Геолокация недоступна в этом браузере.');return;}navigator.geolocation.getCurrentPosition(position=>{map.current?.setView([position.coords.latitude,position.coords.longitude],14);setArea(map.current?.getBounds()??null);setError(null);},()=>setError('Не удалось определить местоположение. Можно выбрать область карты вручную.'),{timeout:10000,maximumAge:60000});}
  return <div className={showPreview?'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]':'grid gap-4'}>
    <div className="grid content-start gap-3"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={locate}>Рядом со мной</Button><Button variant="outline" disabled={!bounds} onClick={()=>setArea(bounds)}>Искать в этой области</Button>{area&&<Button variant="ghost" onClick={()=>setArea(null)}>Вся Москва</Button>}</div>
      {error&&<p role="status" className="text-sm text-muted-foreground">{error}</p>}
      <div className="relative overflow-hidden rounded-2xl border border-card-border"><div ref={node} className="h-[430px] w-full bg-muted sm:h-[580px]" role="region" aria-label="Карта храмов Москвы"/>
        {showPreview&&active&&<div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl border border-card-border bg-background p-4 shadow-lg"><button type="button" aria-label="Закрыть карточку храма" className="float-right min-h-11 min-w-11" onClick={()=>setSelected(undefined)}>×</button><h2 className="pr-10 font-semibold">{active.name}</h2><p className="mt-1 text-sm text-muted-foreground">{active.address}</p><Link href={'/temples/'+active.slug+'/'} className="mt-3 inline-block text-sm font-semibold text-primary underline">Открыть храм</Link></div>}
      </div>
    </div>
    <aside className="grid content-start gap-4">{sidebarTop}{showPreview&&<><p className="text-sm text-muted-foreground">В выбранной области: {visible.length}</p><div className="grid max-h-[560px] gap-2 overflow-auto">{visible.slice(0,40).map(t=><button key={t.id} type="button" aria-pressed={selected===t.slug} onClick={()=>setSelected(t.slug)} className="flex gap-3 rounded-xl border border-card-border bg-card p-3 text-left focus-visible:ring-2 focus-visible:ring-primary"><TemplePhoto src={t.photoUrl} alt={t.name} className="size-16 shrink-0 rounded-lg"/><span className="min-w-0"><span className="line-clamp-2 text-sm font-semibold">{t.name}</span><span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.address}</span></span></button>)}</div>{visible.length>40&&<p className="text-xs text-muted-foreground">Первые 40 объектов. Приблизьте карту и выберите область для более точного поиска.</p>}</>}</aside>
  </div>;
}
