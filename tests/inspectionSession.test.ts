import assert from 'node:assert/strict';
import { inspectionSession, isCompletedInspectionLesson } from '../src/lib/inspectionSession';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';
import type { ClassItem } from '../src/types';
import type { TeachingLesson } from '../src/lib/teachingSessionDetails';

const classes = [{id:'C1',code:'MATH',name:'Math class',grade:'Lớp 4',model:'1-3',maxStudents:3,
  roomLink:'room',schedule:'T2 (18:00 - 19:00), T5 (19:00 - 20:00)'}] as ClassItem[];
const slots = [{id:'S1',timeRange:'18:00 - 19:00'},{id:'S2',timeRange:'19:00 - 20:00'}];
const lessons: TeachingLesson[] = [
  {id:'MATH-2026-10-15-2',classId:'C1',date:'2026-10-15',timeSlotId:'S2',title:'Lesson two',primaryTeacherId:'T1',coverTeacherId:'T2',
    status:'DA_HOC',feedbackProgress:{total:2,completed:2,state:'COMPLETED',studentIds:['A','B']}},
  {id:'UUID-other-week',classId:'C1',date:'2026-10-22',timeSlotId:'S2',title:'Next week',primaryTeacherId:'T1',
    inspectionData:{sessionNum:4,studentIds:['OLD'],attendance:{OLD:'absent'},feedback:{OLD:'Historical feedback'}}},
];
const before = structuredClone({classes,lessons,slots});
for (const status of ['CHUA_DIEN_RA','CHUA_HOC','DANG_HOC','CHUA_HOAN_TAT','NGHI_HOC',undefined]) {
  assert.equal(isCompletedInspectionLesson({...lessons[0],status}),false,`Exclude ${status}`);
}
assert.equal(isCompletedInspectionLesson(lessons[0]),true);
assert.equal(isCompletedInspectionLesson({...lessons[0],status:'HOAN_THANH'}),true);
const result = inspectionSession('MATH-2026-10-15-2',classes,lessons,slots)!;
assert.equal(result.cls.code,'MATH');
assert.equal(result.cls.name,'Math class');
assert.equal(result.sessionNum,2);
assert.equal(result.session.name,'Lesson two');
assert.equal(result.session.slot,'19:00 - 20:00');
assert.equal(result.session.students,'2 HS');
assert.equal(result.lesson.coverTeacherId,'T2');
assert.equal(inspectionSession(lessons[0].id!,classes,[{...lessons[0],startsAt:'2026-10-15T12:15:00Z',endsAt:'2026-10-15T13:15:00Z'}],slots)?.session.slot,'19:15 - 20:15');
assert.equal(inspectionSession('UUID-other-week',classes,lessons,slots)?.sessionNum,4);
assert.equal(inspectionSession('UUID-other-week',[{...classes[0],schedule:'T3 (12:00 - 13:00)'}],lessons,slots)?.sessionNum,4);
assert.deepEqual(inspectionSession('UUID-other-week',classes,lessons,slots)?.lesson.inspectionData?.attendance,{OLD:'absent'});
assert.equal(inspectionSession('UUID-other-week',classes,[{...lessons[1],inspectionData:undefined}],slots)?.sessionNum,undefined);
assert.equal(inspectionSession('missing',classes,lessons,slots),undefined);
assert.equal(inspectionSession('MATH-2026-10-15-2',classes,lessons,[]),undefined);
assert.deepEqual({classes,lessons,slots},before,'Viewing must never mutate lesson/class data');
const teacher = fromSupabaseRow('teachers', {madinhdanh:'T2',trangthaidanhgia:'UNSCORED',baocaodanhgia:[{status:'DA_DUYET',overallScore:9,generalComment:'Good',criteriaScores:{tc1:9,tc2:9,tc3:9}}]});
assert.equal(teacher.evalStatus,'SCORED');
assert.equal(teacher.evalScore,'9.00');
const unscored = fromSupabaseRow('teachers',{madinhdanh:'T2',trangthaidanhgia:'SCORED',diemdanhgia:'9.0',nhanxetdanhgia:'Stale seed',baocaodanhgia:[]});
assert.equal(unscored.evalStatus,'UNSCORED');
assert.equal(unscored.evalScore,null);
assert.equal(unscored.evalComment,'');
const approved=fromSupabaseRow('teachers',{madinhdanh:'T2',baocaodanhgia:[
 {id:'draft',status:'NHAP',evaluationDate:'31/12/2026',overallScore:10},
 {id:'old',status:'DA_DUYET',evaluationDate:'30/09/2026',overallScore:8},
 {id:'new',status:'DA_DUYET',evaluationDate:'02/10/2026',overallScore:9,generalComment:'Approved',criteriaScores:{tc1:9,tc2:9,tc3:9}}
]});
assert.equal(approved.evalScore,'9.00');
assert.equal(approved.evalComment,'Approved');
const encoded=toSupabaseRow('teachers',approved);
assert.ok(!['trangthaidanhgia','diemdanhgia','nhanxetdanhgia','diemtieuchi'].some(key=>Object.hasOwn(encoded,key)));
assert.equal(fromSupabaseRow('teachers',{madinhdanh:'T2',baocaodanhgia:[{status:'NHAP',overallScore:10}]}).evalStatus,'UNSCORED');
const queriedSlots=fromSupabaseRow('teachers',{madinhdanh:'T2',socaranh:3,socadaxep:2,dakinlich:false});
assert.deepEqual([queriedSlots.freeSlots,queriedSlots.busySlots,queriedSlots.isFull],[3,2,false]);
assert.deepEqual(toSupabaseRow('teachers',queriedSlots),{madinhdanh:'T2'},'query totals remain visible but cannot be sent as stored profile fields');
const countedRole=fromSupabaseRow('role_groups',{madinhdanh:'ROLE',soluongnguoidung:4});
assert.equal(countedRole.userCount,4);
assert.deepEqual(toSupabaseRow('role_groups',countedRole),{madinhdanh:'ROLE'},'account counts are query results, not stored role inputs');
const saved = toSupabaseRow('teacher_evaluations', {id:'E1',lessonId:result.lesson.id,teacherId:'T2',classCode:result.cls.code,
  className:result.cls.name,sessionNum:result.sessionNum,timeSlot:result.session.slot,sessionDate:result.lesson.date});
assert.equal(saved.mabuoi,'MATH-2026-10-15-2');
assert.equal(saved.malophoc,'MATH');
assert.equal(saved.sobuoi,2);
assert.equal(saved.khunggio,'19:00 - 20:00');
console.log('Passed: exact dated lesson, actual class/slot/roster, cover and read-only lookup.');
