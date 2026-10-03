import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { createHash,randomBytes } from 'node:crypto';
import { adminClient,upsertBatches } from './lib/supabase.mjs';
import { normalizeLegacy,safeUrl } from './lib/catalog.mjs';
const input=process.argv.find(arg=>arg.endsWith('.json'));
if(!input)throw new Error('Usage: node --env-file=.env.local scripts/migrate-legacy.mjs <private export.json> [--apply]');
const raw=await readFile(input,'utf8'),db=JSON.parse(raw),normalized=normalizeLegacy(db);
const report={sourceHash:createHash('sha256').update(raw).digest('hex'),tables:Object.fromEntries(Object.entries(db).map(([k,v])=>[k,v.length])),published:normalized.filter(t=>t.moderationStatus==='PUBLISHED').length};
await mkdir('tmp/migration',{recursive:true});await writeFile('tmp/migration/plan.json',JSON.stringify(report,null,2));
if(!process.argv.includes('--apply')){console.log(JSON.stringify(report,null,2));process.exit(0);}
const client=adminClient();
const {data:existing,error:probeError}=await client.from('temples').select('id').limit(1);
if(probeError)throw new Error('Target migrations are not installed.');
const {data:jobs,error:jobError}=await client.from('import_jobs').select('id,counters').eq('id','legacy-migration');
if(jobError)throw new Error('Cannot verify migration journal.');
if(existing.length&&!jobs?.length)throw new Error('Refusing to migrate into a nonempty unrelated database.');
if(jobs?.[0]?.counters?.sourceHash&&jobs[0].counters.sourceHash!==report.sourceHash)throw new Error('Resume export checksum differs.');
await upsertBatches(client,'import_jobs',[{id:'legacy-migration',kind:'legacy-migration',status:'RUNNING',counters:report}]);
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const detailKeys=['description','metro','rectorName','vicariate','deanery','historySummary','shrines','scheduleSummary','scheduleSourceUrl','sundaySchoolStatus','sundaySchoolDescription','sundaySchoolSourceUrl','sundaySchoolConfidence'];
// All temples stay hidden until the complete graph has been imported and verified.
const templeRows=normalized.map(t=>({id:t.id,slug:t.slug,name:t.name,short_name:t.shortName,object_type:t.objectType,address:t.address,district:t.district,latitude:t.latitude,longitude:t.longitude,website_url:t.websiteUrl,phone:t.phone,email:t.email,status:'DRAFT',source_primary_url:t.sourcePrimaryUrl,confidence:clamp(t.dataConfidence),last_verified_at:t.lastVerifiedAt,created_at:t.createdAt,updated_at:t.updatedAt,details:Object.fromEntries(detailKeys.map(k=>[k,t[k]??null]))}));
await upsertBatches(client,'temples',templeRows);
const sources=[...new Map(db.TempleSource.map(s=>[s.templeId+'|'+s.url,{id:s.id,temple_id:s.templeId,url:safeUrl(s.url),source_type:s.sourceType,title:s.rawTitle,content_hash:s.extractedJson?.hash??null,last_checked_at:s.crawledAt,last_verified_at:s.crawledAt,confidence:clamp(s.confidence)}])).values()].filter(s=>s.url);
await upsertBatches(client,'temple_sources',sources,'temple_id,url');
await upsertBatches(client,'temple_field_evidence',db.TempleFieldEvidence.filter(e=>safeUrl(e.sourceUrl)).map(e=>({id:e.id,temple_id:e.templeId,field_name:e.fieldName,value:e.value,source_url:safeUrl(e.sourceUrl),quote:e.quote,confidence:clamp(e.confidence),last_checked_at:e.lastCheckedAt})));
const main=new Set();
const photos=db.TemplePhoto.filter(p=>safeUrl(p.imageUrl)).map(p=>{
  const isMain=p.isMain&&p.moderationStatus==='APPROVED'&&!main.has(p.templeId);if(isMain)main.add(p.templeId);
  return {id:p.id,temple_id:p.templeId,image_url:safeUrl(p.imageUrl),storage_path:null,source_url:safeUrl(p.sourceUrl),copyright_status:p.copyrightStatus,status:p.moderationStatus,is_main:isMain,alt:p.alt,imported_at:p.createdAt};
});
await upsertBatches(client,'temple_photos',photos);
await upsertBatches(client,'temple_transit',db.TempleTransit.map(s=>({id:s.id,temple_id:s.templeId,station:s.station,line_id:s.lineId,line_name:s.lineName,line_color:s.lineColor,system:s.system,distance_meters:s.distanceMeters,walk_minutes:s.walkMinutes,route_verified:false})),'temple_id,station,line_id');
const primarySources=new Map(normalized.map(t=>[t.id,t.sourcePrimaryUrl]));
await upsertBatches(client,'temple_social_links',db.TempleSocialLink.filter(s=>safeUrl(s.url)).map(s=>({id:s.id,temple_id:s.templeId,label:s.label,url:safeUrl(s.url),type:s.type,source_url:primarySources.get(s.templeId)})),'temple_id,url');
await upsertBatches(client,'temple_clergy',db.TempleClergy.map(s=>({id:s.id,temple_id:s.templeId,name:s.name,rank:s.rank,role:s.role,details:s.details,source_url:primarySources.get(s.templeId)})));
await upsertBatches(client,'temple_services',db.TempleParishService.map(s=>({id:s.id,temple_id:s.templeId,kind:s.kind,title:s.title,description:s.description,source_url:safeUrl(s.sourceUrl)})),'temple_id,kind,title');
const {data:userMap,error:mapError}=await client.from('legacy_user_map').select('*');if(mapError)throw new Error('Cannot read user mapping');
const mapping=new Map(userMap.map(r=>[r.legacy_id,r.user_id]));
const {data:authUsers,error:authError}=await client.auth.admin.listUsers({perPage:1000});if(authError)throw new Error('Cannot inventory Auth users');
for(const user of db.User){
  if(mapping.has(user.id))continue;
  if(!user.email)throw new Error(`Legacy user ${user.id} lacks a recoverable email; preserve and resolve before publication.`);
  // Never attach personal legacy data merely because a new account has the same email.
  let migrated=authUsers.users.find(u=>u.app_metadata?.legacy_id===user.id);
  if(!migrated&&authUsers.users.some(u=>u.email?.toLowerCase()===user.email.toLowerCase()))throw new Error('Unmapped Auth email collision; manual identity verification required.');
  if(!migrated){
    const {data,error}=await client.auth.admin.createUser({email:user.email,password:randomBytes(48).toString('base64url'),email_confirm:Boolean(user.emailVerified),user_metadata:{name:user.name??'Посетитель'},app_metadata:{legacy_id:user.id,requires_password_recovery:true}});
    if(error)throw new Error(`Auth import failed for legacy ID ${user.id}: ${error.code??'unknown'}`);migrated=data.user;
  }
  await upsertBatches(client,'legacy_user_map',[{legacy_id:user.id,user_id:migrated.id}],'legacy_id');mapping.set(user.id,migrated.id);
}
const uid=id=>{const mapped=mapping.get(id);if(!mapped)throw new Error(`Unmapped legacy account ${id}`);return mapped;};
await upsertBatches(client,'profiles',db.User.map(u=>({id:uid(u.id),display_name:u.name||'Посетитель',avatar_url:safeUrl(u.image),theme:(u.themePreference??'LIGHT').toLowerCase(),created_at:u.createdAt})));
await upsertBatches(client,'user_roles',db.User.filter(u=>u.role!=='USER'||u.status!=='ACTIVE').map(u=>({user_id:uid(u.id),role:u.status!=='ACTIVE'?'BLOCKED':u.role})),'user_id');
const reviewKeys=new Set();
for(const r of db.Review){const k=r.userId+'|'+r.templeId;if(reviewKeys.has(k))throw new Error('Duplicate legacy reviews: resolve without losing records before migration');reviewKeys.add(k);}
await upsertBatches(client,'reviews',db.Review.map(r=>({id:r.id,temple_id:r.templeId,user_id:uid(r.userId),rating:r.rating,text:r.text,visit_type:r.visitType,visit_date:r.visitDate?.slice(0,10),status:r.status,moderation_reason:r.moderationReason,created_at:r.createdAt,updated_at:r.updatedAt,published_at:r.publishedAt})));
await upsertBatches(client,'favorites',db.Favorite.map(f=>({user_id:uid(f.userId),temple_id:f.templeId,created_at:f.createdAt})),'user_id,temple_id');
await upsertBatches(client,'review_votes',db.ReviewHelpfulVote.map(v=>({user_id:uid(v.userId),review_id:v.reviewId,created_at:v.createdAt})),'user_id,review_id');
await upsertBatches(client,'review_reports',db.ReviewReport.map(r=>({id:r.id,user_id:uid(r.userId),review_id:r.reviewId,reason:r.reason,status:r.status,created_at:r.createdAt})));
await upsertBatches(client,'review_replies',db.ReviewReply.map(r=>({id:r.id,user_id:uid(r.userId),review_id:r.reviewId,text:r.text,status:r.status,created_at:r.createdAt})));
await upsertBatches(client,'representatives',db.TempleRepresentative.map(r=>({id:r.id,user_id:uid(r.userId),temple_id:r.templeId,status:r.status,verified_by:r.verifiedById?uid(r.verifiedById):null,verified_at:r.verifiedAt,created_at:r.createdAt})));
await upsertBatches(client,'temple_edit_suggestions',db.TempleEditSuggestion.map(r=>({id:r.id,user_id:uid(r.userId),temple_id:r.templeId,field_name:r.fieldName,old_value:r.oldValue,new_value:r.newValue??'',source_url:safeUrl(r.sourceUrl),status:r.status,created_at:r.createdAt})));
await upsertBatches(client,'moderation_logs',db.ModerationLog.map(r=>({id:r.id,moderator_id:uid(r.moderatorId),entity_type:r.entityType,entity_id:r.entityId,action:r.action,reason:r.reason,created_at:r.createdAt})));
function stableUuid(value){const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
await upsertBatches(client,'support_payments',db.SupportPayment.map(p=>({id:stableUuid(p.id),legacy_id:p.id,email:p.supporter_email??p.email,amount_kopecks:Math.round(p.amount*100),currency:'RUB',idempotency_key:stableUuid('payment:'+p.id),provider_id:p.provider_payment_id??p.providerInvoiceId,status:p.payment_status??p.status,receipt_status:p.fiscal_receipt_status,created_at:p.createdAt,updated_at:p.updatedAt})));
await upsertBatches(client,'review_tags',db.ReviewTag.map(t=>({id:t.id,name:t.name,slug:t.slug})));
await upsertBatches(client,'review_tag_links',db.ReviewTagOnReview.map(t=>({review_id:t.reviewId,tag_id:t.tagId})),'review_id,tag_id');
// Original user photographs remain private until they have been copied and checked.
await upsertBatches(client,'legacy_review_photos',db.ReviewPhoto.map(p=>({id:p.id,review_id:p.reviewId,image_url:p.imageUrl,storage_key:p.storageKey,alt:p.alt,status:p.status,created_at:p.createdAt})));
await upsertBatches(client,'import_jobs',db.ImportJob.map(j=>({id:j.id,kind:j.type,status:j.status,counters:j.stats??{},started_at:j.startedAt,finished_at:j.finishedAt})));
const expected={temples:db.Temple.length,profiles:db.User.length,reviews:db.Review.length,favorites:db.Favorite.length,support_payments:db.SupportPayment.length,legacy_review_photos:db.ReviewPhoto.length,representatives:db.TempleRepresentative.length,review_tags:db.ReviewTag.length,temple_transit:db.TempleTransit.length,temple_clergy:db.TempleClergy.length,temple_field_evidence:db.TempleFieldEvidence.length};
for(const [table,total] of Object.entries(expected)){
  const {count,error}=await client.from(table).select('*',{count:'exact',head:true});if(error||count!==total)throw new Error(`Count mismatch ${table}: expected ${total}, received ${count}`);
}
// Publish only after foreign-key writes and personal-data counts have passed.
for(const status of ['PUBLISHED','REVIEW','REJECTED']){
  const ids=db.Temple.filter(t=>t.moderationStatus===status).map(t=>t.id);
  for(let i=0;i<ids.length;i+=150){const {error}=await client.from('temples').update({status}).in('id',ids.slice(i,i+150));if(error)throw new Error('Publication failed');}
}
await upsertBatches(client,'import_jobs',[{id:'legacy-migration',kind:'legacy-migration',status:'COMPLETED',counters:{...report,verifiedCounts:expected},finished_at:new Date().toISOString()}]);
console.log('Legacy migration complete. Accounts require secure recovery; no emails were sent.');
