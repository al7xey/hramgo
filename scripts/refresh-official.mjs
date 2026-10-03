import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchList,fetchDetail,isMoscowAddress,slugify,inferServices } from './official-parser.mjs';
import { cachedGet } from './lib/source-cache.mjs';
import { writeCatalog,safeUrl,normalizeLegacy } from './lib/catalog.mjs';
import { scheduleCandidates } from './lib/parse-schedules.mjs';
import { adminClient,upsertBatches } from './lib/supabase.mjs';
import { refreshChildren } from './lib/refresh-children.mjs';
await mkdir('tmp/source-cache',{recursive:true});
let list;
try{const cached=JSON.parse(await readFile('tmp/source-cache/official-list.json','utf8'));if(Date.now()-new Date(cached.checkedAt).getTime()<86400000)list=cached.items;}catch{/* First run */}
if(!list){list=[...new Map((await fetchList('all')).map(item=>[item.officialId,item])).values()];await writeFile('tmp/source-cache/official-list.json',JSON.stringify({checkedAt:new Date().toISOString(),items:list}));}
const all=JSON.parse(await readFile('data/temples.json','utf8')),bySource=new Map(all.filter(t=>t.sourcePrimaryUrl).map(t=>[t.sourcePrimaryUrl,t]));
const legacyPath=process.argv.find(a=>a.startsWith('--legacy-export='))?.slice('--legacy-export='.length);
const legacy=legacyPath?normalizeLegacy(JSON.parse(await readFile(legacyPath,'utf8'))):[];
const legacyBySource=new Map();
for(const t of legacy.filter(t=>t.sourcePrimaryUrl)){
 const current=legacyBySource.get(t.sourcePrimaryUrl);
 if(!current||current.moderationStatus!=='PUBLISHED'&&t.moderationStatus==='PUBLISHED')legacyBySource.set(t.sourcePrimaryUrl,t);
}
const candidates=list.filter(item=>isMoscowAddress(item.address)&&item.officialId!=='2');
const added=candidates.filter(item=>!bySource.has(item.url));
console.log(JSON.stringify({directoryItems:list.length,moscowItems:candidates.length,current:all.length,newCandidates:added.length},null,2));
if(process.argv.includes('--inventory'))process.exit(0);
const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.split('=')[1]??800);
const queue=(process.argv.includes('--new-only')?added:candidates).slice(0,limit),result=[],errors=[];
let index=0,checked=0;
async function worker(){
  while(index<queue.length){const item=queue[index++];try{
    const detail=await fetchDetail(item),source=await cachedGet(item.url),old=bySource.get(item.url)??legacyBySource.get(item.url);
    if(!isMoscowAddress(detail.address))continue;
    const id=old?.id??'official-'+detail.officialId;
    const slug=old?.slug??`sprav-${detail.officialId}-${slugify(detail.shortName||detail.name)}`;
    const services=inferServices(detail.activitySummary).map(s=>({...s,id:`${id}-${s.kind}`,sourceUrl:detail.url}));
    const fresh={...old,id,slug,name:detail.name,shortName:detail.shortName,address:detail.address,objectType:detail.objectType,websiteUrl:safeUrl(detail.websiteUrl),phone:detail.phone??null,email:detail.email??null,description:detail.historySummary??null,historySummary:detail.historySummary??null,shrines:detail.shrines??null,rectorName:detail.rectorName??null,vicariate:detail.vicariate??null,deanery:detail.deanery??null,socialLinks:detail.socialLinks.filter(s=>safeUrl(s.url)),clergy:detail.clergy,parishServices:services,transit:old?.transit??[],photos:old?.photos??[],scheduleSummary:detail.scheduleSummary??null,scheduleSourceUrl:detail.scheduleSummary?detail.url:detail.websiteUrl??detail.url,sundaySchoolStatus:services.some(s=>s.kind==='sundaySchool')?'YES':'UNKNOWN',sundaySchoolDescription:services.find(s=>s.kind==='sundaySchool')?.description??null,sundaySchoolSourceUrl:services.some(s=>s.kind==='sundaySchool')?detail.url:null,sourcePrimaryUrl:detail.url,dataConfidence:0.9,moderationStatus:'PUBLISHED',lastVerifiedAt:source.checkedAt,
      latitude:old?.latitude??detail.latitude??null,longitude:old?.longitude??detail.longitude??null,
      sources:[{url:detail.url,sourceType:'moseparh_card',lastVerifiedAt:source.checkedAt},...(old?.sources??[]).filter(s=>s.url!==detail.url)],
      scheduleEntries:(old?.scheduleEntries??[]).filter(e=>e.status==='VERIFIED'&&e.sourceUrl!==detail.url),
    };
    const schedules=scheduleCandidates({templeId:id,text:detail.scheduleSummary,sourceUrl:detail.url,verifiedAt:source.checkedAt});
    result.push({temple:fresh,source:{id:'source-'+createHash('sha256').update(id+detail.url).digest('hex').slice(0,24),temple_id:id,url:detail.url,source_type:'moseparh_card',etag:source.etag,last_modified:source.lastModified,content_hash:source.hash,last_checked_at:source.checkedAt,last_verified_at:source.checkedAt,http_status:source.status,confidence:0.9},schedules});
    if(++checked%50===0)console.log(`Verified ${checked}/${queue.length} official records`);
  }catch{errors.push({url:item.url,status:'FAILED',checkedAt:new Date().toISOString()});}}
}
await Promise.all([worker(),worker(),worker()]);
const map=new Map(all.map(t=>[t.id,t]));for(const r of result)map.set(r.temple.id,r.temple);
// Recover original IDs for previously unpublished rows; never create a second row for the same official source.
for(const t of all){const canonical=legacyBySource.get(t.sourcePrimaryUrl);if(canonical&&canonical.id!==t.id)map.delete(t.id);}
await writeCatalog([...map.values()]);
await writeFile('data/source-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),directoryItems:list.length,moscowItems:candidates.length,verified:result.length,added:result.filter(r=>!bySource.has(r.temple.sourcePrimaryUrl)).length,failed:errors,records:result.map(r=>r.source)},null,2)+'\n');
await writeFile('tmp/schedule-candidates.json',JSON.stringify(result.flatMap(r=>r.schedules)));
if(process.argv.includes('--apply')){
  const client=adminClient();
  await upsertBatches(client,'temples',result.map(({temple:t})=>({id:t.id,slug:t.slug,name:t.name,short_name:t.shortName,object_type:t.objectType,address:t.address,website_url:t.websiteUrl,phone:t.phone,email:t.email,latitude:t.latitude,longitude:t.longitude,status:t.moderationStatus,source_primary_url:t.sourcePrimaryUrl,confidence:t.dataConfidence,last_verified_at:t.lastVerifiedAt,details:Object.fromEntries(['description','historySummary','shrines','rectorName','vicariate','deanery','scheduleSummary','scheduleSourceUrl','sundaySchoolStatus','sundaySchoolDescription','sundaySchoolSourceUrl'].map(k=>[k,t[k]??null]))})));
  await upsertBatches(client,'temple_sources',result.map(r=>r.source),'temple_id,url');
  const hashId=(...values)=>createHash('sha256').update(values.join('|')).digest('hex').slice(0,32);
  await refreshChildren(result.map(r=>({id:r.temple.id,url:r.source.url})),[
    {table:'temple_services',conflict:'temple_id,kind,title',rows:result.flatMap(({temple:t})=>t.parishServices.map(s=>({id:hashId(t.id,s.kind,s.title),temple_id:t.id,kind:s.kind,title:s.title,description:s.description,source_url:t.sourcePrimaryUrl})))},
    {table:'temple_clergy',rows:result.flatMap(({temple:t})=>t.clergy.map(s=>({id:hashId(t.id,s.name,s.role),temple_id:t.id,name:s.name,rank:s.rank,role:s.role,details:s.details,source_url:t.sourcePrimaryUrl})))},
    {table:'temple_social_links',conflict:'temple_id,url',rows:result.flatMap(({temple:t})=>t.socialLinks.map(s=>({id:hashId(t.id,s.url),temple_id:t.id,label:s.label,url:s.url,type:s.type,source_url:t.sourcePrimaryUrl})))},
    {table:'temple_schedule_entries',rows:result.flatMap(r=>r.schedules.map(e=>({id:e.id,temple_id:e.templeId,weekdays:e.weekdays,starts_at:e.startsAt,kind:e.kind,title:e.title,comment:e.comment,is_special:e.isSpecial,source_url:e.sourceUrl,verified_at:e.verifiedAt,confidence:e.confidence,status:e.status})))}
  ]);
}
console.log(JSON.stringify({verified:result.length,added:result.filter(r=>!bySource.has(r.temple.sourcePrimaryUrl)).length,failed:errors.length,total:map.size}));
