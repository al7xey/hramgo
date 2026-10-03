import {db,json,headers} from '../_shared/payments.ts';
Deno.serve(async request=>{
 const origin=request.headers.get('origin');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(request.method!=='POST')return json({message:'Method not allowed'},405,origin);
 try{
  const raw=await request.text();if(raw.length>4096)return json({message:'Too large'},413,origin);
  const input=JSON.parse(raw),ids=input.reviewIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>20||ids.some(id=>typeof id!=='string'||id.length>80))return json({message:'Invalid IDs'},400,origin);
  const client=db(),token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');let uid:string|undefined;
  if(token&&token!==Deno.env.get('SUPABASE_ANON_KEY')&&!token.startsWith('sb_publishable_')){const {data}=await client.auth.getUser(token);uid=data.user?.id;}
  const {data:rows,error}=await client.from('review_photos').select('id,review_id,user_id,storage_path,alt,status,reviews!inner(temple_id,status)').in('review_id',ids).limit(200);
  if(error)throw error;
  if(!rows.length)return json({photos:[]},200,origin);
  const parents=rows.map(row=>{const parent=row.reviews as unknown as {temple_id:string;status:string};return {...row,parent};});
  const templeIds=[...new Set(parents.map(r=>r.parent.temple_id))];
  const {data:published,error:publishedError}=await client.from('temples').select('id').in('id',templeIds).eq('status','PUBLISHED');if(publishedError)throw publishedError;
  const publicIds=new Set(published.map(t=>t.id));
  const visible=parents.filter(r=>r.user_id===uid||(r.status==='APPROVED'&&r.parent.status==='APPROVED'&&publicIds.has(r.parent.temple_id)));
  const result=[];
  for(const row of visible){const {data,error}=await client.storage.from('review-photos').createSignedUrl(row.storage_path,120);if(!error)result.push({id:row.id,reviewId:row.review_id,alt:row.alt,url:data.signedUrl});}
  return json({photos:result},200,origin);
 }catch{return json({message:'Media temporarily unavailable'},503,origin);}
});
