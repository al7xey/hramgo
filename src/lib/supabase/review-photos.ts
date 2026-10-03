import {getSupabase} from './client';
async function optimize(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Принимаем JPG, PNG и WebP до 8 МБ.');
 const bitmap=await createImageBitmap(file);
 try{if(bitmap.width*bitmap.height>30000000)throw new Error('Слишком большое разрешение фотографии.');const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Обработка фото недоступна.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Не удалось обработать фото.')),'image/webp',.78));if(blob.size>1048576)throw new Error('Фотография после обработки превышает 1 МБ.');return blob;}finally{bitmap.close();}
}
export async function uploadReviewPhotos(reviewId:string,userId:string,files:File[]){
 if(files.length>10)throw new Error('К отзыву можно добавить до 10 фотографий.');
 const client=getSupabase();
 for(const file of files){const blob=await optimize(file),path=`${userId}/${reviewId}/${crypto.randomUUID()}.webp`;const {error}=await client.storage.from('review-photos').upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw new Error('Не удалось загрузить фотографию.');const result=await client.from('review_photos').insert({review_id:reviewId,user_id:userId,storage_path:path,alt:'Фотография посетителя'});if(result.error){await client.storage.from('review-photos').remove([path]);throw new Error('Не удалось прикрепить фотографию.');}}
}
