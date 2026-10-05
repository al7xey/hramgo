import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { load } from 'cheerio';

const dir = 'audit/2026-10-05/evidence';
await mkdir(dir, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
async function get(path) {
  const start = performance.now();
  try {
    const r = await fetch('https://hramgo.ru' + path, { signal: AbortSignal.timeout(25000) });
    const b = Buffer.from(await r.arrayBuffer());
    return { path, status: r.status, url: r.url, ms: Math.round(performance.now()-start), bytes: b.length, hash: sha(b), headers: Object.fromEntries(['content-type','content-encoding','cache-control','content-length','etag'].map(k => [k,r.headers.get(k)])), body: b };
  } catch(e) { return { path, error: e.message }; }
}
const remote = await get('/data/catalog.json');
if (!remote.body) throw new Error(remote.error);
const temples = JSON.parse(remote.body);
await writeFile(dir+'/catalog.json',remote.body);
const local = await readFile('public/data/catalog.json');
const selection = [...new Map([
  ...temples.filter(t => /данилов|христа спасителя|новодевич|андреевский|алексеевский|троицкий.*троицк|воскресения.*сокольниках/i.test(t.name)).slice(0,10),
  ...temples.filter(t => !t.websiteUrl).slice(0,2),
  ...temples.filter(t => !t.photos.length).slice(0,2),
  ...temples.filter(t => t.latitude == null).slice(0,2),
  ...temples.filter(t => t.scheduleEntries.some(e => /\.pdf/i.test(e.sourceUrl))).slice(0,2),
  ...temples.filter(t => t.scheduleEntries.some(e => /vk\.com|t\.me/i.test(e.sourceUrl))).slice(0,2),
  ...Array.from({length:30},(_,i) => temples[Math.floor(i*temples.length/30)])
].map(t=>[t.slug,t])).values()].slice(0,30);
const paths = ['/', '/temples/', '/map/', '/support/', '/legal/privacy/', '/legal/contacts/', '/legal/terms/', '/legal/cookies/', '/rss.xml','/sitemap.xml','/robots.txt','/audit-nonexistent-20261005/',...selection.map(t => '/temples/'+t.slug+'/')];
const output=[];
let cursor=0;
await Promise.all(Array.from({length:5},async()=>{while(cursor<paths.length){const p=paths[cursor++];const r=await get(p); if(r.body){await writeFile(dir+'/'+(p.replace(/[^a-z0-9]+/gi,'_')||'home')+'.html',r.body); const $=load(r.body); r.dom={title:$('title').text(),description:$('meta[name=description]').attr('content'),canonical:$('link[rel=canonical]').attr('href'),h1:$('h1').map((_,e)=>$(e).text()).get(),h2:$('h2').map((_,e)=>$(e).text()).get(),images:$('img').map((_,e)=>({src:$(e).attr('src'),alt:$(e).attr('alt'),loading:$(e).attr('loading'),width:$(e).attr('width'),height:$(e).attr('height'),srcset:$(e).attr('srcset')})).get(),links:$('a').map((_,e)=>({text:$(e).text(),href:$(e).attr('href')})).get(),details:$('details').map((_,e)=>({summary:$(e).children('summary').text(),open:$(e).attr('open')!==undefined})).get(),robots:$('meta[name=robots]').attr('content'),text:$('body').clone().find('script').remove().end().text().replace(/\s+/g,' ').slice(0,35000),js:$('script[src]').map((_,e)=>$(e).attr('src')).get(),css:$('link[rel=stylesheet]').map((_,e)=>$(e).attr('href')).get()}; delete r.body;} output.push(r);}}));
const resources=[...new Set(output.filter(r=>['/','/temples/','/map/'].includes(r.path)).flatMap(r=>[...(r.dom?.js??[]),...(r.dom?.css??[])]))];
const assets=[]; cursor=0; await Promise.all(Array.from({length:5},async()=>{while(cursor<resources.length){const r=await get(resources[cursor++]);delete r.body; assets.push(r);}}));
function contrast(a,b){const L=c=>{const n=c.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*n[0]+.7152*n[1]+.0722*n[2];};const x=L(a),y=L(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);}
const counts={temples:temples.length,websites:temples.filter(t=>t.websiteUrl).length,photos:temples.filter(t=>t.photos.length).length,coordinates:temples.filter(t=>t.latitude!=null&&t.longitude!=null).length,phone:temples.filter(t=>t.phone).length,transit3:temples.filter(t=>t.transit.length>=3).length,transit0:temples.filter(t=>!t.transit.length).length};
const summary={date:new Date().toISOString(),catalog:{...remote,body:undefined,matchesLocal:sha(local)===remote.hash},counts,contrasts:{primaryWhite:contrast('#4b9fe1','#ffffff'),primaryBackground:contrast('#4b9fe1','#fcfdff'),darkPrimaryWhite:contrast('#7ec8ff','#ffffff'),mutedBackground:contrast('#66788a','#fcfdff'),activeNav:contrast('#2d8ed8','#dceefb')},sample:selection.map(t=>({slug:t.slug,name:t.name,district:t.district,website:t.websiteUrl,photos:t.photos.length,coordinates:t.latitude!=null,sourceCount:t.scheduleEntries.length})),pages:output,assets};
await writeFile(dir+'/http-dom.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({catalog:{status:remote.status,bytes:remote.bytes,ms:remote.ms,matchesLocal:summary.catalog.matchesLocal,headers:remote.headers},counts,contrasts:summary.contrasts,sampleCount:selection.length,pages:output.map(r=>({path:r.path,status:r.status,bytes:r.bytes,error:r.error})),assets:assets.map(r=>({path:r.path,bytes:r.bytes,encoding:r.headers?.['content-encoding']}))},null,2));
