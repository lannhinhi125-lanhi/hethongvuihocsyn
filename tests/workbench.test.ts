import assert from 'node:assert/strict';
import {workbenchData,localDay,type WorkbenchLesson} from '../src/lib/workbench';
import type {ClassItem,StudentRecord,TeacherProfile,MonthPayrollData} from '../src/types';
import {workbenchRange,shiftWorkbenchRange} from '../src/lib/workbenchTime';
import {workbenchAnalytics} from '../src/lib/workbenchAnalytics';
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
assert.equal(data.workload.find(t=>t.id==='t2')?.completed,1);
assert.equal(data.workload.find(t=>t.id==='t2')?.cover,1);
assert.equal(data.workload.find(t=>t.id==='t1')?.completed,0);
assert.equal(data.workload.find(t=>t.id==='t1')?.cover,0);
assert.ok(data.workload.every((row,index)=>index===0||data.workload[index-1].count>=row.count),'teachers sorted from most assigned lessons to least');
assert.equal(data.waitingStudents,1,'one pupil with two pending subjects counted once');
assert.equal(data.unassignedClasses,1);assert.equal(data.missingMaterials,2);
assert.equal(data.pendingIncidents,1);assert.equal(data.pendingDisputes,1);assert.equal(data.missingFeedback,1);
assert.equal(localDay(new Date('2026-10-18T18:00:00Z')),'2026-10-19');
assert.equal(workbenchData([],[],[],[],[],{},[],now).todayLessons.length,0);
console.log('PASS: workbench week/date boundaries, live aggregates, cover ownership, cancelled sessions and distinct waiting pupils');
assert.deepEqual(workbenchRange('2026-10-18','week'),{start:'2026-10-12',end:'2026-10-18'});
assert.deepEqual(workbenchRange('2024-02-29','month'),{start:'2024-02-01',end:'2024-02-29'});
assert.deepEqual(shiftWorkbenchRange({start:'2026-12-01',end:'2026-12-31'},'month',1),{start:'2027-01-01',end:'2027-01-31'});
assert.deepEqual(shiftWorkbenchRange({start:'2026-10-12',end:'2026-10-18'},'week',1),{start:'2026-10-19',end:'2026-10-25'});
assert.deepEqual(shiftWorkbenchRange({start:'2026-10-12',end:'2026-10-14'},'custom',-1),{start:'2026-10-09',end:'2026-10-11'});
const range={start:'2026-10-20',end:'2026-10-20'};
const ranged=workbenchData(classes,students,teachers,lessons,[{status:'DANG_XU_LY',lessonId:'a'}],payroll,[{id:'slot',timeRange:'10:00 - 11:00'}],now,range);
assert.equal(ranged.periodLessons.length,1);assert.equal(ranged.periodLessons[0].lesson.id,'c');
assert.equal(ranged.pendingIncidents,0);assert.equal(ranged.missingFeedback,0);assert.equal(ranged.days.length,1);
const analytic=workbenchAnalytics(classes.map((c,i)=>({...c,subject:i%2?'ENG':'MATH',created_at:i===0?'2026-10-19':'2026-09-01'})),
 students.map((s,i)=>({...s,created_at:i===0?'2026-10-19':'2026-09-01'})),lessons,[{lessonId:'a'},{lessonId:'a'},{lessonId:'old'}],
 [{teacherId:'t1',evaluationDate:'19/10/2026',overallScore:9,status:'DA_DUYET'},
  {teacherId:'t1',evaluationDate:'19/10/2026',overallScore:8,status:'DA_DUYET'},
  {teacherId:'t2',evaluationDate:'19/10/2026',overallScore:10,status:'CHO_GOP_Y'},
  {teacherId:'t3',evaluationDate:'01/09/2026',overallScore:7,status:'DA_DUYET'}],{start:'2026-10-19',end:'2026-10-20'});
assert.equal(analytic.newStudents,1);assert.equal(analytic.newClasses,1);assert.equal(analytic.affected,1,'duplicate incidents on one lesson count once');
assert.equal(analytic.evaluationCount,2);assert.equal(analytic.evaluatedTeachers,1);assert.equal(analytic.averageScore,8.5);
assert.equal(analytic.ratings[1].count,1);assert.equal(analytic.growth.reduce((n,g)=>n+g.students,0),1);
console.log('PASS: shared day/week/month/custom ranges, leap/year boundaries, filtered queues and approved quality metrics');
