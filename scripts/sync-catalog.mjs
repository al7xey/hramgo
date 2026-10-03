import { createClient } from '@supabase/supabase-js';
import { writeCatalog } from './lib/catalog.mjs';
import { readAll } from './lib/supabase.mjs';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('A Supabase URL and public key are required for a production catalog build.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
// One nested query per 500 temples. Never use a service key during a Pages build.
const rows=await readAll(client,'temples','*,temple_photos(*),temple_transit(*),temple_services(*),temple_social_links(*),temple_clergy(*),temple_sources(*),temple_schedule_entries(*)',q=>q.eq('status','PUBLISHED'));
const {data:ratings,error:ratingError}=await client.rpc('catalog_ratings');if(ratingError)throw new Error('Published rating summary unavailable');
const ratingById=new Map(ratings.map(r=>[r.temple_id,r]));
const temples=rows.map(r=>({
  ...r.details,id:r.id,slug:r.slug,name:r.name,shortName:r.short_name,objectType:r.object_type,address:r.address,district:r.district,latitude:r.latitude,longitude:r.longitude,websiteUrl:r.website_url,phone:r.phone,email:r.email,moderationStatus:r.status,dataConfidence:r.confidence,sourcePrimaryUrl:r.source_primary_url,lastVerifiedAt:r.last_verified_at,
  photos:r.temple_photos.filter(p=>p.status==='APPROVED').sort((a,b)=>Number(b.is_main)-Number(a.is_main)).map(p=>({id:p.id,imageUrl:p.image_url,sourceUrl:p.source_url,alt:p.alt??r.name,isMain:p.is_main,license:p.license,author:p.author})),
  transit:r.temple_transit.map(s=>({station:s.station,line:{id:s.line_id,name:s.line_name,color:s.line_color,system:s.system},distanceMeters:s.distance_meters,walkMinutes:s.walk_minutes??0,routeVerified:s.route_verified})),
  parishServices:r.temple_services.map(s=>({id:s.id,kind:s.kind,title:s.title,description:s.description,sourceUrl:s.source_url})),
  socialLinks:r.temple_social_links.map(s=>({label:s.label,url:s.url,type:s.type})),clergy:r.temple_clergy.map(s=>({name:s.name,rank:s.rank,role:s.role,details:s.details})),
  sources:r.temple_sources.map(s=>({url:s.url,sourceType:s.source_type,lastVerifiedAt:s.last_verified_at})),
  scheduleEntries:r.temple_schedule_entries.filter(e=>e.status==='VERIFIED').map(e=>({id:e.id,templeId:e.temple_id,serviceDate:e.service_date,weekdays:e.weekdays,startsAt:e.starts_at,kind:e.kind,title:e.title,comment:e.comment,isSpecial:e.is_special,validFrom:e.valid_from,validUntil:e.valid_until,sourceUrl:e.source_url,verifiedAt:e.verified_at,confidence:e.confidence,status:e.status})),
  reviews:[],reviewsCount:Number(ratingById.get(r.id)?.review_count??0),approvedReviewsCount:Number(ratingById.get(r.id)?.review_count??0),averageHelpfulnessRating:Number(ratingById.get(r.id)?.average_rating??0),
}));
// Ratings are loaded live on temple pages, never invented during static generation.
await writeCatalog(temples);console.log(`Synced ${temples.length} published temples through RLS.`);
