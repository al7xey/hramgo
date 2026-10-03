import pg from 'pg';
export async function refreshChildren(sources,collections){
 if(!process.env.SUPABASE_DATABASE_URL)throw new Error('Private database connection is required for atomic source refresh.');
 const db=new pg.Client({connectionString:process.env.SUPABASE_DATABASE_URL,connectionTimeoutMillis:15000});
 await db.connect();
 try{
  await db.query('begin');
  for(const table of ['temple_services','temple_clergy','temple_social_links']){
   await db.query(`delete from public.${table} t using jsonb_to_recordset($1::jsonb) as s(id text,url text) where t.temple_id=s.id and t.source_url=s.url`,[JSON.stringify(sources)]);
  }
  await db.query(`update public.temple_schedule_entries t set status='REVIEW' from jsonb_to_recordset($1::jsonb) as s(id text,url text) where t.temple_id=s.id and t.source_url=s.url`,[JSON.stringify(sources)]);
  for(const {table,rows,conflict='id'} of collections){
   if(!['temple_services','temple_clergy','temple_social_links','temple_schedule_entries'].includes(table))throw new Error('Unsupported source collection');
   const unique=[...new Map(rows.map(r=>[conflict.split(',').map(k=>r[k]).join('|'),r])).values()];
   if(!unique.length)continue;
   const columns=Object.keys(unique[0]);if(columns.some(k=>!/^\w+$/.test(k)))throw new Error('Invalid column');
   const updates=columns.filter(k=>!conflict.split(',').includes(k)).map(k=>`${k}=excluded.${k}`).join(',');
   await db.query(`insert into public.${table}(${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb) on conflict(${conflict}) do update set ${updates}`,[JSON.stringify(unique)]);
   console.log(`${table}: ${unique.length}`);
  }
  await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 finally{await db.end();}
}
