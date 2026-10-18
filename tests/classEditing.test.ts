import assert from 'node:assert/strict';
import type {ClassItem} from '../src/types';
import {classBindingEditIssue,canKeepAssignedTeacher,nextClassTeacherSelection,studentsNeedingClassValidation,studentsNeedingScheduleValidation} from '../src/lib/classEditing';
import {studentForSubject,studentScheduleConflict} from '../src/lib/studentRegistrations';

const existing:ClassItem={id:'SEEDED-CLASS',code:'T-001',name:'Sample class',status:'Đang học',grade:'GRADE-3',subject:'MATH',
 level:'LEVEL-2',model:'1-3',maxStudents:3,teacherId:'SEEDED-TEACHER',teacherName:'Current teacher',
 studentIds:['S1','S2'],schedule:'T7 (12:50 - 13:50)',roomLink:'https://room.example',materials:[]};
const renamed={...existing,name:'Updated name',roomLink:'https://room.example/new'};
// Seeded or ongoing classes keep their existing assignments for metadata edits,
// even if the teacher has no current availability record or students' profiles changed.
assert.equal(canKeepAssignedTeacher(existing,renamed,'SEEDED-TEACHER'),true);
assert.deepEqual(studentsNeedingClassValidation(existing,renamed),[]);
assert.deepEqual(studentsNeedingScheduleValidation(existing,renamed),[]);
assert.equal(nextClassTeacherSelection('SEEDED-TEACHER',['OTHER','SEEDED-TEACHER'],true),'SEEDED-TEACHER');
assert.equal(nextClassTeacherSelection('SEEDED-TEACHER',['OTHER'],true),'');
assert.equal(nextClassTeacherSelection('',['OTHER'],false),'OTHER');
assert.equal(canKeepAssignedTeacher(undefined,renamed,'SEEDED-TEACHER'),false);
assert.equal(canKeepAssignedTeacher(existing,{...renamed,schedule:'T2 (12:50 - 13:50)'},'SEEDED-TEACHER'),false);
assert.equal(canKeepAssignedTeacher(existing,{...renamed,subject:'ENGLISH'},'SEEDED-TEACHER'),false);
assert.equal(canKeepAssignedTeacher(existing,{...renamed,grade:'GRADE-4'},'SEEDED-TEACHER'),false);
assert.equal(canKeepAssignedTeacher(existing,{...renamed,model:'1-1'},'SEEDED-TEACHER'),false);
assert.equal(canKeepAssignedTeacher(existing,renamed,'OTHER'),false);
assert.equal(canKeepAssignedTeacher(existing,{...renamed,schedule:'T7 (12:50-13:50)'},'SEEDED-TEACHER'),true);
assert.deepEqual(studentsNeedingClassValidation(existing,{...renamed,studentIds:['S1','S2','S3']}),['S3']);
assert.deepEqual(studentsNeedingScheduleValidation(existing,{...renamed,studentIds:['S1','S2','S3']}),['S3']);
assert.deepEqual(studentsNeedingClassValidation(existing,{...renamed,level:'LEVEL-3'}),['S1','S2']);
assert.deepEqual(studentsNeedingScheduleValidation(existing,{...renamed,schedule:'T2 (12:50 - 13:50)'}),['S1','S2']);
const other={...existing,id:'OTHER',subject:'ENGLISH'};
assert.equal(studentScheduleConflict('S1',existing,[existing,other]),true);
assert.deepEqual(studentsNeedingScheduleValidation(existing,renamed),[],'pre-existing conflict must not block a name edit');
const student={id:'S1',name:'Student',grade:'GRADE-3',subject:'ENGLISH',model:'1-1',level:'LEVEL-1',status:'Đang học' as const,
 fatherName:'',fatherPhone:'',motherName:'',motherPhone:'',scheduleSlots:[],registrations:[
  {subject:'ENGLISH',model:'1-1',level:'LEVEL-1',status:'Đang học' as const,scheduleSlots:[]},
  {subject:'MATH',model:'1-3',level:'LEVEL-2',status:'Chờ xếp lớp' as const,scheduleSlots:[]},
 ]};
assert.equal(studentForSubject(student,'MATH')?.model,'1-3','validate the enrollment for the class subject, not the first subject');
console.log('PASS: seeded/ongoing class metadata edits keep assignments; changed teaching/roster/schedule still require validation; no automatic teacher replacement');

assert.equal(classBindingEditIssue(existing,renamed),undefined);
assert.match(classBindingEditIssue(existing,{...existing,studentIds:['S1']})!,/Dừng hoạt động lớp/);
assert.match(classBindingEditIssue(existing,{...existing,teacherId:'OTHER'})!,/Dừng hoạt động lớp/);
assert.match(classBindingEditIssue(existing,{...existing,schedule:'T2 (12:50 - 13:50)'})!,/Dừng hoạt động lớp/);
assert.equal(classBindingEditIssue(existing,{...existing,studentIds:['S1','S2','S3']}),undefined);
assert.equal(classBindingEditIssue(existing,{...existing,status:'Dừng lớp',studentIds:[]}),undefined);
assert.equal(classBindingEditIssue({...existing,status:'Dừng lớp'},{...existing,status:'Dừng lớp',schedule:'T2 (12:50 - 13:50)',teacherId:'OTHER',studentIds:[]}),undefined);
