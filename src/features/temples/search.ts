import type { TempleSearchInput, TempleView } from './types';
import { servicesForDate } from './schedules';
const normalize=(value:string)=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const generic=new Set(['храм','храмы','церковь','церкви','собор','метро','мцд','мцк','улица','ул','москва','московский']);
export function distanceKm(lat:number,lon:number,lat2:number,lon2:number) {
  const rad=(n:number)=>n*Math.PI/180;
  const a=Math.sin(rad(lat2-lat)/2)**2+Math.cos(rad(lat))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon)/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function searchTemples(temples:TempleView[], input:TempleSearchInput={}) {
  const terms=normalize(input.query??'').split(' ').filter(t=>t&&!generic.has(t));
  const matching=temples.filter(t=>{
    const haystack=normalize([t.name,t.shortName,t.address,t.district,t.metro,...t.transit.map(s=>`${s.station} ${s.line.name}`)].filter(Boolean).join(' '));
    if(!terms.every(word=>haystack.includes(word)))return false;
    if(input.ids&&!input.ids.includes(t.id))return false;
    if(input.district?.length&&!input.district.includes(t.district??''))return false;
    if(input.metro?.length&&!t.transit.some(s=>input.metro?.includes(s.station)))return false;
    if(input.metroLine?.length&&!t.transit.some(s=>input.metroLine?.includes(s.line.id)))return false;
    if(input.service?.length&&!input.service.every(k=>t.parishServices.some(s=>s.kind===k)))return false;
    if(input.sundaySchool&&t.sundaySchoolStatus!=='YES')return false;
    if(input.hasWebsite&&!t.websiteUrl)return false;
    if(input.hasPhotos&&!t.photos.length)return false;
    if(input.childFriendly&&!t.childFriendly)return false;
    if(input.hasParking&&!t.hasParking)return false;
    const monastery=/монастыр|monastery/i.test(t.objectType??t.name);
    if(input.objectType==='monastery'&&!monastery||input.objectType==='church'&&monastery)return false;
    const entries=servicesForDate(t.scheduleEntries??[]);
    if(input.hasSchedule&&!entries.length)return false;
    for(const [value,kind] of [[input.liturgyTime,'liturgy'],[input.eveningTime,'evening']] as const) {
      if(value&&!entries.some(e=>e.kind===kind&&e.startsAt.slice(0,5)===(value.includes(':')?value.padStart(5,'0'):value.padStart(2,'0')+':00')))return false;
    }
    if(input.latitude!==undefined&&input.longitude!==undefined&&input.radiusKm!==undefined){
      if(t.latitude==null||t.longitude==null||distanceKm(input.latitude,input.longitude,t.latitude,t.longitude)>input.radiusKm)return false;
    }
    return true;
  });
  return matching.sort((a,b)=>{
    if(input.sort==='distance'&&input.latitude!=null&&input.longitude!=null){
      const dist=(t:TempleView)=>t.latitude!=null&&t.longitude!=null?distanceKm(input.latitude!,input.longitude!,t.latitude,t.longitude):Infinity;
      return dist(a)-dist(b)||a.name.localeCompare(b.name,'ru');
    }
    if(input.sort==='impressions')return b.approvedReviewsCount-a.approvedReviewsCount||b.averageHelpfulnessRating-a.averageHelpfulnessRating||a.name.localeCompare(b.name,'ru');
    if(input.sort==='sundaySchool')return Number(b.sundaySchoolStatus==='YES')-Number(a.sundaySchoolStatus==='YES')||a.name.localeCompare(b.name,'ru');
    return a.name.localeCompare(b.name,'ru');
  });
}
