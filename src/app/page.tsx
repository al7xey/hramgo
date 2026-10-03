import type { Metadata } from 'next';
import Link from 'next/link';
import { listTemples } from '@/features/temples/repository';
import { TempleCard } from '@/components/temples/temple-card';
import { TempleSearchBar } from '@/components/temples/temple-search-bar';
import { QuickSearches } from '@/components/temples/quick-searches';
export const metadata:Metadata={title:'Найдите богослужение рядом — храмы Москвы',description:'Поиск храмов Москвы по месту, дате и богослужению. Расписания из проверенных источников, адреса, метро и карта.',alternates:{canonical:'/'}};
export default async function HomePage(){
  const temples=await listTemples();
  const featured=temples.filter(t=>t.photos.length&&t.address).slice(0,4);
  return <div className="grid gap-10 sm:gap-14">
    <section className="grid gap-6 border-b border-card-border pb-8 pt-4 sm:pb-10 sm:pt-8">
      <div><p className="eyebrow">Храмы Москвы и Новой Москвы</p><h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Найдите богослужение рядом</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Выберите место и время. Посмотрите ближайшие службы и спланируйте дорогу до храма.</p></div>
      <TempleSearchBar/>
      <div className="grid gap-3"><h2 className="text-sm font-medium">Быстрый поиск</h2><QuickSearches/></div>
      <p className="max-w-3xl text-xs leading-5 text-muted-foreground">{temples.length} храмов в каталоге. Поиск по времени учитывает только проверенные расписания; они пока доступны для части храмов. Без даты и типа службы можно найти любой храм.</p>
    </section>
    <section className="grid gap-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Откройте храмы Москвы</h2><p className="mt-2 text-sm text-muted-foreground">Адрес, ближайшее метро и официальный сайт — в одном месте.</p></div><Link href="/temples/" className="min-h-11 py-3 text-sm font-semibold text-primary">Все храмы ↗</Link></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{featured.map(t=><TempleCard key={t.id} temple={t} layout="photo"/>)}</div></section>
    <section className="grid gap-4 border-t border-card-border pt-6 sm:grid-cols-2"><Link href="/map/" className="py-3"><h2 className="text-lg font-semibold">Выберите храм на карте ↗</h2><p className="mt-2 text-sm text-muted-foreground">Посмотрите храмы по пути и рядом с нужным адресом.</p></Link><Link href="/temples/" className="py-3"><h2 className="text-lg font-semibold">Удобно добраться на метро ↗</h2><p className="mt-2 text-sm text-muted-foreground">Введите станцию в поиске или выберите ветку в фильтрах.</p></Link></section>
  </div>;
}
