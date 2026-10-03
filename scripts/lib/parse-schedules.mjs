import { createHash } from 'node:crypto';
// Import candidates only. Publication requires an explicit source review.
// Never infer a service type from its clock time or assume an unstated weekday.
export function scheduleCandidates({templeId,text,sourceUrl,verifiedAt}) {
  if(!text||!sourceUrl)return [];
  const output=[];
  for(const fragment of text.split(/\n|;|\.\s+(?!\d)/)){
    if(/праздник|пост|накануне|кроме|до Успения|Троицы/i.test(fragment))continue;
    const clocks=[...fragment.matchAll(/([01]?\d|2[0-3])[.:]([0-5]\d)/g)];
    const dayGroups=[/ежедневно/i,/будн/i,/выходн/i,/понедель/i,/вторник/i,/сред(?:а|ам|у)/i,/четвер/i,/пятниц/i,/суббот/i,/воскресен/i].filter(rx=>rx.test(fragment));
    if(clocks.length>1&&dayGroups.length>1)continue;
    if(/\d{1,2}\s+(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i.test(fragment))continue;
    const days=[];
    if(/ежедневно/i.test(fragment))days.push(1,2,3,4,5,6,7);
    else if(/будн/i.test(fragment))days.push(1,2,3,4,5);
    else if(/выходн/i.test(fragment))days.push(6,7);
    else {
      [/понедель/i,/вторник/i,/сред(?:а|ам|у|ам)/i,/четвер/i,/пятниц/i,/суббот/i,/воскресен/i].forEach((rx,i)=>{if(rx.test(fragment))days.push(i+1);});
    }
    if(!days.length)continue;
    const kinds=[['liturgy',/литурги/i,'Литургия'],['evening',/вечерн|всенощн/i,'Вечернее богослужение'],['prayer',/молебен|молебн/i,'Молебен']].filter(([,rx])=>rx.test(fragment));
    if(kinds.length!==1)continue; // An ambiguous paragraph needs human review.
    for(const match of clocks){
      const startsAt=match[1].padStart(2,'0')+':'+match[2];
      const id='schedule-'+createHash('sha256').update(JSON.stringify([templeId,days,startsAt,kinds[0][0],sourceUrl])).digest('hex').slice(0,24);
      output.push({id,templeId,weekdays:days,startsAt,kind:kinds[0][0],title:kinds[0][2],comment:fragment.trim(),isSpecial:false,sourceUrl,verifiedAt,confidence:0.7,status:'REVIEW'});
    }
  }
  return [...new Map(output.map(e=>[e.id,e])).values()];
}
