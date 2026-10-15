import type { ClassItem } from '../types';
import { materialForSessionDate, teachingWeekForDate } from './teacherScheduleMaterials';
import { monitoringStudyStatus, monitoringSessionStatus } from './sessionAlerts';

export const teachingScheduleEntries = (cls: ClassItem) => Array.from(
  cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
  match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).slice(0, 2)
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

export interface TeachingLesson {
  id?: string;
  classId: string;
  date: string;
  status?: string;
  timeSlotId: string;
  roomUrl?: string;
  recordingUrl?: string | null;
  primaryTeacherId?: string;
  coverTeacherId?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  feedbackProgress?: {total:number;completed:number;state:string;studentIds:string[]};
  title?: string;
  diary?: string;
  materials?: { materialGv?: string; materialHs?: string; exerciseLms?: string; slide?: string; lms?: string };
}

export const teachingSessionDetails = (cls: ClassItem, session: number, date: string, time: string,
  lessons: TeachingLesson[], slots: { id: string; timeRange: string }[], now: Date) => {
  const normalize = (value: string) => value.replace(/\s/g, '');
  const lesson = lessons.find(item => item.classId === cls.id && item.date === date &&
    normalize(slots.find(slot => slot.id === item.timeSlotId)?.timeRange || '') === normalize(time));
  const stored = cls.activeSessions?.[session];
  const active = stored?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === date &&
    (!stored.dateStr.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/) ||
      normalize(stored.dateStr.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/)![0]) === normalize(time)) ? stored : undefined;
  const material = materialForSessionDate(cls.materials || [], session, date);
  const roomUrl = lesson?.roomUrl || cls.roomLink;
  const status = monitoringStudyStatus(date, time, now);
  const ended=Boolean(lesson?.checkoutAt || active?.checkoutAt);
  return {
    active, lesson, status,
    lifecycleStatus: monitoringSessionStatus({sessionDate:date,timeSlot:time,status:lesson?.status === 'HOAN_THANH' ? 'DA_HOC' : lesson?.status,
      checkinAt:lesson?.checkinAt || active?.checkinAt,checkinTime:active?.checkinTime,checkoutAt:lesson?.checkoutAt || active?.checkoutAt},now),
    title: material?.title || lesson?.title || active?.title || `Buổi ${session}`,
    slide: material?.slide || lesson?.materials?.materialGv || lesson?.materials?.slide || active?.materialGv || '',
    studentMaterial: lesson?.materials?.materialHs || active?.materialHs || '',
    exercise: material?.lms || lesson?.materials?.exerciseLms || lesson?.materials?.lms || active?.exerciseLms || '',
    roomUrl, recordingUrl: lesson?.recordingUrl || roomUrl,
    actionLabel: ended || status === 'DA_HOC' ? 'Xem lại bản ghi' : 'Vào học',
    actionUrl: ended || status === 'DA_HOC' ? lesson?.recordingUrl || roomUrl : roomUrl
  };
};
