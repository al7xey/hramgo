import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Offline importer is intentionally an ESM JavaScript module.
import {scheduleCandidates} from '../scripts/lib/parse-schedules.mjs';
const input={templeId:'t',sourceUrl:'https://sprav.moseparh.ru/org/1097',verifiedAt:'2026-10-03T12:00:00Z'};
test('parser never applies confession clock times to evening services',()=>{const rows=scheduleCandidates({...input,text:'17:00 (ежедневно) — вечернее богослужение. Исповедь — в будни в 8:00, в воскресенье в 19:00.'});assert.deepEqual(rows.map((r:{startsAt:string})=>r.startsAt),['17:00']);assert.equal(rows[0].status,'REVIEW');});
test('mixed weekday and weekend paragraphs require source review',()=>{assert.equal(scheduleCandidates({...input,text:'8:00 (по будням) / 8:30 (по выходным) — Литургия'}).length,0);assert.equal(scheduleCandidates({...input,text:'7:00 (ежедневно в течение поста) — Литургия'}).length,0);});
test('a service at 18:00 remains a liturgy when the source explicitly says so',()=>{const rows=scheduleCandidates({...input,text:'18:00 (по средам) — Литургия'});assert.equal(rows[0].kind,'liturgy');assert.deepEqual(rows[0].weekdays,[3]);});
