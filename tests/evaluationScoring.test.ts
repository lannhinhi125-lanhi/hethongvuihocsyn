import assert from 'node:assert/strict';
import { evaluationRating, weightedEvaluationScore, averageEvaluationScore } from '../src/lib/evaluationScoring';
import { completedLessonsForTeacher } from '../src/lib/inspectionSession';
import { inspectionReportRows } from '../src/lib/inspectionReport';
import type { TeachingLesson } from '../src/lib/teachingSessionDetails';

assert.equal(weightedEvaluationScore(8.5,8.8,9.1),8.8);
assert.equal(weightedEvaluationScore(8.5,8,9),8.38);
assert.equal(weightedEvaluationScore(11,8,8),null);
assert.equal(weightedEvaluationScore(NaN,8,8),null);
assert.equal(weightedEvaluationScore(0,0,0),0);
for(const [score,code,label] of [[9,'A','Xuất sắc'],[8.99,'B','Tốt'],[8,'B','Tốt'],[7.99,'C','Khá'],[7,'C','Khá'],[6.99,'D','Cần bồi dưỡng'],[0,'D','Cần bồi dưỡng']] as const){
 assert.deepEqual(evaluationRating(score),{code,label});
}
assert.equal(evaluationRating(null),null);
assert.equal(evaluationRating(NaN),null);
assert.equal(averageEvaluationScore([]),null);
assert.equal(averageEvaluationScore([{overallScore:null}]),null);
assert.equal(averageEvaluationScore([{overallScore:8.38},{overallScore:9.12}]),8.75);
const records=[{teacherId:'T1',evaluationDate:'2026-09-20',overallScore:9},{teacherId:'T1',evaluationDate:'2026-10-01',overallScore:6.8}];
const october=records.filter(record=>record.evaluationDate.startsWith('2026-10'));
assert.equal(averageEvaluationScore(october),6.8);
assert.equal(inspectionReportRows([{id:'T1',name:'An',subject:'MATH'}],records,[],{start:'2026-10-01',end:'2026-10-31'})[0].rankCode,'D');
const now=new Date('2026-10-17T12:00:00+07:00');
const lessons=[
 {id:'OLD',date:'2026-09-01',primaryTeacherId:'T1',status:'DA_HOC'},
 {id:'TODAY',date:'2026-10-17',primaryTeacherId:'T1',status:'DA_HOC',checkoutAt:'2026-10-17T11:00:00+07:00'},
 {id:'COVER',date:'2026-10-16',primaryTeacherId:'T2',coverTeacherId:'T1',status:'DA_HOC'},
 {id:'NOT-OWN',date:'2026-10-16',primaryTeacherId:'T1',coverTeacherId:'T2',status:'DA_HOC'},
 {id:'FUTURE',date:'2026-10-18',primaryTeacherId:'T1',status:'DA_HOC'},
 {id:'FUTURE-CHECKOUT',date:'2026-10-17',primaryTeacherId:'T1',status:'DA_HOC',checkoutAt:'2026-10-17T18:00:00+07:00'},
 {id:'LIVE',date:'2026-10-17',primaryTeacherId:'T1',status:'DANG_HOC'},
 {id:'MISSED',date:'2026-10-16',primaryTeacherId:'T1',status:'CHUA_HOC'},
 {id:'CANCELLED',date:'2026-10-16',primaryTeacherId:'T1',status:'NGHI_HOC'}
] as TeachingLesson[];
assert.deepEqual(completedLessonsForTeacher([...lessons,lessons[0]],'T1',now).map(lesson=>lesson.id),['OLD','TODAY','COVER']);
console.log('PASS: shared weighted score/grades; empty and filtered averages; completed-to-now counts; cover ownership; future/missed/cancelled excluded');
