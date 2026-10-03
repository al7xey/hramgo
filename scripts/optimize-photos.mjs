import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { adminClient,upsertBatches } from './lib/supabase.mjs';
const db=JSON.parse(await readFile(process.argv[2]??'tmp/backups/legacy-data.json','utf8'));
const candidates=db.TemplePhoto.filter(p=>p.copyrightStatus==='OPEN_LICENSE'&&p.sourceUrl?.startsWith('https://commons.wikimedia.org/wiki/'));
const titles=candidates.map(p=>decodeURIComponent(p.sourceUrl.split('/wiki/')[1]));
await mkdir('tmp/photos',{recursive:true});let metadata;
try{metadata=JSON.parse(await readFile('tmp/photos/commons-metadata.json','utf8'));}catch{
 const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',prop:'imageinfo',titles:titles.join('|'),iiprop:'url|extmetadata|size',iiurlwidth:'1280'}).toString();
 const response=await fetch(url,{headers:{'user-agent':'HramGo/1.0 (+https://hramgo.ru)'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Commons metadata unavailable');metadata=await response.json();await writeFile('tmp/photos/commons-metadata.json',JSON.stringify(metadata));
}
const info=new Map(Object.values(metadata.query?.pages??{}).map(p=>[p.title,p.imageinfo?.[0]]));
const report=[],rows=[];let client;
if(process.argv.includes('--upload'))client=adminClient();
for(const photo of candidates){
 const title=decodeURIComponent(photo.sourceUrl.split('/wiki/')[1]).replaceAll('_',' '),meta=info.get(title);
 const license=meta?.extmetadata?.LicenseShortName?.value??'';
 if(!meta||!/^CC (BY|BY-SA)|^CC0$|^Public domain$/i.test(license)||meta.width<640){report.push({id:photo.id,status:'SKIPPED',reason:'Unsupported license or small image'});continue;}
 // A bell/monument photograph does not depict the temple building.
 if(/campana|tsar.bell|tsar.cannon|царь.колокол|bell alone/i.test(title)){report.push({id:photo.id,status:'REVIEW',reason:'Photograph subject needs review'});continue;}
 const author=String(meta.extmetadata?.Artist?.value??'').replace(/<[^>]+>/g,'').trim();
 let buffer;const file='tmp/photos/'+photo.id+'.webp';
 try{buffer=await readFile(file);}catch{
  const url=new URL(meta.thumburl??meta.url);if(url.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname))throw new Error('Unexpected photo host');
  const response=await fetch(url,{headers:{'user-agent':'HramGo/1.0 (+https://hramgo.ru)'},signal:AbortSignal.timeout(30000)});
  if(!response.ok){report.push({id:photo.id,status:'FAILED',httpStatus:response.status});continue;}
  const original=Buffer.from(await response.arrayBuffer());if(original.length>15000000)throw new Error('Photo exceeds import size limit');
  buffer=await sharp(original).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toBuffer();
  if(buffer.length>524288)buffer=await sharp(buffer).webp({quality:62}).toBuffer();
  if(buffer.length>524288){report.push({id:photo.id,status:'SKIPPED',reason:'Optimized file exceeds bucket limit'});continue;}
  await writeFile(file,buffer);
 }
 const dimensions=await sharp(buffer).metadata(),hash=createHash('sha256').update(buffer).digest('hex'),storagePath=photo.templeId+'/'+hash.slice(0,24)+'.webp';
 report.push({id:photo.id,templeId:photo.templeId,status:'OPTIMIZED',license,author,sourceUrl:photo.sourceUrl,bytes:buffer.length,width:dimensions.width,height:dimensions.height,hash,storagePath});
 if(client){const {error}=await client.storage.from('temple-photos').upload(storagePath,buffer,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(error&&error.statusCode!=='409')throw new Error('Storage photo upload failed');const {data}=client.storage.from('temple-photos').getPublicUrl(storagePath);rows.push({id:photo.id,temple_id:photo.templeId,image_url:data.publicUrl,storage_path:storagePath,source_url:photo.sourceUrl,license,author,content_hash:hash,width:dimensions.width,height:dimensions.height,bytes:buffer.length,copyright_status:'OPEN_LICENSE',status:photo.moderationStatus,is_main:photo.isMain,alt:photo.alt});}
}
await writeFile('data/photo-import-report.json',JSON.stringify({checkedAt:new Date().toISOString(),records:report},null,2)+'\n');
if(client)await upsertBatches(client,'temple_photos',rows);
console.log(JSON.stringify({candidates:candidates.length,optimized:report.filter(r=>r.status==='OPTIMIZED').length,bytes:report.reduce((sum,r)=>sum+(r.bytes??0),0),failed:report.filter(r=>r.status==='FAILED').length}));
