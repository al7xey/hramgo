import { db,json,provider,mapStatus } from '../_shared/payments.ts';
Deno.serve(async request=>{
  if(request.method!=='POST')return json({message:'Method not allowed'},405);
  try {
    const raw=await request.text();if(raw.length>16384)return json({message:'Request too large'},413);
    const notification=JSON.parse(raw);
    const event=String(notification.event??''),id=String(notification.object?.id??'');
    if(!/^[\da-f-]{30,40}$/i.test(id)||!['payment.succeeded','payment.canceled','payment.waiting_for_capture','refund.succeeded'].includes(event))return json({message:'Invalid notification'},400);
    const client=db();
    if(event==='refund.succeeded'){
      const refund=await provider('refunds/'+encodeURIComponent(id));
      if(refund.id!==id||refund.status!=='succeeded')return json({message:'Unverified refund'},400);
      const {data:payment,error}=await client.from('support_payments').select('*').eq('provider_id',refund.payment_id).maybeSingle();
      if(error)throw error;if(!payment)return json({ok:true});
      if(refund.amount?.currency!=='RUB')return json({message:'Currency mismatch'},400);
      // Only a full verified refund changes the full payment's status.
      if(Math.round(Number(refund.amount.value)*100)===payment.amount_kopecks){const {error}=await client.from('support_payments').update({status:'REFUNDED',updated_at:new Date().toISOString()}).eq('id',payment.id);if(error)throw error;}
      return json({ok:true});
    }
    const {data:payment,error}=await client.from('support_payments').select('*').eq('provider_id',id).maybeSingle();
    if(error)throw error;if(!payment)return json({message:'Payment not ready; retry'},503);
    // Never trust the webhook body or only its source IP. Re-fetch from YooKassa.
    const verified=await provider('payments/'+encodeURIComponent(id));
    if(verified.id!==id||verified.amount?.currency!=='RUB'||Math.round(Number(verified.amount?.value)*100)!==payment.amount_kopecks||(!payment.legacy_id&&verified.metadata?.support_payment_id!==payment.id))return json({message:'Payment mismatch'},400);
    const status=mapStatus(verified.status);
    if(status==='PAID'&&verified.paid!==true)return json({message:'Payment is not paid'},400);
    if(payment.status==='REFUNDED'||payment.status==='PAID'&&status!=='PAID')return json({ok:true});
    const allowed=status==='PAID'?['CREATED','PENDING','ERROR','PAID']:['CREATED','PENDING','ERROR'];
    const {error:updateError}=await client.from('support_payments').update({status,receipt_status:verified.receipt_registration??null,updated_at:new Date().toISOString()}).eq('id',payment.id).in('status',allowed);
    if(updateError)throw updateError;return json({ok:true});
  }catch{return json({message:'Temporary failure; retry'},503);}
});
