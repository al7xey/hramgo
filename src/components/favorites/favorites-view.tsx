"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { useFavorites } from './favorites-provider';
import { loadCatalog } from '@/features/temples/client-catalog';
import type { TempleCardView } from '@/features/temples/types';
import { TempleCard } from '@/components/temples/temple-card';
import { Button } from '@/components/ui/button';
export function FavoritesView(){const {status}=useSession(),favorites=useFavorites();const [items,setItems]=useState<TempleCardView[]>([]),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;void loadCatalog().then(data=>{if(active){setItems(data);setError(false);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[retry]);
  if(status==='loading'||status==='authenticated'&&favorites.loading)return <p role="status">Загрузка избранного…</p>;
  if(status!=='authenticated')return <div className="grid gap-3"><p>Войдите, чтобы увидеть сохранённые храмы.</p><Link href="/login/?callbackUrl=/favorites/" className="text-primary underline">Войти</Link></div>;
  if(favorites.error||error)return <div role="alert"><p>Не удалось загрузить избранное.</p><Button onClick={()=>{favorites.reload();setRetry(v=>v+1);}}>Повторить</Button></div>;
  const selected=items.filter(t=>favorites.ids.has(t.id));return selected.length?<div className="grid gap-4">{selected.map(t=><TempleCard key={t.id} temple={t}/>)}</div>:<p className="text-muted-foreground">Избранное пока пусто. Нажмите сердечко на карточке храма.</p>;
}
