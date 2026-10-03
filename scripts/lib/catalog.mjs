import { mkdir,writeFile } from 'node:fs/promises';
export const safeUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const group=(rows,key)=>{const map=new Map();for(const r of rows??[]){if(!map.has(r[key]))map.set(r[key],[]);map.get(r[key]).push(r);}return map;};
export function normalizeLegacy(db) {
  if(!Array.isArray(db.Temple))throw new Error('Temple table is missing');
  const photos=group(db.TemplePhoto,'templeId'),sources=group(db.TempleSource,'templeId'),transit=group(db.TempleTransit,'templeId'),services=group(db.TempleParishService,'templeId'),social=group(db.TempleSocialLink,'templeId'),clergy=group(db.TempleClergy,'templeId'),reviews=group(db.Review,'templeId');
  return db.Temple.map(t=>{
    const rs=(reviews.get(t.id)??[]).filter(r=>r.status==='APPROVED');
    const {location:_,shrinesSummary, ...row}=t;
    const ts=(transit.get(t.id)??[]).map(s=>({station:s.station,line:{id:s.lineId,name:s.lineName,color:s.lineColor,system:s.system},distanceMeters:s.distanceMeters,walkMinutes:s.walkMinutes,routeVerified:false})).sort((a,b)=>a.distanceMeters-b.distanceMeters);
    return {...row,shrines:shrinesSummary,websiteUrl:safeUrl(t.websiteUrl),sourcePrimaryUrl:safeUrl(t.sourcePrimaryUrl),scheduleSourceUrl:safeUrl(t.scheduleSourceUrl),sundaySchoolSourceUrl:safeUrl(t.sundaySchoolSourceUrl),
      transit:ts,photos:(photos.get(t.id)??[]).filter(p=>p.isApproved&&p.moderationStatus==='APPROVED'&&safeUrl(p.imageUrl)).sort((a,b)=>Number(b.isMain)-Number(a.isMain)).slice(0,8).map(p=>({id:p.id,imageUrl:safeUrl(p.imageUrl),alt:p.alt||t.name,isMain:p.isMain,sourceUrl:safeUrl(p.sourceUrl),license:null,author:null})),
      socialLinks:(social.get(t.id)??[]).filter(s=>safeUrl(s.url)).map(s=>({label:s.label,url:safeUrl(s.url),type:s.type})),
      clergy:(clergy.get(t.id)??[]).map(s=>({name:s.name,rank:s.rank,role:s.role,details:s.details})),
      parishServices:(services.get(t.id)??[]).map(s=>({id:s.id,title:s.title,description:s.description,kind:s.kind,sourceUrl:safeUrl(s.sourceUrl)})),
      sources:[...new Map((sources.get(t.id)??[]).filter(s=>safeUrl(s.url)).map(s=>[s.url,{url:safeUrl(s.url),sourceType:s.sourceType,lastVerifiedAt:s.crawledAt}])).values()],
      reviews:[],scheduleEntries:[],reviewsCount:rs.length,approvedReviewsCount:rs.length,averageHelpfulnessRating:rs.length?rs.reduce((sum,r)=>sum+r.rating,0)/rs.length:0};
  });
}
export async function writeCatalog(temples) {
  if(!temples.length)throw new Error('Refusing to publish an empty catalog');
  const ids=new Set(),slugs=new Set();
  for(const t of temples){if(ids.has(t.id)||slugs.has(t.slug)||!t.name||!/^[a-z0-9][a-z0-9-]*$/.test(t.slug))throw new Error(`Invalid/duplicate temple: ${t.slug}`);ids.add(t.id);slugs.add(t.slug);}
  temples.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  await mkdir('data',{recursive:true});await mkdir('public/data',{recursive:true});
  await writeFile('data/temples.json',JSON.stringify(temples)+'\n');
  const compact=temples.map(t=>({id:t.id,slug:t.slug,name:t.name,shortName:t.shortName,address:t.address,district:t.district,metro:t.metro,transit:t.transit.slice(0,3),latitude:t.latitude,longitude:t.longitude,websiteUrl:t.websiteUrl,objectType:t.objectType,sundaySchoolStatus:t.sundaySchoolStatus,parishServices:t.parishServices.map(s=>({kind:s.kind})),scheduleEntries:t.scheduleEntries,photos:t.photos.slice(0,1),reviews:[],socialLinks:[],clergy:[],sources:[],dataConfidence:t.dataConfidence,moderationStatus:t.moderationStatus,averageHelpfulnessRating:t.averageHelpfulnessRating,reviewsCount:t.reviewsCount,approvedReviewsCount:t.approvedReviewsCount,lastVerifiedAt:t.lastVerifiedAt}));
  await writeFile('public/data/catalog.json',JSON.stringify(compact)+'\n');
  const metros=[...new Map(temples.flatMap(t=>t.transit).map(s=>[s.station+':'+s.line.id,{name:s.station,lineId:s.line.id,lineName:s.line.name,lineColor:s.line.color,system:s.line.system}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  await writeFile('public/data/filter-options.json',JSON.stringify({metros})+'\n');
}
