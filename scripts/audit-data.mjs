import {readFile,writeFile} from 'node:fs/promises';
const rows=JSON.parse(await readFile('data/temples.json','utf8'));
const count=condition=>rows.filter(condition).length;
const missing=rows.map(t=>({id:t.id,slug:t.slug,issues:[!t.address&&'address',t.latitude==null&&'coordinates',!t.photos.length&&'photo',!t.scheduleEntries?.some(e=>e.status==='VERIFIED')&&'verified-schedule',!t.websiteUrl&&'website'].filter(Boolean)})).filter(t=>t.issues.length);
const seenSources=new Map(),duplicates=[];
for(const t of rows){if(!t.sourcePrimaryUrl)continue;if(seenSources.has(t.sourcePrimaryUrl))duplicates.push([seenSources.get(t.sourcePrimaryUrl),t.id]);seenSources.set(t.sourcePrimaryUrl,t.id);}
const invalid=rows.filter(t=>!t.name||!t.slug||t.moderationStatus!=='PUBLISHED'||t.latitude!=null&&(Math.abs(t.latitude)>90||Math.abs(t.longitude)>180));
const report={checkedAt:new Date().toISOString(),published:rows.length,withPhotos:count(t=>t.photos.length),withCoordinates:count(t=>t.latitude!=null&&t.longitude!=null),withOfficialSource:count(t=>Boolean(t.sourcePrimaryUrl)),withFreshVerifiedSchedules:count(t=>t.scheduleEntries?.some(e=>e.status==='VERIFIED'&&e.confidence>=.8&&Date.now()-Date.parse(e.verifiedAt)>=0&&Date.now()-Date.parse(e.verifiedAt)<=45*86400000)),duplicateSources:duplicates,invalid:invalid.map(t=>t.id),missing};
await writeFile('data/quality-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,missing:missing.length},null,2));
if(invalid.length||duplicates.length||new Set(rows.map(t=>t.id)).size!==rows.length||new Set(rows.map(t=>t.slug)).size!==rows.length)process.exitCode=1;
