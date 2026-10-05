import {readFile,writeFile} from 'node:fs/promises';
import {get} from 'node:https';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const dir='audit/2026-10-05/evidence';
const evidence=JSON.parse(await readFile(dir+'/http-dom.json'));
const full=JSON.parse(await readFile('data/temples.json'));
const rawGet=url=>new Promise(resolve=>{const req=get(url,{headers:{'Accept-Encoding':'gzip','User-Agent':'HramGo-UX-Audit/1.0'}},res=>{let bytes=0;res.on('data',b=>bytes+=b.length);res.on('end',()=>resolve({url,status:res.statusCode,bytes,encoding:res.headers['content-encoding'],location:res.headers.location}));});req.setTimeout(15000,()=>req.destroy(new Error('timeout')));req.on('error',e=>resolve({url,error:e.message}));});
const transfer=await Promise.all(['/data/catalog.json',...evidence.pages.find(p=>p.path==='/temples/').dom.js.filter(x=>!x.includes('polyfills'))].map(p=>rawGet('https://hramgo.ru'+p)));
const urls=[...new Set(full.slice(0,4).map(t=>t.photos[0]?.imageUrl).filter(Boolean))];
const photoChecks=await Promise.all(urls.map(rawGet));
const exported=[];
for(const temple of full){try{const html=await readFile('out/temples/'+temple.slug+'/index.html','utf8'); const $=load(html);exported.push({slug:temple.slug,h1:$('h1').length,telephoneLinks:$('a[href^="tel:"]').length,mailLinks:$('a[href^="mailto:"]').length,hasRoute:$('a').filter((_,e)=>/Маршрут|Построить маршрут/.test($(e).text())).length,openSchedule:$('details').filter((_,e)=>$(e).children('summary').text()==='Расписание'&&$(e).attr('open')!==undefined).length,brokenAlt:$('img:not([alt])').length,photos:$('img').length,canonical:$('link[rel=canonical]').attr('href'),sourceMislabeled:$('a').filter((_,e)=>$(e).text()==='Расписание на официальном сайте'&&($(e).attr('href')??'').includes('sprav.moseparh.ru')).length});}catch(e){exported.push({slug:temple.slug,error:e.message});}}
const sampleHashes=await Promise.all(evidence.pages.filter(p=>p.path.startsWith('/temples/')&&p.path!='/temples/').map(async p=>{try{return{path:p.path,matchesLocal:p.hash===createHash('sha256').update(await readFile('out'+p.path+'index.html')).digest('hex')}}catch{return{path:p.path,matchesLocal:false}}}));
const result={transfer,photoChecks,exportedSummary:{pages:exported.length,allH1one:exported.every(p=>p.h1===1),withTelephoneLinks:exported.filter(p=>p.telephoneLinks).length,withEmailLinks:exported.filter(p=>p.mailLinks).length,withRoute:exported.filter(p=>p.hasRoute).length,withOpenSchedule:exported.filter(p=>p.openSchedule).length,missingAlt:exported.filter(p=>p.brokenAlt).length,sourceMislabeled:exported.filter(p=>p.sourceMislabeled).length},sampleHashes,exported};
await writeFile(dir+'/additional.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,exported:undefined,sampleHashes:{matched:sampleHashes.filter(p=>p.matchesLocal).length,total:sampleHashes.length}},null,2));
