import {getSupabase} from './client';
export async function deleteOwnReview(id:string,userId:string){
 const client=getSupabase();const {data:photos,error:readError}=await client.from('review_photos').select('storage_path').eq('review_id',id).eq('user_id',userId);if(readError)throw readError;
 if(photos?.length){const {error}=await client.storage.from('review-photos').remove(photos.map(p=>p.storage_path));if(error)throw new Error('Не удалось удалить фотографии. Повторите удаление отзыва.');}
 const {error}=await client.from('reviews').delete().eq('id',id).eq('user_id',userId);if(error)throw error;
}
