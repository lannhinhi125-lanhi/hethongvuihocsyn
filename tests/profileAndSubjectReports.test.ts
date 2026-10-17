import assert from 'node:assert/strict';
import { studentProfileRows, studentRegistrationRows, studentHistoryForSubject } from '../src/lib/studentRegistrations';
import { makeReportDatasets } from '../src/lib/reportDatasets';
import { buildCustomReport, defaultReportConfig } from '../src/lib/customReports';
import { monitoringSubjectCode, selectedMonitoringSubject } from '../src/lib/monitoringSubjects';
import type { StudentRecord, ClassItem, SubjectItem, StudentClassTrace } from '../src/types';

const student:StudentRecord={id:'HS-1',name:'An',created_at:'2026-08-01',grade:'3',subject:'MATH',model:'1-3',level:'BASIC',status:'Đang học',scheduleSlots:[],registrations:[
 {subject:'MATH',model:'1-3',level:'BASIC',status:'Đang học',scheduleSlots:[],registeredAt:'2026-08-01'},
 {subject:'ENG',model:'1-1',level:'BASIC',status:'Chờ xếp lớp',scheduleSlots:[],registeredAt:'2026-10-17'}
]};
assert.equal(studentProfileRows([student,student]).length,1,'one student remains one profile even across two subject rows');
assert.equal(studentRegistrationRows([student]).length,2,'independent subject registrations still count twice');
const row=(s:StudentRecord)=>({id:s.id,name:s.name,date:s.created_at || '',grade:s.grade,subject:s.subject,model:s.model,status:s.status});
const datasets=makeReportDatasets({classes:[],students:studentProfileRows([student]).map(row),registrations:studentRegistrationRows([student]).map(row),teachers:[],incidents:[],inspections:[]});
const profiles=datasets.find(item=>item.id==='students')!,registrations=datasets.find(item=>item.id==='student_registrations')!;
const now=new Date('2026-10-17T12:00:00+07:00');
assert.equal(buildCustomReport(profiles,{...defaultReportConfig(profiles),datePreset:'all'},now).totals.count,1);
assert.equal(buildCustomReport(registrations,{...defaultReportConfig(registrations),datePreset:'all'},now).totals.count,2);
assert.equal(buildCustomReport(profiles,defaultReportConfig(profiles),now).totals.count,0,'adding English does not create a new profile in October');
assert.equal(buildCustomReport(registrations,defaultReportConfig(registrations),now).totals.count,1,'October includes the English registration');

const trace=(traceId:string,subject:string|undefined,toClassId:string):StudentClassTrace=>({traceId,subject,toClassId,fromClassId:null,fromClassCode:null,toClassCode:toClassId,occurredAt:'2026-10-17',actorId:null,actorName:null,isBaseline:false,isInitial:true});
const classes=[{id:'M',code:'M',subject:'MATH'},{id:'E',code:'E',subject:'ENG'}] as ClassItem[];
const withHistory={...student,classHistory:[trace('1','MATH','M'),trace('2','ENG','E'),trace('3',undefined,'E'),trace('4',undefined,'UNKNOWN')]};
assert.deepEqual(studentHistoryForSubject(withHistory,'MATH',classes).map(item=>item.traceId),['1']);
assert.deepEqual(studentHistoryForSubject(withHistory,'ENG',classes).map(item=>item.traceId),['2','3'],'legacy history resolves subject by linked class; unrelated history stays hidden');

const subjects=[{id:'1',code:'MATH',name:'Toán',status:true},{id:'2',code:'ENG',name:'Tiếng Anh',status:true},{id:'3',code:'SCIENCE',name:'Khoa học',status:true}] as SubjectItem[];
assert.equal(selectedMonitoringSubject(subjects,'ALL'),'MATH');
assert.equal(selectedMonitoringSubject(subjects,'SCIENCE'),'SCIENCE','new catalog subject needs no code branch');
assert.equal(selectedMonitoringSubject([{...subjects[0],status:false},subjects[1]],'MATH'),'ENG','disabled selection falls back to an active catalog subject');
assert.equal(selectedMonitoringSubject([],'ALL'),'');
assert.equal(monitoringSubjectCode({classCode:'E',subject:'OLD'},classes),'ENG');
assert.equal(monitoringSubjectCode({classCode:'SCI-1',subject:'SCIENCE'},classes),'SCIENCE');
console.log('PASS: unique profile counts, separate subject counts/dates, subject-only history, dynamic monitoring subjects');
