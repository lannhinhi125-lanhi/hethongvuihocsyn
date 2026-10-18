import assert from 'node:assert/strict';
import {workbenchData,type WorkbenchLesson} from '../src/lib/workbench';
import type {TeacherProfile} from '../src/types';
const date='2026-10-18';
const base={classId:'C',date,timeSlotId:'S',primaryTeacherId:'T'};
const lessons:WorkbenchLesson[]=[
 {...base,id:'no-checkin',status:'CHUA_DIEN_RA'},
 {...base,id:'no-checkout',checkinAt:date+'T10:00:00+07:00'},
 {...base,id:'early',status:'DA_HOC',checkinAt:date+'T10:00:00+07:00',checkoutAt:date+'T10:50:00+07:00'},
 {...base,id:'within-tolerance',status:'DA_HOC',checkinAt:date+'T10:00:00+07:00',checkoutAt:date+'T10:55:00+07:00'},
 {...base,id:'cancelled',status:'NGHI_HOC'},
 {...base,id:'future',date:'2026-10-19'}
];
const data=workbenchData([],[],[],lessons,[],{},[{id:'S',timeRange:'10:00 - 11:00'}],new Date(date+'T12:00:00+07:00'),{start:date,end:'2026-10-19'});
const warnings=data.periodLessons.filter(row=>row.reviewReason);
assert.deepEqual(warnings.map(row=>row.lesson.id).sort(),['early','no-checkin','no-checkout']);
assert.match(warnings.find(row=>row.lesson.id==='early')!.reviewReason,/10/);
assert.match(warnings.find(row=>row.lesson.id==='no-checkin')!.reviewReason,/check-in/);
assert.match(warnings.find(row=>row.lesson.id==='no-checkout')!.reviewReason,/checkout/);
assert.equal(data.days.reduce((n,day)=>n+day.warning,0),warnings.length);
assert.equal(data.periodLessons.find(row=>row.lesson.id==='within-tolerance')!.state,'DA_HOC');
const during=workbenchData([],[],[],[lessons[1]],[],{},[{id:'S',timeRange:'10:00 - 11:00'}],new Date(date+'T10:30:00+07:00'),{start:date,end:date});
assert.equal(during.periodLessons[0].reviewReason,'','ongoing lessons without checkout are not warnings');
console.log('PASS: review reasons match chart totals; early threshold, missing check-in/out, ongoing, future and cancelled lessons');
const assigned=workbenchData([],[],[{id:'T',name:'Teacher'}] as TeacherProfile[],lessons,[],{},[{id:'S',timeRange:'10:00 - 11:00'}],new Date(date+'T12:00:00+07:00'),{start:date,end:'2026-10-19'}).workload[0];
assert.equal(assigned.count,5,'cancelled lessons excluded from assignment list');
assert.equal(assigned.review,3);
assert.equal(assigned.completed,1);
