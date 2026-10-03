import {readFile,access} from 'node:fs/promises';
const temples=JSON.parse(await readFile('data/temples.json','utf8'));
for(const name of ['index.html','404.html','temples/index.html','map/index.html','login/index.html','sitemap.xml','robots.txt','rss.xml','CNAME','.nojekyll'])await access('out/'+name);
for(const t of temples){await access('out/temples/'+t.slug+'/index.html');await access('out/temples/'+t.slug+'/reviews/index.html');}
const home=await readFile('out/index.html','utf8');if(/service_role|SUPABASE_SECRET_KEY|YOOKASSA_SECRET_KEY/.test(home))throw new Error('Private key name in exported HTML');
console.log(`Static export verified: ${temples.length} temple routes and review pages.`);
