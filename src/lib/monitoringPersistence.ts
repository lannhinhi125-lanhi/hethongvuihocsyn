import { setBusinessValue } from './businessPersistence';
import type { MonitoringSession } from '../views/Module5_OperationsMonitoring';
import type { ClassItem, TeacherProfile, TimeSlotItem, IncidentCategory } from '../types';
import type { MonitoringSessionState } from './sessionAlerts';
type Row=Record<string,any>;
export function sessionTeacherIds(session:Pick<MonitoringSession,'primaryTeacherId'|'coverTeacherId'>,existing:Row|undefined,cls:ClassItem,teachers:TeacherProfile[]){
 const primaryTeacherId=existing?.primaryTeacherId||session.primaryTeacherId||cls.teacherId;
 const coverTeacherId=session.coverTeacherId||null;
 if(!teachers.some(t=>t.id===primaryTeacherId)||coverTeacherId&&!teachers.some(t=>t.id===coverTeacherId))throw new Error('Mã giáo viên của buổi học không hợp lệ.');
 return {primaryTeacherId,coverTeacherId};
}
export function storedMonitoringSession(base:MonitoringSession,lessons:Row[],incidents:Row[],classes:ClassItem[],teachers:TeacherProfile[],slots:TimeSlotItem[],categories:IncidentCategory[],users:{id:string;name:string}[]=[]):MonitoringSession{
 const cls=classes.find(c=>c.code===base.classCode),slot=slots.find(s=>s.timeRange.replace(/\s/g,'')===base.timeSlot.replace(/\s/g,''));
 const lesson=lessons.find(l=>l.id===base.sessionCode)||lessons.find(l=>l.classId===cls?.id&&l.date===base.sessionDate&&l.timeSlotId===slot?.id);if(!lesson)return base;
 const incident=incidents.filter(i=>i.lessonId===lesson.id).sort((a,b)=>String(b.reportedAt||'').localeCompare(String(a.reportedAt||''))||String(b.id).localeCompare(String(a.id)))[0];
 return {...base,sessionCode:lesson.id,displayCode:lesson.displayCode,room:lesson.roomUrl||'Chưa gán phòng',roomUrl:lesson.roomUrl||'',checkinTime:lesson.checkinAt?new Date(lesson.checkinAt).toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok'}):null,attendance:lesson.teacherAttendance||'ABSENT',
 checkinAt:lesson.checkinAt||null,checkoutAt:lesson.checkoutAt||null,
 hasPersistedStatus:true,feedbackProgress:lesson.feedbackProgress,
 status:['HOAN_THANH','DA_HOC_CU','DAY_THAY_CU'].includes(lesson.status)?'DA_HOC':['HUY','NGHI_HOC'].includes(lesson.status)?'NGHI_HOC':lesson.status as MonitoringSessionState,
 primaryTeacherId:lesson.primaryTeacherId,primaryTeacher:teachers.find(t=>t.id===lesson.primaryTeacherId)?.name||base.primaryTeacher,
 coverTeacherId:lesson.coverTeacherId||null,coverTeacher:teachers.find(t=>t.id===lesson.coverTeacherId)?.name||null,recordingUrl:lesson.recordingUrl||null,lessonDiary:lesson.diary||'',
 fromClassPause:!!incident?.fromClassPause,pausedByClass:lesson.pausedByClass,pauseCategoryId:lesson.pauseCategoryId,pauseReason:lesson.pauseReason,pauseNote:lesson.pauseNote,
 hasIncident:!!incident,incidentParent:(categories.find(c=>c.id===incident?.categoryId)?.code||null) as MonitoringSession['incidentParent'],incidentChild:incident?.incidentCode||null,
 incidentUrgency:incident?.urgency||null,incidentStatus:incident?.status||null,incidentNote:incident?.content||'',appliedCreditCoeff:incident?.appliedCreditCoeff??null,handledByOpsId:incident?.handledBy||null,handledByName:users.find(user=>user.id===incident?.handledBy)?.name||null,handledAt:incident?.handledAt||null};
}
export function persistMonitoringChanges(previous:MonitoringSession[],next:MonitoringSession[],lessons:Row[],incidentRows:Row[],classes:ClassItem[],teachers:TeacherProfile[],slots:TimeSlotItem[],categories:IncidentCategory[],userId:string){
 let updatedLessons=[...lessons],updatedIncidents=[...incidentRows];
 for(const session of next){
  const old=previous.find(s=>s.sessionCode===session.sessionCode);if(!old)continue;
  const clean=({isJustUpdated,...v}:MonitoringSession)=>v;if(JSON.stringify(clean(old))===JSON.stringify(clean(session)))continue;
  const cls=classes.find(c=>c.code===session.classCode),slot=slots.find(s=>s.timeRange.replace(/\s/g,'')===session.timeSlot.replace(/\s/g,''));
  if(!cls?.teacherId||!slot)throw new Error('Ca học cần có giáo viên và khung giờ thuộc danh mục trước khi lưu.');
  const existing=updatedLessons.find(l=>l.id===session.sessionCode);
  if(!existing || existing.classId!==cls.id)throw new Error('Buổi học không còn tồn tại. Hãy tải lại dữ liệu trước khi cập nhật giám sát.');
  const id=existing.id;
  const checkinChanged=session.checkinTime!==old.checkinTime || session.checkinAt!==old.checkinAt;
  const checkoutChanged=session.checkoutAt!==old.checkoutAt;
  const checkin=checkinChanged
   ? session.checkinAt!==old.checkinAt ? session.checkinAt||null : session.checkinTime?session.sessionDate+'T'+session.checkinTime+'+07:00':null
   : existing.checkinAt;
  const {primaryTeacherId,coverTeacherId}=sessionTeacherIds({...session,coverTeacherId:session.coverTeacherId===old.coverTeacherId?existing.coverTeacherId:session.coverTeacherId},existing,cls,teachers);
  const lesson:Row={...existing,primaryTeacherId,coverTeacherId};
  if(session.roomUrl!==old.roomUrl)lesson.roomUrl=session.roomUrl;
  if(session.status!==old.status)lesson.status=session.status;
  if(checkinChanged){lesson.checkinAt=checkin;lesson.checkinUserId=checkin?userId:null;}
  if(checkoutChanged){lesson.checkoutAt=session.checkoutAt||null;lesson.checkoutUserId=session.checkoutAt?userId:null;}
  if(session.attendance!==old.attendance)lesson.teacherAttendance=session.attendance;
  if(session.lessonDiary!==old.lessonDiary)lesson.diary=session.lessonDiary;
  if(session.recordingUrl!==old.recordingUrl)lesson.recordingUrl=session.recordingUrl;
  updatedLessons=[...updatedLessons.filter(l=>l.id!==id),lesson];
  const incidentChanged=['hasIncident','incidentParent','incidentChild','incidentUrgency','incidentStatus','incidentNote','handledAt'].some(key=>(session as Row)[key]!==(old as Row)[key]);
  if(session.hasIncident && incidentChanged){
   const category=categories.find(c=>c.code===session.incidentParent);const item=category?.subIncidents.find(i=>i.code===session.incidentChild);
   if(!category||!item)throw new Error('Loại sự cố không còn trong danh mục.');
   const incident=updatedIncidents.filter(i=>i.lessonId===id).sort((a,b)=>String(b.reportedAt||'').localeCompare(String(a.reportedAt||''))||String(b.id).localeCompare(String(a.id)))[0];
   const row={...(incident||{}),id:incident?.id||'INC-'+id,lessonId:id,categoryId:category.id,incidentCode:item.code,incidentName:item.name,urgency:session.incidentUrgency,content:session.incidentNote,status:session.incidentStatus||'DANG_XU_LY',reportedBy:incident?.reportedBy||userId,handledBy:userId,
    reportedAt:incident?.reportedAt||new Date().toISOString(),handledAt:new Date().toISOString()};
   updatedIncidents=[...updatedIncidents.filter(i=>i.id!==row.id),row];
  }
 }
 setBusinessValue('dated_lessons',updatedLessons);setBusinessValue('lesson_incidents',updatedIncidents);
}
