import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const helperUrl = moduleUrl(readFileSync('src/lib/monitoringIncidents.ts','utf8'));
const { lessonIncidentRows, withIncident, saveIncidentRow } = await import(helperUrl);
const writes = {};
globalThis.multipleIncidentWrites = writes;
const source = readFileSync('src/lib/monitoringPersistence.ts','utf8')
  .replace("import { setBusinessValue } from './businessPersistence';", 'const setBusinessValue = (key,value) => globalThis.multipleIncidentWrites[key] = value;')
  .replace("'./monitoringIncidents'", JSON.stringify(helperUrl));
const { storedMonitoringSession, persistMonitoringChanges } = await import(moduleUrl(source));
const categories = [{id:'CAT',code:'TEACHER',subIncidents:[{code:'LATE',name:'Vào muộn'},{code:'MIC',name:'Lỗi mic'}]}];
const rows = [
  {id:'OLD',lessonId:'L',categoryId:'CAT',incidentCode:'LATE',status:'DANG_XU_LY',content:'Old report',reportedBy:'ORIGINAL',reportedAt:'2026-10-28T08:00:00Z'},
  {id:'NEW',lessonId:'L',categoryId:'CAT',incidentCode:'MIC',status:'DA_GIAI_QUYET',content:'New report',reportedAt:'2026-10-28T09:00:00Z'},
  {id:'OTHER',lessonId:'OTHER',content:'Another lesson'}
];
const base={sessionCode:'L',classCode:'CLASS',sessionDate:'2026-10-28',timeSlot:'18:00 - 19:00'};
const lesson={id:'L',classId:'C',date:base.sessionDate,timeSlotId:'S',primaryTeacherId:'T',status:'DA_HOC'};
const classes=[{id:'C',code:'CLASS',teacherId:'T'}],teachers=[{id:'T',name:'Teacher'}],slots=[{id:'S',timeRange:base.timeSlot}];
const session=storedMonitoringSession(base,[lesson],rows,classes,teachers,slots,categories,[]);
assert.equal(session.incidentCount,2);
assert.equal(session.incidentId,'OLD','an older unresolved report remains visible in the diary');
const reports=lessonIncidentRows(rows,'L').map(row=>withIncident(session,row,categories,[]));
assert.deepEqual(reports.map(row=>row.incidentId),['NEW','OLD']);
assert.equal(reports.filter(row=>row.incidentStatus==='DANG_XU_LY').length,1);
const persist=next=>persistMonitoringChanges([session],[next],[lesson],rows,classes,teachers,slots,categories,'OPS');
persist({...session,creatingIncident:true,incidentId:undefined,incidentChild:'MIC',incidentNote:'Third report',handledAt:'now'});
assert.equal(writes.lesson_incidents.length,4,'adding a report does not overwrite either existing report');
assert.deepEqual(writes.lesson_incidents.slice(0,3),rows);
assert.equal(new Set(writes.lesson_incidents.map(row=>row.id)).size,4);
assert.equal(writes.dated_lessons.length,1,'several incidents do not duplicate the lesson');
persist({...reports[0],incidentNote:'Edited newest',handledAt:'now'});
assert.equal(writes.lesson_incidents.find(row=>row.id==='NEW').content,'Edited newest');
assert.deepEqual(writes.lesson_incidents.find(row=>row.id==='OLD'),rows[0]);
persist({...reports[1],incidentNote:'Edited older',handledAt:'now'});
assert.equal(writes.lesson_incidents.find(row=>row.id==='OLD').content,'Edited older');
assert.equal(writes.lesson_incidents.find(row=>row.id==='OLD').reportedBy,'ORIGINAL');
assert.equal(writes.lesson_incidents.find(row=>row.id==='OLD').reportedAt,rows[0].reportedAt);
assert.deepEqual(writes.lesson_incidents.find(row=>row.id==='NEW'),rows[1]);
assert.throws(()=>saveIncidentRow(rows,{lessonId:'L'},'MISSING'),/không còn tồn tại/);
assert.throws(()=>saveIncidentRow(rows,{lessonId:'L'},'OTHER'),/không còn tồn tại/);
persist({...session,lessonDiary:'Attendance change only'});
assert.deepEqual(writes.lesson_incidents,rows,'non-incident changes preserve every report');
console.log('PASS: multiple reports, exact editing, unresolved history, original author/date and independent lessons.');
