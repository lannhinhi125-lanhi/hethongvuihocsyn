import assert from 'node:assert/strict';
import { studentRegistrations, studentRegistrationRows, studentForSubject, updateStudentRegistration, assignStudentToClass, studentScheduleConflict } from '../src/lib/studentRegistrations';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';
import type { StudentRecord, ClassItem } from '../src/types';

const student: StudentRecord = { id: 'HS-1', name: 'Học sinh', grade: 'Lớp 3', subject: 'MATH',
 model: '1-3', level: 'BASIC', status: 'Chờ xếp lớp', scheduleSlots: ['T2 (18:00 - 19:00)'] };
const math = { id:'M',code:'M',subject:'MATH',model:'1-3',level:'BASIC',studentIds:['HS-1'],schedule:'T2 (18:00 - 19:00)' } as ClassItem;
const english = { ...math,id:'E',code:'E',subject:'ENG',schedule:'T3 (18:00 - 19:00)' };
let next = assignStudentToClass(student, math, true);
next = updateStudentRegistration(next, { subject:'ENG', model:'1-1',level:'ADV',scheduleSlots:['T3 (18:00 - 19:00)'],status:'Chờ xếp lớp' });
assert.equal(studentRegistrations(next).length,2);
assert.equal(studentForSubject(next,'MATH')?.currentClassCode,'M');
assert.equal(studentForSubject(next,'ENG')?.status,'Chờ xếp lớp');
next = assignStudentToClass(next,{...english,model:'1-1',level:'ADV'},true);
next = assignStudentToClass(next,math,false);
assert.equal(studentForSubject(next,'MATH')?.status,'Chờ xếp lớp');
assert.equal(studentForSubject(next,'MATH')?.currentClassCode,undefined);
assert.equal(studentForSubject(next,'ENG')?.currentClassCode,'E');
assert.deepEqual(studentForSubject(next,'ENG')?.scheduleSlots,['T3 (18:00 - 19:00)']);
assert.equal(studentScheduleConflict('HS-1',english,[math]),false);
assert.equal(studentScheduleConflict('HS-1',{...english,schedule:'T2 (18:30 - 19:30)'},[math]),true);
assert.equal(studentScheduleConflict('HS-1',{...english,schedule:math.schedule},[{...math,status:'Dừng lớp'}]),false);
const encoded=toSupabaseRow('students',next);
for(const key of ['mamonhoc','mamohinh','matrinhdo','trangthai','malophientai','lichdangky'])assert.equal(Object.hasOwn(encoded,key),false,'study facts must not be copied onto the profile: '+key);
assert.equal((encoded.dangkymonhoc as any[])[0].status,'CHO_XEP_LOP');
assert.deepEqual(fromSupabaseRow('students',encoded).registrations,next.registrations);
const simultaneous=updateStudentRegistration(student,{registrations:[
 {subject:'MATH',model:'1-3',level:'BASIC',scheduleSlots:['T2 (18:00 - 19:00)'],status:'Chờ xếp lớp'},
 {subject:'ENG',model:'1-1',level:'ADV',scheduleSlots:['T3 (18:00 - 19:00)'],status:'Chờ xếp lớp'}
]});
assert.equal(studentRegistrations(simultaneous).length,2,'one submission retains both subject drafts');
const reportRows=studentRegistrationRows([{...simultaneous,created_at:'2026-08-01',registrations:[
 {...simultaneous.registrations![0],registeredAt:'2026-08-01'},
 {...simultaneous.registrations![1],registeredAt:'2026-10-17'}
]}]);
assert.equal(reportRows.length,2,'one student registering two subjects counts twice');
assert.notEqual(reportRows[0].registrationKey,reportRows[1].registrationKey);
assert.equal(reportRows.filter(row=>row.created_at==='2026-10-17').length,1,'new subject uses its own registration date');
console.log('PASS: independent subjects, transfer, withdrawal, conflicts, mapper round trip');
