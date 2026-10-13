import { setBusinessValue } from './businessPersistence';
import type { MonitoringSession } from '../views/Module5_OperationsMonitoring';
import type { ClassItem, TeacherProfile, TimeSlotItem, IncidentCategory } from '../types';
type Row=Record<string,any>;
export function storedMonitoringSession(base:MonitoringSession,lessons:Row[],incidents:Row[],classes:ClassItem[],teachers:TeacherProfile[],slots:TimeSlotItem[],categories:IncidentCategory[],users:{id:string;name:string}[]=[]):MonitoringSession{
 const cls=classes.find(c=>c.code===base.classCode),slot=slots.find(s=>s.timeRange===base.timeSlot);
 const lesson=lessons.find(l=>l.classId===cls?.id&&l.date===base.sessionDate&&l.timeSlotId===slot?.id);if(!lesson)return base;
 const incident=incidents.find(i=>i.lessonId===lesson.id);
 return {...base,checkinTime:lesson.checkinAt?new Date(lesson.checkinAt).toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok'}):null,attendance:lesson.teacherAttendance||'ABSENT',
 status:lesson.status==='HOAN_THANH'?'DA_HOC':lesson.status==='HUY'?'NGHI_HOC':lesson.coverTeacherId?'DAY_THAY':'CHUA_HOC',
 coverTeacher:teachers.find(t=>t.id===lesson.coverTeacherId)?.name||null,recordingUrl:lesson.recordingUrl||null,lessonDiary:lesson.diary||'',
 hasIncident:!!incident,incidentParent:(categories.find(c=>c.id===incident?.categoryId)?.code||null) as MonitoringSession['incidentParent'],incidentChild:incident?.incidentCode||null,
 incidentUrgency:incident?.urgency||null,incidentStatus:incident?.status||null,incidentNote:incident?.content||'',handledByOpsId:incident?.handledBy||null,handledByName:users.find(user=>user.id===incident?.handledBy)?.name||null,handledAt:incident?.handledAt||null};
}
export function persistMonitoringChanges(previous:MonitoringSession[],next:MonitoringSession[],lessons:Row[],incidentRows:Row[],classes:ClassItem[],teachers:TeacherProfile[],slots:TimeSlotItem[],categories:IncidentCategory[],userId:string){
 let updatedLessons=[...lessons],updatedIncidents=[...incidentRows];
 for(const session of next){
  const old=previous.find(s=>s.sessionCode===session.sessionCode);if(!old)continue;
  const clean=({isJustUpdated,...v}:MonitoringSession)=>v;if(JSON.stringify(clean(old))===JSON.stringify(clean(session)))continue;
  const cls=classes.find(c=>c.code===session.classCode),slot=slots.find(s=>s.timeRange.replace(/\s/g,'')===session.timeSlot.replace(/\s/g,''));
  if(!cls?.teacherId||!slot)throw new Error('Ca học cần có giáo viên và khung giờ thuộc danh mục trước khi lưu.');
  const existing=updatedLessons.find(l=>l.classId===cls.id&&l.date===session.sessionDate&&l.timeSlotId===slot.id);
  const id=existing?.id||session.sessionCode;const [start,end]=slot.timeRange.split('-').map(x=>x.trim());
  const checkin=session.checkinTime?session.sessionDate+'T'+session.checkinTime+'+07:00':null;
  const lesson:Row={...(existing||{}),id,classId:cls.id,date:session.sessionDate,timeSlotId:slot.id,startsAt:session.sessionDate+'T'+start+':00+07:00',endsAt:session.sessionDate+'T'+end+':00+07:00',primaryTeacherId:cls.teacherId,
   coverTeacherId:teachers.find(t=>t.name===session.coverTeacher)?.id||null,title:existing?.title||'',roomUrl:session.roomUrl,materials:existing?.materials||{},
   status:session.status==='NGHI_HOC'?'HUY':existing?.status==='HOAN_THANH'?'HOAN_THANH':checkin?'DANG_HOC':'CHUA_DIEN_RA',checkinAt:existing?.checkinAt||checkin,checkinUserId:existing?.checkinUserId||(checkin?userId:null),
   teacherAttendance:session.attendance,diary:session.lessonDiary,recordingUrl:session.recordingUrl};
  updatedLessons=[...updatedLessons.filter(l=>l.id!==id),lesson];
  if(session.hasIncident){
   const category=categories.find(c=>c.code===session.incidentParent);const item=category?.subIncidents.find(i=>i.code===session.incidentChild);
   if(!category||!item)throw new Error('Loại sự cố không còn trong danh mục.');
   const incident=updatedIncidents.find(i=>i.lessonId===id);
   const row={...(incident||{}),id:incident?.id||'INC-'+id,lessonId:id,categoryId:category.id,incidentCode:item.code,incidentName:item.name,urgency:session.incidentUrgency,content:session.incidentNote,status:session.incidentStatus||'DANG_XU_LY',reportedBy:incident?.reportedBy||userId,handledBy:userId,
    reportedAt:incident?.reportedAt||new Date().toISOString(),handledAt:new Date().toISOString()};
   updatedIncidents=[...updatedIncidents.filter(i=>i.id!==row.id),row];
  }
 }
 setBusinessValue('dated_lessons',updatedLessons);setBusinessValue('lesson_incidents',updatedIncidents);
}
