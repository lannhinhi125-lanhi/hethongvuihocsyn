import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const url = source=>'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const {canAssignCover}=await import(url(readFileSync('src/lib/coverTiming.ts','utf8')));
const session={sessionDate:'2026-10-29',timeSlot:'18:00 - 19:30'};
for(const status of ['CHUA_HOC','DA_HOC','DANG_HOC']) {
 assert.equal(canAssignCover({...session,status},new Date('2026-10-29T19:29:59+07:00')),true);
 assert.equal(canAssignCover({...session,status},new Date('2026-10-29T19:30:00+07:00')),false);
 assert.equal(canAssignCover({...session,status},new Date('2026-10-30T09:00:00+07:00')),false);
}
const overnight={sessionDate:'2026-10-29',timeSlot:'23:00 - 01:00'};
assert.equal(canAssignCover(overnight,new Date('2026-10-30T00:59:59+07:00')),true);
assert.equal(canAssignCover(overnight,new Date('2026-10-30T01:00:00+07:00')),false);
assert.equal(canAssignCover({...session,timeSlot:'bad'}),false);
const helper=url(readFileSync('src/lib/monitoringIncidents.ts','utf8'));
globalThis.coverTimingWrites={};
const source=readFileSync('src/lib/monitoringPersistence.ts','utf8')
 .replace("import { setBusinessValue } from './businessPersistence';",'const setBusinessValue=(key,value)=>globalThis.coverTimingWrites[key]=value;')
 .replace("'./monitoringIncidents'",JSON.stringify(helper))
 .replace("'./coverTiming'",JSON.stringify(url(readFileSync('src/lib/coverTiming.ts','utf8'))));
const {persistMonitoringChanges}=await import(url(source));
const past={...session,sessionDate:'2001-01-01',sessionCode:'L',classCode:'C',coverTeacherId:null,hasIncident:false};
const lesson={id:'L',classId:'C',primaryTeacherId:'T',coverTeacherId:null};
const save=(old,next,row=lesson)=>persistMonitoringChanges([old],[next],[row],[],[{id:'C',code:'C',teacherId:'T'}],[{id:'T'},{id:'COVER'}],[{id:'S',timeRange:session.timeSlot}],[],'OPS');
assert.throws(()=>save(past,{...past,coverTeacherId:'COVER'}),/giờ kết thúc/);
assert.deepEqual(globalThis.coverTimingWrites,{},'expired cover changes write nothing');
save({...past,coverTeacherId:'COVER'},{...past,coverTeacherId:'COVER',lessonDiary:'Updated incident context'},{...lesson,coverTeacherId:'COVER'});
assert.equal(globalThis.coverTimingWrites.dated_lessons[0].coverTeacherId,'COVER','historical cover survives unrelated updates');
const future={...past,sessionDate:'2099-01-01',status:'DA_HOC'};
save(future,{...future,coverTeacherId:'COVER'});
assert.equal(globalThis.coverTimingWrites.dated_lessons[0].coverTeacherId,'COVER','status does not determine the cover deadline');
console.log('PASS: scheduled end, exact cutoff, overnight, status independence, persistence guard and historical cover.');
