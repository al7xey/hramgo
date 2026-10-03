import { createClient } from '@supabase/supabase-js';
export function adminClient(){
  const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be configured in a private environment.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}});
}
export async function upsertBatches(client,table,rows,onConflict='id'){
  for(let index=0;index<rows.length;index+=150){
    const batch=rows.slice(index,index+150);
    const {error}=await client.from(table).upsert(batch,{onConflict});
    if(error)throw new Error(`Import failed for ${table}, batch ${index}: ${error.code??'unknown'}`);
  }
  console.log(`${table}: ${rows.length}`);
}
export async function readAll(client,table,select='*',query=c=>c){
  const rows=[];
  for(let page=0;;page++){
    const {data,error}=await query(client.from(table).select(select)).order('id').range(page*500,page*500+499);
    if(error)throw new Error(`Read failed: ${table}: ${error.code}`);
    rows.push(...data);if(data.length<500)break;
  }
  return rows;
}
