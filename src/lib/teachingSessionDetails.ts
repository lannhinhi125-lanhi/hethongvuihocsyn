import type { ClassItem } from '../types';
import { materialForSessionDate, teachingWeekForDate } from './teacherScheduleMaterials';
import { monitoringStudyStatus, monitoringSessionStatus } from './sessionAlerts';

export const teachingScheduleEntries = (cls: ClassItem) => Array.from(
  cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
  match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
).sort((a, b) => a.dayIndex - b.dayIndex ||
  (Number(a.time.split(':')[0]) * 60 + Number(a.time.split(':')[1]?.slice(0, 2))) -
  (Number(b.time.split(':')[0]) * 60 + Number(b.time.split(':')[1]?.slice(0, 2)))).slice(0, 2)
  .map((entry, index) => ({ ...entry, session: index + 1 }));

export const teachingSessionsInWeek = (cls: ClassItem, date: string) => {
  const week = teachingWeekForDate(new Date(`${date}T00:00:00`));
  return teachingScheduleEntries(cls).map(entry => {
    const day = new Date(`${week.from}T00:00:00`);
    day.setDate(day.getDate() + entry.dayIndex);
    const sessionDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { ...entry, date: sessionDate, material: materialForSessionDate(cls.materials || [], entry.session, sessionDate) };
  }).filter(entry => !cls.startDate || entry.date >= cls.startDate);
};

/** Only the assigned material for this weekday, time and calendar week qualifies. */
export const scheduledMaterialForDate = (cls: ClassItem, date: string, time: string) => {
  const day = new Date(`${date}T12:00:00`).getDay();
  const dayIndex = (day + 6) % 7;
  const normalize = (value: string) => value.replace(/\s/g, '');
  const entry = teachingScheduleEntries(cls).find(item => item.dayIndex === dayIndex && normalize(item.time) === normalize(time));
  return entry ? materialForSessionDate(cls.materials || [], entry.session, date) : undefined;
};

export interface TeachingLesson {
  pausedByClass?: boolean;
  pauseReason?: string | null;
  pauseCategoryId?: string | null;
  pauseNote?: string | null;
  id?: string;
  classId: string;
  date: string;
  status?: string;
  timeSlotId: string;
  startsAt?: string;
  endsAt?: string;
  roomUrl?: string;
  recordingUrl?: string | null;
  primaryTeacherId?: string;
  coverTeacherId?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  feedbackProgress?: {total:number;completed:number;state:string;studentIds:string[]};
  inspectionData?: {sessionNum?:number | null;title?:string | null;studentIds:string[];attendance:Record<string,string>;feedback:Record<string,string>};
  title?: string;
  diary?: string;
  materials?: { title?: string; materialGv?: string; materialHs?: string; exerciseLms?: string; slide?: string; lms?: string };
}

export const teachingSessionDetails = (cls: ClassItem, session: number, date: string, time: string,
  lessons: TeachingLesson[], slots: { id: string; timeRange: string }[], now: Date, lessonId?: string) => {
  const normalize = (value: string) => value.replace(/\s/g, '');
  const lesson = lessonId ? lessons.find(item => item.id === lessonId && item.classId === cls.id) : lessons.find(item => item.classId === cls.id && item.date === date &&
    normalize(slots.find(slot => slot.id === item.timeSlotId)?.timeRange || '') === normalize(time));
  const stored = lessonId ? undefined : cls.activeSessions?.[session];
  const active = stored?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === date &&
    (!stored.dateStr.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/) ||
      normalize(stored.dateStr.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/)![0]) === normalize(time)) ? stored : undefined;
  const material = lessonId ? undefined : scheduledMaterialForDate(cls, date, time);
  const roomUrl = lessonId ? lesson?.roomUrl || '' : lesson?.roomUrl || cls.roomLink;
  const status = monitoringStudyStatus(date, time, now);
  const ended=Boolean(lesson?.checkoutAt || active?.checkoutAt);
  // Before check-in, the weekly assignment is the current teaching plan.
  // A cached lesson/session projection must not hide a newly assigned link
  // (including an intentionally cleared link). Exact lesson views and started
  // lessons keep their recorded materials for historical review.
  const started = Boolean(lesson?.checkinAt || lesson?.checkoutAt || active?.checkinAt || active?.checkinTime || active?.checkoutAt ||
    ['DANG_HOC', 'DA_HOC', 'HOAN_THANH', 'CHUA_HOAN_TAT'].includes(lesson?.status || '') ||
    ['Đang học', 'Đã hoàn thành'].includes(active?.status || ''));
  const currentPlan = !lessonId && !started ? material : undefined;
  return {
    active, lesson, status,
    lifecycleStatus: monitoringSessionStatus({sessionDate:date,timeSlot:time,status:lesson?.status === 'HOAN_THANH' ? 'DA_HOC' : lesson?.status,
      checkinAt:lesson?.checkinAt || active?.checkinAt,checkinTime:active?.checkinTime,checkoutAt:lesson?.checkoutAt || active?.checkoutAt},now),
    title: currentPlan?.title || lesson?.title || lesson?.materials?.title || lesson?.inspectionData?.title || active?.title || material?.title || `Buổi ${session}`,
    slide: currentPlan ? currentPlan.slide : lesson?.materials?.materialGv || lesson?.materials?.slide || active?.materialGv || material?.slide || '',
    studentMaterial: lesson?.materials?.materialHs || active?.materialHs || '',
    exercise: currentPlan ? currentPlan.lms : lesson?.materials?.exerciseLms || lesson?.materials?.lms || active?.exerciseLms || material?.lms || '',
    roomUrl, recordingUrl: lesson?.recordingUrl || '',
    actionLabel: ended || status === 'DA_HOC' ? 'Xem lại bản ghi' : 'Vào học',
    actionUrl: ended || status === 'DA_HOC' ? lesson?.recordingUrl || '' : roomUrl
  };
};
