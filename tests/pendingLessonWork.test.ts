import assert from 'node:assert/strict';
import {pendingLessonWork,lessonWorkDetails} from '../src/lib/pendingLessonWork';
import {canDisputeTeacherWork} from '../src/lib/teacherWorkReconciliation';
import {workCreditBreakdown,workHandoffRows} from '../src/lib/workCredits';
import type {ClassItem,StudentRecord,TeacherProfile,TimeSlotItem,SessionPayrollRecord,TeacherPayrollSummary} from '../src/types';
import type {TeachingLesson} from '../src/lib/teachingSessionDetails';
const lesson:TeachingLesson={id:'B1',classId:'C1',date:'2026-10-12',timeSlotId:'T',primaryTeacherId:'G1',status:'DA_HOC',startsAt:'2026-10-12T18:00:00+07:00',endsAt:'2026-10-12T19:00:00+07:00',checkinAt:'2026-10-12T17:59:00+07:00',checkoutAt:'2026-10-12T19:00:00+07:00',feedbackProgress:{total:2,completed:1,state:'CHUA_DU',studentIds:['S1','S2']}};
const context={classes:[{id:'C1',code:'CLASS',name:'Class',model:'1-3'}] as ClassItem[],teachers:[{id:'G1',name:'Teacher'},{id:'G2',name:'Cover'}] as TeacherProfile[],students:[{id:'S1',name:'A'},{id:'S2',name:'B'}] as StudentRecord[],slots:[{id:'T',timeRange:'18:00 - 19:00'}] as TimeSlotItem[],month:'2026-10',now:new Date('2026-10-18T12:00:00+07:00')};
const derive=(lessons:TeachingLesson[],credited:SessionPayrollRecord[]=[])=>pendingLessonWork({...context,lessons,credited});
const pending=derive([lesson]);
assert.equal(pending.length,1);assert.equal(pending[0].id,'B1');assert.equal(pending[0].creditCoeff,null);
assert.equal(pending[0].lessonStatus,lesson.status);assert.deepEqual(pending[0].feedbackProgress,lesson.feedbackProgress);
assert.equal(pending[0].checkin,'17:59:00');assert.equal(pending[0].checkout,'19:00:00');
assert.equal(canDisputeTeacherWork({...pending[0],reconciliationSent:true},false,true,true,[]),false);
const credited={...pending[0],isPendingCredit:undefined,creditCoeff:0.75} as SessionPayrollRecord;
assert.equal(derive([lesson],[credited]).length,0,'same lesson/teacher replaces pending with credited row');
assert.equal(derive([{...lesson,coverTeacherId:'G2'}],[credited]).length,1,'original teacher incident must not hide the substitute lesson');
for(const change of [{status:'CHUA_HOAN_TAT'},{status:'NGHI_HOC'},{status:'DANG_HOC'},{checkoutAt:null},{date:'2026-11-01'},{checkoutAt:'2026-10-20T19:00:00+07:00'},{feedbackProgress:{...lesson.feedbackProgress!,completed:2}}]){
 assert.equal(derive([{...lesson,...change}]).length,0);
}
assert.deepEqual(workCreditBreakdown([...pending,credited]),{standardCredit:0.75,incidentCredit:0});
const handoff=workHandoffRows([{teacherId:'G1',sessions:[...pending,credited]} as TeacherPayrollSummary])[0];
assert.equal(handoff.sessions.length,1);assert.equal(handoff.totalCredit,0.75);
const annotated=lessonWorkDetails([credited],[{...lesson,feedbackProgress:{...lesson.feedbackProgress!,completed:2}}]);
assert.equal(annotated[0].creditCoeff,0.75);assert.equal(annotated[0].feedbackProgress?.completed,2);
assert.equal(lesson.feedbackProgress?.completed,1,'source objects remain untouched');
console.log('PASS: source status/progress, no duplicate lesson-teacher rows, no pending credit/disputes/handoff, completed-only visibility');
