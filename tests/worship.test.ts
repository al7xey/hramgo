import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchingServices} from '../src/features/temples/worship';
import {searchTemples} from '../src/features/temples/search';
import {templeSearchSchema} from '../src/features/temples/validation';
import type {ScheduleEntry,TempleView} from '../src/features/temples/types';
const now=new Date('2026-10-03T12:00:00Z');
const base:ScheduleEntry={id:'t',templeId:'t',startsAt:'18:00',kind:'evening',title:'Всенощное бдение',weekdays:[6],isSpecial:false,sourceUrl:'https://example.org',verifiedAt:'2026-10-03T10:00:00Z',confidence:1,status:'VERIFIED'};
test('date, service and time range must match the same verified entry',()=>{
  const input={date:'2026-10-03',timeFrom:'17:00',timeTo:'20:00',worship:'vigil' as const};
  assert.equal(matchingServices([base],input,now).length,1);
  assert.equal(matchingServices([base],{...input,date:'2026-10-04'},now).length,0);
  assert.equal(matchingServices([{...base,startsAt:'16:00'}],input,now).length,0);
  assert.equal(matchingServices([{...base,startsAt:'21:00'}],input,now).length,0);
  assert.equal(matchingServices([{...base,title:'Вечернее богослужение'}],input,now).length,0);
  assert.equal(matchingServices([base],{...input,worship:'confession'},now).length,0);
  assert.equal(matchingServices([{...base,title:'Исповедь'}],{...input,worship:'confession'},now).length,1);
});
test('past services today are excluded, future dates remain searchable',()=>{
  assert.equal(matchingServices([{...base,startsAt:'14:00'}],{date:'2026-10-03'},now).length,0);
  assert.equal(matchingServices([{...base,startsAt:'14:00',weekdays:[7]}],{date:'2026-10-04'},now).length,1);
});
test('service search uses verified catalogue entries and never raw summaries',()=>{
  const temples:TempleView[]=JSON.parse(readFileSync('data/temples.json','utf8'));
  const input={date:'2026-10-04',worship:'liturgy' as const,timeTo:'12:00'};
  const verifiedNow=new Date('2026-10-03T18:00:00Z');
  const found=searchTemples(temples,input,verifiedNow);
  assert.ok(found.length>0);
  for(const t of found)assert.ok(matchingServices(t.scheduleEntries??[],input,verifiedNow).length);
  assert.equal(searchTemples(temples.map(t=>({...t,scheduleEntries:[],scheduleSummary:'Литургия 09:00'})),input,verifiedNow).length,0);
});
test('invalid dates and clock times cannot enter the service search',()=>{
  const result=templeSearchSchema.parse({date:'2026-02-31',timeFrom:'28:00',timeTo:'17:99'});
  assert.equal(result.date,undefined);assert.equal(result.timeFrom,undefined);assert.equal(result.timeTo,undefined);
});
