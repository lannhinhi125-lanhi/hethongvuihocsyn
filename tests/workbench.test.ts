import assert from 'node:assert/strict';
import {workbenchData,localDay,type WorkbenchLesson} from '../src/lib/workbench';
import type {ClassItem,StudentRecord,TeacherProfile,MonthPayrollData} from '../src/types';
const classes=[{id:'c1',name:'Toán',teacherId:'t1',schedule:'T2 (10:00 - 11:00)',status:'Đang học',materials:[]},
 {id:'c2',name:'Anh',schedule:'T3 (10:00 - 11:00)',status:'Đang học',materials:[]},
 {id:'c3',name:'Dừng',status:'Tạm dừng',materials:[]}] as unknown as ClassItem[];
const teachers=[{id:'t1',name:'Giáo viên chính'},{id:'t2',name:'Giáo viên cover'}] as TeacherProfile[];
const students=[{id:'s1',status:'Đang học',registrations:[{status:'Chờ xếp lớp'},{status:'Chờ xếp lớp'}]},
 {id:'s2',status:'Bảo lưu'}] as StudentRecord[];
const lessons:WorkbenchLesson[]=[
 {id:'a',classId:'c1',date:'2026-10-19',timeSlotId:'slot',primaryTeacherId:'t1',coverTeacherId:'t2',status:'DA_HOC',checkinAt:'2026-10-19T09:59:00+07:00',checkoutAt:'2026-10-19T11:00:00+07:00',feedbackProgress:{state:'CHUA_DU',total:2,completed:1}},
 {id:'b',classId:'c1',date:'2026-10-19',timeSlotId:'slot',primaryTeacherId:'t1',status:'NGHI_HOC'},
 {id:'c',classId:'c2',date:'2026-10-20',timeSlotId:'slot',primaryTeacherId:'t1',status:'CHUA_DIEN_RA'},
 {id:'old',classId:'c1',date:'2026-10-12',timeSlotId:'slot',primaryTeacherId:'t1',status:'DA_HOC'}
];
const payroll={'2026-10':{disputes:[{status:'CHO_DUYET'},{status:'DA_DUYET'}]}} as unknown as Record<string,MonthPayrollData>;
const now=new Date('2026-10-19T12:00:00Z');
const data=workbenchData(classes,students,teachers,lessons,[{status:'DANG_XU_LY'},{status:'DA_GIAI_QUYET'}],payroll,[{id:'slot',timeRange:'10:00 - 11:00'}],now);
assert.equal(data.weekStart,'2026-10-19');assert.equal(data.weekEnd,'2026-10-25');
assert.equal(data.todayLessons.length,2);assert.equal(data.days.reduce((n,d)=>n+d.total,0),3);
assert.equal(data.days[0].done,1);assert.equal(data.days[0].cancelled,1);
assert.equal(data.workload.find(t=>t.id==='t2')?.count,1);assert.equal(data.workload.find(t=>t.id==='t1')?.count,1,'cover counted for actual teacher and cancelled excluded');
assert.equal(data.waitingStudents,1,'one pupil with two pending subjects counted once');
assert.equal(data.unassignedClasses,1);assert.equal(data.missingMaterials,2);
assert.equal(data.pendingIncidents,1);assert.equal(data.pendingDisputes,1);assert.equal(data.missingFeedback,1);
assert.equal(localDay(new Date('2026-10-18T18:00:00Z')),'2026-10-19');
assert.equal(workbenchData([],[],[],[],[],{},[],now).todayLessons.length,0);
console.log('PASS: workbench week/date boundaries, live aggregates, cover ownership, cancelled sessions and distinct waiting pupils');
