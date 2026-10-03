import assert from 'node:assert/strict';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key||!process.env.SUPABASE_DATABASE_URL)throw new Error('Private local environment required');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DATABASE_URL});await db.connect();
try{
 assert.equal(Number((await db.query('select count(*) from auth.users')).rows[0].count),0);
 const tables=(await db.query("select tablename from pg_tables where schemaname='public'")).rows.map(r=>r.tablename);
 for(const removed of ['reviews','profiles','favorites','support_payments','legacy_user_map','review_photos'])assert.ok(!tables.includes(removed));
 const {data:temples,error}=await client.from('temples').select('id,latitude,longitude,status');assert.ifError(error);assert.equal(temples.length,764);assert.ok(temples.every(t=>t.status==='PUBLISHED'));
 const nearby=await client.rpc('nearby_temples',{lat:55.75,lon:37.61,radius_m:2000});assert.ifError(nearby.error);assert.ok(nearby.data.length>0);
 assert.ok((await client.from('temples').update({status:'DRAFT'}).eq('id',temples[0].id)).error);
 assert.ok((await client.from('temple_field_evidence').select('value')).error);
 const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}}).then(r=>r.json());assert.equal(settings.disable_signup,true);assert.equal(settings.external.email,false);
 for(const slug of ['review-media','create-payment','payment-webhook'])assert.equal((await fetch(url+'/functions/v1/'+slug,{method:'POST',body:'{}'})).status,404);
 console.log('Catalog backend verified: 764 published temples, real PostGIS, read-only access, no accounts or obsolete functions.');
}finally{await db.end();}
