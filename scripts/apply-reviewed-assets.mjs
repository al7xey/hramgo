import {readFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {writeCatalog} from './lib/catalog.mjs';
import {adminClient,upsertBatches} from './lib/supabase.mjs';
const temples=JSON.parse(await readFile('data/temples.json','utf8'));
const checked=JSON.parse(await readFile('data/source-verification.json','utf8')).records;
const schedules=JSON.parse(await readFile('data/verified-schedules.json','utf8'));
const imported=[];
for(const entry of schedules){const temple=temples.find(t=>t.sourcePrimaryUrl===entry.sourceUrl),source=checked.find(s=>s.url===entry.sourceUrl);if(!temple||!source?.content_hash)throw new Error('Verified source missing');
 const id='reviewed-'+createHash('sha256').update(JSON.stringify(entry)).digest('hex').slice(0,24),date=source.last_verified_at;
 const row={...entry,id,templeId:temple.id,isSpecial:false,verifiedAt:date,confidence:.95,status:'VERIFIED'};
 temple.scheduleEntries=[...(temple.scheduleEntries??[]).filter(s=>s.id!==id),row];imported.push({...row,sourceHash:source.content_hash});
}
const photoReport=JSON.parse(await readFile('data/photo-import-report.json','utf8')).records;
await mkdir('public/photos',{recursive:true});
for(const temple of temples){temple.photos=temple.photos.filter(p=>!photoReport.some(r=>r.id===p.id&&r.status==='REVIEW'));for(const photo of temple.photos){const optimized=photoReport.find(r=>r.id===photo.id&&r.status==='OPTIMIZED');if(!optimized)continue;const path=optimized.hash.slice(0,24)+'.webp';await copyFile('tmp/photos/'+photo.id+'.webp','public/photos/'+path);Object.assign(photo,{imageUrl:'/photos/'+path,license:optimized.license,author:optimized.author,sourceUrl:optimized.sourceUrl});}}
await writeCatalog(temples);
if(process.argv.includes('--apply'))await upsertBatches(adminClient(),'temple_schedule_entries',imported.map(e=>({id:e.id,temple_id:e.templeId,weekdays:e.weekdays,starts_at:e.startsAt,kind:e.kind,title:e.title,comment:e.comment,is_special:e.isSpecial,source_url:e.sourceUrl,verified_at:e.verifiedAt,confidence:e.confidence,status:e.status})));
console.log(`Reviewed schedules: ${imported.length}; optimized licensed photographs: ${photoReport.filter(r=>r.status==='OPTIMIZED').length}`);
