"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getSupabase, isSupabaseConfigured, safeReturnPath } from "@/lib/supabase/client";
type Mode = "login" | "register" | "reset" | "recovery";
export function LoginForm() {
  const router=useRouter(), params=useSearchParams();
  const [mode,setMode]=useState<Mode>('login'), [pending,setPending]=useState(false), [message,setMessage]=useState<string|null>(null);
  useEffect(()=>{if(!isSupabaseConfigured())return;const {data}=getSupabase().auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setMode('recovery');});return()=>data.subscription.unsubscribe();},[]);
  const inputClass="h-12 rounded-2xl border border-card-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary";
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);setPending(true);setMessage(null);
    try {
      const client=getSupabase(), email=String(form.get('email')??'').trim(), password=String(form.get('password')??'');
      if(mode==='reset') {
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/login/'});if(error)throw error;
        setMessage('Если этот адрес зарегистрирован, на него придёт ссылка для восстановления доступа.');
      } else if(mode==='recovery') {
        const {error}=await client.auth.updateUser({password});if(error)throw error;router.push('/profile/');
      } else if(mode==='register') {
        const {data,error}=await client.auth.signUp({email,password,options:{data:{name:String(form.get('name')??'').trim()},emailRedirectTo:window.location.origin+'/login/'}});if(error)throw error;
        if(data.session)router.push(safeReturnPath(params.get('callbackUrl')));else setMessage('Проверьте почту и подтвердите адрес по ссылке в письме. Затем войдите в профиль.');
      } else {
        const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;router.push(safeReturnPath(params.get('callbackUrl')));
      }
    } catch {setMessage(mode==='login'?'Не удалось войти. Проверьте адрес и пароль или восстановите доступ.':'Не удалось выполнить запрос. Проверьте данные и попробуйте позже.');} finally {setPending(false);}
  }
  return <LiquidGlassCard className="p-5"><form onSubmit={submit} className="grid gap-4">
    {mode!=='recovery'&&<div className="grid grid-cols-2 gap-2">{(['login','register'] as const).map(value=><Button key={value} type="button" variant={mode===value?'primary':'outline'} onClick={()=>{setMode(value);setMessage(null);}}>{value==='login'?'Вход':'Регистрация'}</Button>)}</div>}
    {mode==='register'&&<label className="grid gap-1 text-sm">Имя<input name="name" autoComplete="name" required minLength={2} maxLength={80} className={inputClass}/></label>}
    {mode!=='recovery'&&<label className="grid gap-1 text-sm">Email<input name="email" type="email" autoComplete="email" required className={inputClass}/></label>}
    {mode!=='reset'&&<label className="grid gap-1 text-sm">{mode==='recovery'?'Новый пароль':'Пароль'}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:10} className={inputClass}/>{mode!=='login'&&<span className="text-muted-foreground">Не менее 10 символов</span>}</label>}
    {mode==='register'&&<label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 size-4 shrink-0"/><span>Принимаю <Link href="/legal/terms/" className="underline">условия сервиса</Link> и <Link href="/legal/personal-data-consent/" className="underline">согласие на обработку данных</Link>.</span></label>}
    {message&&<p role="status" className="text-sm leading-6">{message}</p>}
    <Button disabled={pending||!isSupabaseConfigured()} type="submit">{pending?'Подождите…':mode==='login'?'Войти':mode==='register'?'Создать профиль':mode==='reset'?'Получить ссылку':'Сохранить пароль'}</Button>
    {!isSupabaseConfigured()&&<p className="text-sm text-muted-foreground">Вход временно недоступен. Попробуйте позже.</p>}
    {mode==='login'&&<button type="button" className="min-h-11 text-sm text-primary underline" onClick={()=>setMode('reset')}>Забыли пароль?</button>}
  </form></LiquidGlassCard>;
}
