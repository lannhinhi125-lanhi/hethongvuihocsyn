import type {ClassItem,SessionPayrollRecord,StudentRecord,TeacherProfile,TimeSlotItem} from '../types';
import type {TeachingLesson} from './teachingSessionDetails';

export function lessonWorkStatus(status?:string){
 return ({DA_HOC:'Đã học',HOAN_THANH:'Đã học',DA_HOC_CU:'Đã học',DAY_THAY_CU:'Đã học',CHUA_HOAN_TAT:'Chưa hoàn tất',DANG_HOC:'Đang học',CHUA_HOC:'Chưa học',CHUA_DIEN_RA:'Chưa diễn ra',NGHI_HOC:'Nghỉ học',HUY:'Nghỉ học'} as Record<string,string>)[status||'']||status||'—';
}
export function lessonWorkDetails(rows:SessionPayrollRecord[],lessons:TeachingLesson[]):SessionPayrollRecord[]{
 const source=new Map(lessons.map(lesson=>[lesson.id,lesson]));
 return rows.map(row=>{const lesson=source.get(row.lessonId||row.id);return lesson?{...row,lessonStatus:lesson.status,feedbackProgress:lesson.feedbackProgress}:row;});
}
/** Read-only projection of completed source lessons, never persisted as payroll. */
export function pendingLessonWork({lessons,credited,classes,teachers,students,slots,month,now=new Date()}:{
 lessons:TeachingLesson[];credited:SessionPayrollRecord[];classes:ClassItem[];teachers:TeacherProfile[];students:StudentRecord[];slots:TimeSlotItem[];month:string;now?:Date;
}):SessionPayrollRecord[]{
 const existing=new Set(credited.map(row=>JSON.stringify([row.lessonId||row.id,row.teacherId])));
 const clock=(value?:string|null)=>value?new Date(value).toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok'}):'--';
 return lessons.flatMap(lesson=>{
  const teacherId=lesson.coverTeacherId||lesson.primaryTeacherId;
  const progress=lesson.feedbackProgress;
  if(!lesson.id||!teacherId||lesson.date.slice(0,7)!==month||!lesson.checkinAt||!lesson.checkoutAt||Date.parse(lesson.checkoutAt)>now.getTime()||
   !['DA_HOC','HOAN_THANH','DA_HOC_CU','DAY_THAY_CU'].includes(lesson.status||'')||!progress||progress.total<1||progress.completed>=progress.total||existing.has(JSON.stringify([lesson.id,teacherId])))return [];
  const cls=classes.find(row=>row.id===lesson.classId),teacher=teachers.find(row=>row.id===teacherId);
  if(!cls||!teacher)return [];
  const names=progress.studentIds.map(id=>students.find(student=>student.id===id)?.name||id);
  return [{id:lesson.id,lessonId:lesson.id,teacherId,teacherName:teacher.name,staffRole:'GIAO_VIEN',staffRoleName:'Giáo viên',
   date:lesson.date,dateStr:lesson.date.split('-').reverse().join('/'),dayOfWeek:new Date(lesson.date+'T12:00:00+07:00').toLocaleDateString('vi-VN',{weekday:'long',timeZone:'Asia/Bangkok'}),week:'Tuần '+Math.ceil(Number(lesson.date.slice(8))/7),
   time:slots.find(row=>row.id===lesson.timeSlotId)?.timeRange||'',classCode:cls.code,className:cls.name,model:cls.model,
   studentName:names.join(', '),studentNames:names,studentCount:progress.total,durationMinutes:lesson.startsAt&&lesson.endsAt?(Date.parse(lesson.endsAt)-Date.parse(lesson.startsAt))/60000:undefined,
   type:lesson.coverTeacherId?'COVER':'STANDARD',statusText:lessonWorkStatus(lesson.status),lessonStatus:lesson.status,feedbackProgress:progress,
   checkin:clock(lesson.checkinAt),checkout:clock(lesson.checkoutAt),hasAiReview:progress.completed>0,creditCoeff:null,hrPayNote:'',dispute:null,reconciliationSent:false,isPendingCredit:true} as SessionPayrollRecord];
 });
}
