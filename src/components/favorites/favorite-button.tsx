"use client";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { useFavorites } from "./favorites-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function FavoriteButton({templeId}:{templeId:string;compact?:boolean}) {
  const {status}=useSession(),router=useRouter(),favorites=useFavorites();
  const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
  const selected=favorites.ids.has(templeId);
  return <div className="relative"><Button type="button" variant="ghost" size="icon" className={cn('size-11 shrink-0 rounded-full bg-background/90 text-danger',selected&&'bg-danger/10')} aria-label={selected?'Убрать из избранного':'Добавить в избранное'} aria-pressed={selected} disabled={pending||status==='loading'||status==='authenticated'&&favorites.loading} onClick={async event=>{
    event.preventDefault();event.stopPropagation();setError(null);
    if(status!=='authenticated'){router.push('/login/?intent=favorites&callbackUrl='+encodeURIComponent(location.pathname+location.search));return;}
    if(favorites.error){favorites.reload();setError('Повторная загрузка избранного…');return;}
    setPending(true);try{await favorites.toggle(templeId);}catch{setError('Не удалось сохранить. Нажмите ещё раз.');}finally{setPending(false);}
  }}><Heart className={cn('size-5',selected&&'fill-current')} aria-hidden/></Button>{error&&<span role="alert" className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-card-border bg-background p-2 text-xs text-foreground">{error}</span>}</div>;
}
