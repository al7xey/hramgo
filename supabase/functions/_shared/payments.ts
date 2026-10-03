import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
export const db=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
export function headers(origin:string|null) {
  const allowed=(Deno.env.get('ALLOWED_ORIGINS')??'https://hramgo.ru').split(',');
  return {'content-type':'application/json','access-control-allow-origin':origin&&allowed.includes(origin)?origin:'https://hramgo.ru','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST, OPTIONS','vary':'Origin'};
}
export function json(body:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
export async function provider(path:string,init:RequestInit={}) {
  const shop=Deno.env.get('YOOKASSA_SHOP_ID'),secret=Deno.env.get('YOOKASSA_SECRET_KEY');
  if(!shop||!secret)throw new Error('Provider unavailable');
  const response=await fetch('https://api.yookassa.ru/v3/'+path,{...init,signal:AbortSignal.timeout(15000),headers:{'authorization':'Basic '+btoa(shop+':'+secret),'content-type':'application/json',...init.headers}});
  if(!response.ok)throw new Error('Provider request failed');
  return await response.json();
}
export const mapStatus=(status:string)=>status==='succeeded'?'PAID':status==='canceled'?'CANCELLED':'PENDING';
export function confirmationUrl(value:unknown) {
  if(typeof value!=='string')throw new Error('Provider redirect missing');
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||!['yookassa.ru','yoomoney.ru'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))throw new Error('Provider redirect invalid');
  return url.href;
}
