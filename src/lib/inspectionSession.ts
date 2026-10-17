import type { ClassItem, SuccessfulSession } from '../types';
import type { TeachingLesson } from './teachingSessionDetails';
import { reportCreationDate } from './reportCreationDate';

export function isCompletedInspectionLesson(lesson: TeachingLesson): boolean {
  return lesson.status === 'DA_HOC' || lesson.status === 'HOAN_THANH';
}

export function completedLessonsForTeacher(lessons: TeachingLesson[],teacherId:string,now=new Date()) {
  const today=reportCreationDate(now.toISOString());
  const seen=new Set<string>();
  return lessons.filter(lesson=>{
    if ((lesson.coverTeacherId || lesson.primaryTeacherId)!==teacherId ||
      !['DA_HOC','HOAN_THANH','DA_HOC_CU','DAY_THAY_CU'].includes(lesson.status || '') || !lesson.date || lesson.date>today) return false;
    if (lesson.checkoutAt && (!Number.isFinite(Date.parse(lesson.checkoutAt)) || Date.parse(lesson.checkoutAt)>now.getTime())) return false;
    if (lesson.id && seen.has(lesson.id)) return false;
    if (lesson.id)seen.add(lesson.id);
    return true;
  });
}

/** Resolve an existing dated lesson. This function never creates or updates data. */
export function inspectionSession(code: string, classes: ClassItem[], lessons: TeachingLesson[],
  slots: { id: string; timeRange: string }[]) {
  const lesson = lessons.find(item => item.id === code);
  const cls = classes.find(item => item.id === lesson?.classId);
  const slot = slots.find(item => item.id === lesson?.timeSlotId);
  if (!lesson || !cls || !slot) return undefined;
  const clockTime = (value?: string) => {
    if (!value) return '';
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0,5);
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}) : '';
  };
  const start = clockTime(lesson.startsAt), end = clockTime(lesson.endsAt);
  const time = start && end ? `${start} - ${end}` : slot.timeRange;
  const suffix = code.startsWith(`${cls.code}-${lesson.date}-`) ? Number(code.slice(`${cls.code}-${lesson.date}-`.length)) : NaN;
  const sessionNum = lesson.inspectionData?.sessionNum || (Number.isInteger(suffix) && suffix > 0 ? suffix : undefined);
  const session: SuccessfulSession = {
    code, name: lesson.title || lesson.inspectionData?.title || '', date: lesson.date, dateISO: lesson.date,
    week: '', slot: time, students: lesson.inspectionData ? `${lesson.inspectionData.studentIds.length} HS` : lesson.feedbackProgress ? `${lesson.feedbackProgress.total} HS` : '',
    status: lesson.status === 'DA_HOC' || lesson.status === 'HOAN_THANH' ? 'Hoàn thành' : lesson.status || '',
    roomLink: lesson.roomUrl || '', recordLink: lesson.recordingUrl || '',
    checkin: lesson.checkinAt ? new Date(lesson.checkinAt).toLocaleTimeString('vi-VN', {timeZone:'Asia/Bangkok'}) : '',
    gradeLevel: cls.grade, model: cls.model,
  };
  return { lesson, cls, sessionNum, session };
}
