import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function cachedGet(url,{maxAgeDays=14}={}) {
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='sprav.moseparh.ru')throw new Error('Only the official directory may be crawled by this importer.');
  const hash=createHash('sha256').update(url).digest('hex'),file=`tmp/source-cache/${hash}.json`;
  await mkdir('tmp/source-cache',{recursive:true});
  let previous;try{previous=JSON.parse(await readFile(file,'utf8'));}catch{/* New source */}
  if(previous?.body&&Date.now()-new Date(previous.checkedAt).getTime()<maxAgeDays*86400000)return previous;
  const headers={'user-agent':'HramGo/1.0 (+https://hramgo.ru; source verification)'};
  if(previous?.etag)headers['if-none-match']=previous.etag;
  if(previous?.lastModified)headers['if-modified-since']=previous.lastModified;
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
    if(![429,500,502,503,504].includes(response.status))break;
    if(attempt===2)break;
    await new Promise(resolve=>setTimeout(resolve,Math.min(5000,1000*(attempt+1))));
  }
  let result;
  if(response.status===304&&previous)result={...previous,checkedAt:new Date().toISOString(),status:304};
  else {
    if(!response.ok)throw new Error(`Source returned ${response.status}`);
    const body=await response.text();if(body.length>3000000)throw new Error('Source response is unexpectedly large');
    result={url,body,status:response.status,checkedAt:new Date().toISOString(),etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),hash:createHash('sha256').update(body).digest('hex')};
  }
  await writeFile(file,JSON.stringify(result));return result;
}
