import type {ClassItem,StudentRecord,TeacherProfile,MonthPayrollData} from '../types';
import {studentRegistrations} from './studentRegistrations';
import {monitoringSessionStatus} from './sessionAlerts';
import {materialForSessionDate} from './teacherScheduleMaterials';
import {teachingScheduleEntries} from './teachingSessionDetails';

export interface WorkbenchLesson {
 id:string;classId:string;date:string;timeSlotId:string;startsAt?:string;endsAt?:string;
 primaryTeacherId?:string;coverTeacherId?:string|null;status?:string;checkinAt?:string|null;checkoutAt?:string|null;
 feedbackProgress?:{state:string;total:number;completed:number};
 materials?:{slide?:string;lms?:string;materialGv?:string;exerciseLms?:string};
}
export const localDay=(now:Date)=>new Date(now.getTime()+7*60*60_000).toISOString().slice(0,10);
export function workbenchData(classes:ClassItem[],students:StudentRecord[],teachers:TeacherProfile[],lessons:WorkbenchLesson[],
 incidents:{status?:string}[],payroll:Record<string,MonthPayrollData>,slots:{id:string;timeRange:string}[],now:Date) {
 const today=localDay(now);
 const monday=new Date(today+'T12:00:00+07:00');monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const weekStart=localDay(monday),weekEnd=localDay(new Date(monday.getTime()+6*86400000));
 const time=(lesson:WorkbenchLesson)=>slots.find(slot=>slot.id===lesson.timeSlotId)?.timeRange || '';
 const state=(lesson:WorkbenchLesson)=>['DA_HOC_CU','DAY_THAY_CU'].includes(lesson.status||'')?'DA_HOC':monitoringSessionStatus({sessionDate:lesson.date,timeSlot:time(lesson),status:lesson.status==='HOAN_THANH'?'DA_HOC':lesson.status,checkinAt:lesson.checkinAt,checkoutAt:lesson.checkoutAt},now);
 const todayLessons=lessons.filter(l=>l.date===today).map(l=>({lesson:l,state:state(l),time:time(l),
  className:classes.find(c=>c.id===l.classId)?.name||l.classId,
  teacherName:teachers.find(t=>t.id===(l.coverTeacherId||l.primaryTeacherId))?.name||'Chưa phân công'
 })).sort((a,b)=>(a.lesson.startsAt||a.time).localeCompare(b.lesson.startsAt||b.time));
 const weekly=lessons.filter(l=>l.date>=weekStart&&l.date<=weekEnd);
 const days=Array.from({length:7},(_,i)=>{
  const date=localDay(new Date(monday.getTime()+i*86400000));
  const rows=weekly.filter(l=>l.date===date);
  const counts={done:0,warning:0,upcoming:0,cancelled:0};
  for(const l of rows){const s=state(l);if(s==='DA_HOC')counts.done++;else if(s==='NGHI_HOC')counts.cancelled++;
   else if(['CHUA_HOC','CHUA_HOAN_TAT'].includes(s))counts.warning++;else counts.upcoming++;}
  return {date,label:i===6?'CN':'T'+(i+2),total:rows.length,...counts};
 });
 const missingMaterials=new Set(weekly.filter(l=>{
  if(state(l)==='NGHI_HOC')return false;
  const cls=classes.find(c=>c.id===l.classId);if(!cls)return false;
  const day=new Date(l.date+'T12:00:00+07:00').getUTCDay();
  const entry=teachingScheduleEntries(cls).find(e=>e.dayIndex===(day+6)%7&&e.time.replace(/\s/g,'')===time(l).replace(/\s/g,''));
  const material=entry?materialForSessionDate(cls.materials||[],entry.session,l.date):undefined;
  return ![l.materials?.slide,l.materials?.lms,l.materials?.materialGv,l.materials?.exerciseLms,material?.slide,material?.lms].some(v=>v?.trim());
 }).map(l=>l.classId));
 const workload=teachers.map(t=>({id:t.id,name:t.name,count:weekly.filter(l=>state(l)!=='NGHI_HOC'&&(l.coverTeacherId||l.primaryTeacherId)===t.id).length}))
  .filter(t=>t.count>0).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
 return {today,weekStart,weekEnd,todayLessons,days,workload,
  ongoing:todayLessons.filter(r=>r.state==='DANG_HOC').length,
  warnings:todayLessons.filter(r=>['CHUA_HOC','CHUA_HOAN_TAT'].includes(r.state)).length,
  pendingIncidents:incidents.filter(i=>i.status==='DANG_XU_LY').length,
  pendingDisputes:Object.values(payroll).flatMap(p=>p.disputes||[]).filter(d=>d.status==='CHO_DUYET').length,
  waitingStudents:students.filter(s=>studentRegistrations(s).some(r=>r.status==='Chờ xếp lớp')).length,
  unassignedClasses:classes.filter(c=>!['Tạm dừng','Đã kết thúc'].includes(c.status||'')&&!c.teacherId).length,
  missingMaterials:missingMaterials.size,
  missingFeedback:lessons.filter(l=>state(l)!=='NGHI_HOC'&&l.checkoutAt&&l.feedbackProgress&&l.feedbackProgress.completed<l.feedbackProgress.total).length
 };
}
