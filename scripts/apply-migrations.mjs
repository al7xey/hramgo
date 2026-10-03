import { readFile,readdir } from 'node:fs/promises';
import pg from 'pg';
const url=process.env.SUPABASE_DATABASE_URL;
if(!url)throw new Error('SUPABASE_DATABASE_URL is required in a private environment.');
const client=new pg.Client({connectionString:url,connectionTimeoutMillis:15000});
await client.connect();
try {
  await client.query('create schema if not exists supabase_migrations');
  await client.query('create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text)');
  const {rows}=await client.query('select version from supabase_migrations.schema_migrations');const applied=new Set(rows.map(r=>r.version));
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
    const version=file.split('_')[0];if(applied.has(version)){console.log(`Already applied ${version}`);continue;}
    const sql=await readFile('supabase/migrations/'+file,'utf8');
    // Migration and journal insertion must commit together.
    await client.query('begin');
    try {
      await client.query(sql.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,''));
      await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[version,file.replace(/^[^_]+_|\.sql$/g,''),[sql]]);
      await client.query('commit');console.log(`Applied ${file}`);
    }catch(error){await client.query('rollback');throw error;}
  }
}finally{await client.end();}
