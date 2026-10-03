import type { TempleView } from './types';
let promise:Promise<TempleView[]>|null=null;
export function loadCatalog() {
  if(!promise)promise=fetch('/data/catalog.json',{signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw new Error('Не удалось загрузить каталог. Попробуйте ещё раз.');return await r.json() as TempleView[];}).catch(error=>{promise=null;throw error;});
  return promise;
}
