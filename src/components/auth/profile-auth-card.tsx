"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LiquidGlassCard } from '@/components/ui/liquid-glass-card';
import {ProfileEmailForm} from './profile-email-form';
export function ProfileAuthCard(){
  const {data:session,status,update,error}=useSession();const [message,setMessage]=useState<string|null>(null),[pending,setPending]=useState(false),[name,setName]=useState('');
  useEffect(()=>setName(session?.user.name??''),[session?.user.name]);
  if(status==='loading')return <p role="status">Загрузка профиля…</p>;
  if(!session)return <LiquidGlassCard className="grid gap-3 p-5"><p>Войдите, чтобы сохранять храмы и оставлять отзывы.</p>{error&&<p role="alert">{error}</p>}<Button asChild><Link href="/login/">Вход и регистрация</Link></Button></LiquidGlassCard>;
  const inputClass='h-12 rounded-xl border border-card-border bg-background px-3 focus:ring-2 focus:ring-primary';
  return <LiquidGlassCard className="grid gap-4 p-5"><p className="break-all text-sm text-muted-foreground">{session.user.email}</p><form className="grid gap-3" onSubmit={async e=>{e.preventDefault();setPending(true);try{const {error}=await getSupabase().from('profiles').update({display_name:name.trim()}).eq('id',session.user.id);if(error)throw error;await update();setMessage('Профиль сохранён.');}catch{setMessage('Не удалось сохранить профиль. Попробуйте ещё раз.');}finally{setPending(false);}}}><label className="grid gap-1 text-sm">Имя<input required minLength={1} maxLength={80} value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label><Button disabled={pending}>{pending?'Сохраняем…':'Сохранить имя'}</Button></form>
    <ProfileEmailForm/>
    <Button variant="outline" disabled={pending} onClick={async()=>{setPending(true);try{const {error}=await getSupabase().auth.resetPasswordForEmail(session.user.email!,{redirectTo:location.origin+'/login/'});if(error)throw error;setMessage('Ссылка для изменения пароля отправлена на вашу почту.');}catch{setMessage('Не удалось отправить письмо. Попробуйте позже.');}finally{setPending(false);}}}>Изменить пароль по ссылке</Button>
    <Button variant="ghost" disabled={pending} onClick={async()=>{setPending(true);try{const {error}=await getSupabase().auth.signOut();if(error)throw error;}catch{setMessage('Не удалось выйти. Попробуйте ещё раз.');}finally{setPending(false);}}}>Выйти</Button>{message&&<p role="status" className="text-sm">{message}</p>}</LiquidGlassCard>;
}
