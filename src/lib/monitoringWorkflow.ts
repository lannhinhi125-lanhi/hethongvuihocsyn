import type { ClassItem, TimeSlotItem } from '../types';
import type { TeachingLesson } from './teachingSessionDetails';
import { teachingScheduleEntries } from './teachingSessionDetails';

export function timeRangesOverlap(first: string, second: string): boolean {
  const parse = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    return match ? [Number(match[1]) * 60 + Number(match[2]), Number(match[3]) * 60 + Number(match[4])] : null;
  };
  const a = parse(first.trim()), b = parse(second.trim());
  return Boolean(a && b && a[0] < a[1] && b[0] < b[1] && a[0] < b[1] && b[0] < a[1]);
}

export function coverScheduleConflict(teacherId: string, target: { sessionCode: string; sessionDate: string; timeSlot: string },
  lessons: TeachingLesson[], classes: ClassItem[], slots: TimeSlotItem[]): boolean {
  const canceled = (status?: string) => ['HUY', 'NGHI_HOC'].includes(status || '');
  const lessonTime = (lesson: TeachingLesson) => slots.find(slot => slot.id === lesson.timeSlotId)?.timeRange || '';
  if (lessons.some(lesson => lesson.id !== target.sessionCode && lesson.date === target.sessionDate &&
    lesson.coverTeacherId === teacherId && !canceled(lesson.status) && timeRangesOverlap(lessonTime(lesson), target.timeSlot))) return true;
  return classes.some(cls => (cls.coverAssignments || []).some(assignment => {
    if (assignment.teacherId !== teacherId || assignment.dateStr !== target.sessionDate) return false;
    const entry = teachingScheduleEntries(cls).find(row => row.session === assignment.sessionNum);
    if (!entry) return false;
    const dated = lessons.find(lesson => lesson.classId === cls.id && lesson.date === assignment.dateStr &&
      lessonTime(lesson).replace(/\s/g, '') === entry.time.replace(/\s/g, ''));
    // Persisted lessons are authoritative over the derived class schedule.
    if (dated) return false;
    return timeRangesOverlap(entry.time, target.timeSlot);
  }));
}

export function isUnresolvedIncident(session: { hasIncident: boolean; incidentStatus: string | null }): boolean {
  return session.hasIncident && session.incidentStatus !== 'DA_GIAI_QUYET' && session.incidentStatus !== 'HUY_CA';
}
