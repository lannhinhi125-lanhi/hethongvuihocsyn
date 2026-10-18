import type { DisputeItem, SessionPayrollRecord } from '../types';
import type { TeachingLesson } from './teachingSessionDetails';
import { reportCreationDate } from './reportCreationDate';

// Payroll rows are already generated/validated by the database. Current class
// rosters must never remove historical work after a student transfers.
export function visibleTeacherWork(sessions:SessionPayrollRecord[],lessons:TeachingLesson[],teacherId:string,now=new Date()) {
  const today=reportCreationDate(now.toISOString());
  return sessions.filter(session=>{
    if (session.teacherId && session.teacherId!==teacherId) return false;
    if (!session.date || session.date>today) return false;
    const lesson=lessons.find(item=>item.id===(session.lessonId || session.id));
    const clockStart=session.time?.match(/^\s*(\d{1,2}:\d{2})/)?.[1];
    const startsAt=lesson?.startsAt || (clockStart ? `${session.date}T${clockStart.padStart(5,'0')}:00+07:00` : undefined);
    if (startsAt && Date.parse(startsAt)>now.getTime()) return false;
    if (lesson?.checkoutAt && Date.parse(lesson.checkoutAt)>now.getTime()) return false;
    return true;
  });
}

export function canDisputeTeacherWork(session:SessionPayrollRecord,isLocked:boolean,payrollSent:boolean,hasPermission:boolean,disputes:DisputeItem[]) {
  return !session.isPendingCredit && hasPermission && !isLocked && Boolean(session.reconciliationSent ?? payrollSent) &&
    !disputes.some(dispute=>dispute.sessionId===session.id&&dispute.status==='CHO_DUYET');
}
