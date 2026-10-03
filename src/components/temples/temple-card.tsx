import Link from 'next/link';
import { MapPinned } from 'lucide-react';
import { TemplePhoto } from './temple-photo';
import { TransitSummary } from './transit-chip';
import type { TempleCardView, TempleSearchInput } from '@/features/temples/types';
import { hasWorshipFilter, matchingServices, nextService, serviceDateLabel } from '@/features/temples/worship';
import { moscowDate } from '@/features/temples/schedules';
export function TempleCard({temple,input={},layout='row',selected,onSelect,distance}:{temple:TempleCardView;input?:TempleSearchInput;layout?:'row'|'photo';selected?:boolean;onSelect?:()=>void;distance?:number}) {
  const next=hasWorshipFilter(input)?undefined:nextService(temple.scheduleEntries??[]);
  const entry=next?.entry??matchingServices(temple.scheduleEntries??[],input)[0];
  const photo=temple.photos[0];
  return <article id={'result-'+temple.slug} className={layout==='photo'?'grid content-start gap-3':'grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-card-border py-5 sm:grid-cols-[140px_minmax(0,1fr)] '+(selected?'bg-primary-soft':'')}>
    <Link href={'/temples/'+temple.slug+'/'} aria-label={'Открыть храм: '+temple.name} className={'block overflow-hidden rounded-2xl bg-muted '+(layout==='photo'?'aspect-[4/3]':'h-32 sm:h-36')}>
      {photo?<TemplePhoto src={photo.imageUrl} alt={photo.alt} className="h-full w-full"/>:<span className="grid h-full place-items-center text-muted-foreground"><MapPinned className="size-6" aria-hidden/></span>}
    </Link>
    <div className="grid content-start gap-2"><h2 className="text-base font-semibold leading-6"><Link href={'/temples/'+temple.slug+'/'} className="hover:text-primary">{temple.name}</Link></h2>
      <p className="text-xs leading-5 text-muted-foreground">{(temple.address??'').replace(/^\s*\d{6},?\s*/u,'').replace(/^(г\.?\s*)?Москва,?\s*/iu,'')}{distance!==undefined&&<> · {distance.toLocaleString('ru',{maximumFractionDigits:1})} км по прямой</>}</p>
      {entry?<div className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">{serviceDateLabel(next?.date??input.date??moscowDate())}</p><p className="mt-1 text-sm font-semibold text-primary">{entry.startsAt.slice(0,5)} — {entry.title}</p><a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-muted-foreground underline">Официальное расписание ↗</a></div>:<p className="text-xs text-muted-foreground">Расписание уточняется</p>}
      <TransitSummary transit={temple.transit} limit={1}/>
      {onSelect&&<button type="button" aria-pressed={Boolean(selected)} onClick={onSelect} className="w-fit min-h-11 text-xs font-semibold text-primary">{selected?'Выбран на карте':'Показать на карте'} ↗</button>}
    </div>
  </article>;
}
