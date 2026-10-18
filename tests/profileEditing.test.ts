import assert from 'node:assert/strict';
import type {ClassItem,TeacherProfile,StudentRecord,TimeSlotItem} from '../src/types';
import {studentStudyEditIssue,teacherStudyEditIssue,teacherScheduleEditIssue} from '../src/lib/profileEditing';
import {updateStudentRegistration} from '../src/lib/studentRegistrations';
import {canEditTeacherAvailability} from '../src/lib/teacherAvailability';
const cls={id:'C1',code:'CLASS',teacherId:'T1',subject:'MATH',categoryId:'PRIMARY',grade:'G3',model:'1-3',schedule:'T2 (18:00 - 19:30)',status:'Đang học'} as ClassItem;
const teacher={id:'T1',user_id:'U1',name:'Old name',phone:'0900',email:'old@example.com',subject:'MATH',levelId:'PRIMARY',grades:['G3'],models:['1-3'],schedule:{SLOT:['busy','none','none','none','none','none','none']}} as unknown as TeacherProfile;
assert.equal(teacherStudyEditIssue(teacher,{...teacher,name:'New name',phone:'0901'},[cls]),undefined);
assert.match(teacherStudyEditIssue(teacher,{...teacher,subject:'ENGLISH'},[cls])!,/phân công/);
assert.match(teacherStudyEditIssue(teacher,{...teacher,grades:['G4']},[cls])!,/phân công/);
assert.equal(teacherStudyEditIssue(teacher,{...teacher,grades:['G3','G4']},[cls]),undefined);
const slot={id:'SLOT-ID',code:'SLOT',timeRange:'18:00 - 19:30'} as TimeSlotItem;
assert.match(teacherScheduleEditIssue(teacher,{...teacher,schedule:{SLOT:['free','none','none','none','none','none','none']}},[cls],[slot])!,/đã gắn/);
assert.equal(teacherScheduleEditIssue(teacher,{...teacher,schedule:{SLOT:['busy','free','none','none','none','none','none']}},[cls],[slot]),undefined);
const student={id:'S1',name:'Old student',grade:'G3',subject:'MATH',model:'1-3',level:'L1',status:'Đang học',scheduleSlots:[],registrations:[
 {subject:'MATH',model:'1-3',level:'L1',status:'Đang học',currentClassCode:'CLASS',scheduleSlots:['T2 (18:00 - 19:30)']},
 {subject:'ENGLISH',model:'1-1',level:'L2',status:'Chờ xếp lớp',scheduleSlots:[]},
]} as StudentRecord;
assert.equal(studentStudyEditIssue(student,{...student,name:'New student',fatherPhone:'0901'}),undefined);
assert.match(studentStudyEditIssue(student,updateStudentRegistration(student,{subject:'MATH',model:'1-1'}))!,/Chờ xếp lớp/);
assert.equal(studentStudyEditIssue(student,updateStudentRegistration(student,{subject:'ENGLISH',model:'1-3'})),undefined);
assert.match(studentStudyEditIssue(student,{...student,grade:'G4'})!,/đăng ký môn/);
const released=updateStudentRegistration(student,{subject:'MATH',status:'Chờ xếp lớp',currentClassCode:undefined});
assert.match(studentStudyEditIssue(student,released)!,/Dừng hoạt động lớp/);
assert.equal(studentStudyEditIssue(student,released,[{...cls,studentIds:[],status:'Dừng lớp'}]),undefined);
assert.equal(studentStudyEditIssue(released,updateStudentRegistration(released,{subject:'MATH',model:'1-1'})),undefined);
assert.match(studentStudyEditIssue(student,updateStudentRegistration(student,{subject:'MATH',status:'Chờ xếp lớp',currentClassCode:undefined,model:'1-1'}))!,/Dừng hoạt động lớp/);
assert.equal(canEditTeacherAvailability({id:'U1',status:'active',name:'Different name',email:'new@example.com'} as any,teacher),true);
assert.equal(canEditTeacherAvailability({id:'OTHER',status:'active',email:'old@example.com'} as any,teacher),false);
console.log('PASS: personal edits, enrolled subject lock, separate wait-then-edit, independent subjects, assigned slot lock, stable teacher-account identity');

const boundClass={...cls,studentIds:['S1']};
const withExtra=updateStudentRegistration(student,{subject:'MATH',scheduleSlots:['T2 (18:00 - 19:30)','T3 (18:00 - 19:30)']});
assert.equal(studentStudyEditIssue(student,withExtra,[boundClass]),undefined);
assert.equal(studentStudyEditIssue(withExtra,updateStudentRegistration(withExtra,{subject:'MATH',scheduleSlots:['T2 (18:00 - 19:30)','T4 (18:00 - 19:30)']}),[boundClass]),undefined);
assert.match(studentStudyEditIssue(withExtra,updateStudentRegistration(withExtra,{subject:'MATH',scheduleSlots:['T3 (18:00 - 19:30)']}),[boundClass])!,/CLASS.*Dừng hoạt động lớp/);
assert.equal(studentStudyEditIssue(student,updateStudentRegistration(student,{subject:'ENGLISH',scheduleSlots:['T2 (18:00 - 19:30)']}),[boundClass]),undefined);
assert.equal(studentStudyEditIssue(student,updateStudentRegistration(student,{subject:'MATH',scheduleSlots:[]}),[{...boundClass,status:'Dừng lớp'}]),undefined);
console.log('PASS: active students can add/remove unrelated availability and register another subject; only occupied slot removal requires class stop');
