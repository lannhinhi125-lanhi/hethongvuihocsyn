import assert from 'node:assert/strict';
import {matchesDashboardSelection,dashboardDisputes,dashboardDisputeMonth,type DashboardSelection} from '../src/lib/dashboardNavigation';
import type {MonthPayrollData} from '../src/types';
import {workbenchData,type WorkbenchLesson} from '../src/lib/workbench';

const range={start:'2026-08-15',end:'2026-10-05'};
const payroll=Object.fromEntries(['07','08','09','10','11'].map(month=>[`2026-${month}`,{
 disputes:[{id:`pending-${month}`,status:'CHO_DUYET'},{id:`done-${month}`,status:'DA_DUYET'}]
}])) as unknown as Record<string,MonthPayrollData>;
const pending=dashboardDisputes(payroll,range).filter(d=>d.status==='CHO_DUYET').map(d=>d.id);
assert.deepEqual(pending,['pending-08','pending-09','pending-10']);
const selection:DashboardSelection={module:7,tab:'disputes',label:'Pending',range,ids:pending};
assert.deepEqual(dashboardDisputes(payroll,range,selection.ids).map(d=>d.id),pending);
assert.equal(dashboardDisputeMonth(payroll,{id:'pending-08'},'2026-10'),'2026-08','approval targets the source period, not the last selected month');
assert.deepEqual(dashboardDisputes(payroll,range,[]),[],'zero pending disputes must not open an unfiltered list');
assert.equal(matchesDashboardSelection({...selection,ids:[]},'pending-10'),false);
assert.equal(matchesDashboardSelection(null,'anything'),true);
assert.equal(matchesDashboardSelection(selection,'pending-11'),false);
// Refreshing the source preserves the chosen IDs but also reflects updated states.
payroll['2026-08'].disputes[0].status='DA_DUYET';
assert.deepEqual(dashboardDisputes(payroll,range,pending).filter(d=>d.status==='CHO_DUYET').map(d=>d.id),['pending-09','pending-10']);

const lessons=[
 {id:'done',classId:'c1',date:'2026-09-01',timeSlotId:'s',status:'DA_HOC',checkinAt:'2026-09-01T10:00:00+07:00',checkoutAt:'2026-09-01T11:00:00+07:00'},
 {id:'outside',classId:'c2',date:'2026-07-01',timeSlotId:'s'},
 {id:'future',classId:'c3',date:'2026-10-01',timeSlotId:'s'}
] as WorkbenchLesson[];
const data=workbenchData([],[],[],lessons,[],{},[{id:'s',timeRange:'10:00 - 11:00'}],new Date('2026-09-15T12:00:00+07:00'),range);
const lessonSelection:DashboardSelection={module:5,tab:'diary',label:'Completed',range,ids:data.periodLessons.filter(row=>row.state==='DA_HOC').map(row=>row.lesson.id)};
assert.deepEqual(lessons.filter(lesson=>matchesDashboardSelection(lessonSelection,lesson.id)).map(l=>l.id),['done']);
console.log('PASS dashboard selection: exact/empty lists, custom range, cross-month disputes, source-period approval and refresh');
