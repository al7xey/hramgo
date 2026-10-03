import {readFile,access,readdir} from 'node:fs/promises';
const temples=JSON.parse(await readFile('data/temples.json','utf8'));
for(const name of ['index.html','404.html','temples/index.html','map/index.html','sitemap.xml','robots.txt','rss.xml','CNAME','.nojekyll'])await access('out/'+name);
for(const t of temples)await access('out/temples/'+t.slug+'/index.html');
for(const route of ['login','register','favorites','profile','admin','representative','support']){
 try{await access('out/'+route+'/index.html');}catch{continue;}
 throw new Error('Removed route was exported: '+route);
}
const files=await readdir('out',{recursive:true});
const pathChecks=[];
for(const file of files){
 if(/(^|[\\/])reviews([\\/]|$)/.test(file))throw new Error('Review route remains in export');
 if(!/\.(html|js)$/.test(file))continue;
 pathChecks.push(file);
}
for(let start=0;start<pathChecks.length;start+=30){
 const contents=await Promise.all(pathChecks.slice(start,start+30).map(async file=>({file,content:await readFile('out/'+file,'utf8')})));
 for(const {file,content} of contents)if(/href=["']\/(login|register|favorites|profile|admin|representative|support)(?:[/?"'])|AggregateRating|AuthProvider|Добавить в избранное|Написать отзыв/.test(content))throw new Error('Removed feature remains in '+file);
}
const home=await readFile('out/index.html','utf8');if(/service_role|SUPABASE_SECRET_KEY|YOOKASSA_SECRET_KEY/.test(home))throw new Error('Private key name in exported HTML');
console.log(`Static export verified: ${temples.length} temple routes; account, favorite and review features absent.`);
