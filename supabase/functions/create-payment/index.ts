import { db,json,headers,provider,mapStatus,confirmationUrl } from '../_shared/payments.ts';
Deno.serve(async request=>{
  const origin=request.headers.get('origin');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=='POST')return json({message:'Method not allowed'},405,origin);
  if(origin&&!(Deno.env.get('ALLOWED_ORIGINS')??'https://hramgo.ru').split(',').includes(origin))return json({message:'Origin not allowed'},403,origin);
  try {
    if(Number(request.headers.get('content-length')??0)>4096)return json({message:'Request too large'},413,origin);
    const client=db(),token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!token)return json({message:'Sign in required'},401,origin);
    const {data:auth,error:authError}=await client.auth.getUser(token);
    if(authError||!auth.user||!auth.user.email_confirmed_at)return json({message:'Verified sign in required'},401,origin);
    const {data:role}=await client.from('user_roles').select('role').eq('user_id',auth.user.id).maybeSingle();
    if(role?.role==='BLOCKED')return json({message:'Not permitted'},403,origin);
    const raw=await request.text();if(raw.length>4096)return json({message:'Request too large'},413,origin);
    const input=JSON.parse(raw);
    const email=String(auth.user.email??''); // Do not trust a client-supplied account identity.
    const amount=Number(input.amount),kopecks=Math.round(amount*100),key=String(input.idempotencyKey??'');
    if(input.personalDataConsent!==true||!Number.isFinite(amount)||kopecks<10000||kopecks>10000000||Math.abs(amount*100-kopecks)>0.001||!email||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(key))return json({message:'Invalid payment'},400,origin);
    let {data:payment,error:readError}=await client.from('support_payments').select('*').eq('idempotency_key',key).maybeSingle();
    if(readError)throw readError;
    if(payment&&(payment.user_id!==auth.user.id||payment.amount_kopecks!==kopecks||payment.email!==email))return json({message:'Idempotency conflict'},409,origin);
    if(!payment){
      const {count,error}=await client.from('support_payments').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',new Date(Date.now()-600000).toISOString());
      if(error)throw error;if((count??0)>=3)return json({message:'Try again later'},429,origin);
      const {data,error:insertError}=await client.from('support_payments').insert({user_id:auth.user.id,email,amount_kopecks:kopecks,idempotency_key:key}).select('*').single();
      if(insertError){const result=await client.from('support_payments').select('*').eq('idempotency_key',key).single();if(result.error)throw insertError;payment=result.data;}else payment=data;
    }
    if(!payment||payment.user_id!==auth.user.id||payment.amount_kopecks!==kopecks||payment.email!==email)return json({message:'Idempotency conflict'},409,origin);
    if(payment.status==='PAID')return json({status:'PAID'},200,origin);
    if(payment.status==='CANCELLED'||payment.status==='REFUNDED')return json({message:'Payment already closed'},409,origin);
    if(payment.confirmation_url)return json({confirmationUrl:confirmationUrl(payment.confirmation_url),status:payment.status},200,origin);
    const description=Deno.env.get('YOOKASSA_RECEIPT_ITEM_NAME');if(!description)throw new Error('Receipt not configured');
    const value=(kopecks/100).toFixed(2);
    const result=await provider('payments',{method:'POST',headers:{'Idempotence-Key':key},body:JSON.stringify({amount:{value,currency:'RUB'},capture:true,confirmation:{type:'redirect',return_url:'https://hramgo.ru/support/'},description,receipt:{customer:{email},items:[{description,quantity:'1.00',amount:{value,currency:'RUB'},vat_code:Number(Deno.env.get('YOOKASSA_VAT_CODE')??1),payment_subject:Deno.env.get('YOOKASSA_PAYMENT_SUBJECT')??'service',payment_mode:Deno.env.get('YOOKASSA_PAYMENT_MODE')??'full_payment'}]},metadata:{support_payment_id:payment.id}})});
    const url=confirmationUrl(result.confirmation?.confirmation_url);
    const {error}=await client.from('support_payments').update({provider_id:result.id,confirmation_url:url,status:mapStatus(result.status),updated_at:new Date().toISOString()}).eq('id',payment.id).in('status',['CREATED','PENDING','ERROR']);
    if(error)throw error;
    return json({confirmationUrl:url,status:mapStatus(result.status)},200,origin);
  } catch {return json({message:'Payment service temporarily unavailable'},503,origin);}
});
