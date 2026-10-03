import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
test('migrations enforce cross-account isolation, publication and audited moderation',async()=>{
 const db=new PGlite({extensions:{pg_trgm}});
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema extensions;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create domain extensions.geography as double precision[];
 create function extensions.st_makepoint(double precision,double precision) returns double precision[] language sql immutable as $$select array[$1,$2]$$;
 create function extensions.st_setsrid(double precision[],integer) returns double precision[] language sql immutable as $$select $1$$;
 create function extensions.st_distance(extensions.geography,extensions.geography) returns double precision language sql immutable as $$select 0::double precision$$;
 create function extensions.st_dwithin(extensions.geography,extensions.geography,integer) returns boolean language sql immutable as $$select true$$;`);
 // PostGIS itself is tested on Supabase. These substitutes allow real PostgreSQL RLS/grants/triggers to run locally.
 for(const name of readdirSync('supabase/migrations').sort()){
 const sql=readFileSync('supabase/migrations/'+name,'utf8').replace(/create extension if not exists (postgis|pgcrypto) with schema extensions;/g,'').replaceAll('extensions.geography(point,4326)','extensions.geography').replace(/create index temples_geo_idx[^;]+;/,'');await db.exec(sql);
 }
 const u1='00000000-0000-4000-8000-000000000001',u2='00000000-0000-4000-8000-000000000002',mod='00000000-0000-4000-8000-000000000003';
 await db.exec(`insert into auth.users(id) values('${u1}'),('${u2}'),('${mod}');insert into public.user_roles values('${mod}','MODERATOR');
 insert into public.temples(id,slug,name,status) values('public','public','Храм','PUBLISHED'),('draft','draft','Черновик','DRAFT');
 insert into public.reviews(id,temple_id,user_id,rating,text,status) values('published','public','${mod}',5,'Опубликованный','APPROVED'),('private','public','${u1}',4,'На проверке','PENDING'),('draft-review','draft','${u1}',4,'Скрытый храм','APPROVED');`);
 const become=async(role:string,uid='')=>{await db.exec(`reset role;select set_config('request.jwt.claim.sub','${uid}',false);set role ${role};`);};
 await become('anon');assert.equal((await db.query('select * from temples')).rows.length,1);assert.equal((await db.query("select * from temple_reviews('public')")).rows.length,1);assert.equal((await db.query("select * from temple_reviews('draft')")).rows.length,0);await assert.rejects(db.query('select * from profiles'));await assert.rejects(db.query('select * from support_payments'));
 await become('authenticated',u1);await db.query("insert into favorites(user_id,temple_id) values($1,'public')",[u1]);assert.equal((await db.query("select * from temple_reviews('public')")).rows.length,2);await assert.rejects(db.query("update user_roles set role='ADMIN'"));await assert.rejects(db.query("insert into reviews(temple_id,user_id,rating,text,status) values('public',$1,5,'Forged','APPROVED')",[u1]));
 await become('authenticated',u2);assert.equal((await db.query('select * from favorites')).rows.length,0);assert.equal((await db.query('select * from reviews')).rows.length,0);assert.equal((await db.query('update profiles set display_name=$1 where id=$2 returning id',['Forged',u1])).rows.length,0);await assert.rejects(db.query("insert into favorites(user_id,temple_id) values($1,'public')",[u1]));await assert.rejects(db.query("select moderate_review('private','APPROVED',null)"));await db.query("select vote_review('published',true)");await db.query("select vote_review('published',true)");assert.equal((await db.query('select * from review_votes')).rows.length,1);await assert.rejects(db.query("select vote_review('private',true)"));
 await become('authenticated',mod);await db.query("select moderate_review('private','APPROVED','Checked source')");assert.equal((await db.query('select * from moderation_logs')).rows.length,1);
 await become('authenticated',u1);await db.query("update reviews set text='Edited content' where id='private'");assert.equal((await db.query<{status:string}>("select status from reviews where id='private'")).rows[0].status,'PENDING');
 await become('anon');assert.equal((await db.query("select * from temple_reviews('public')")).rows.length,1);
 }finally{await db.close();}
});

