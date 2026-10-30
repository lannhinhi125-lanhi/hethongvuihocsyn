import { resolveAccountTeacher } from './evaluation';
import type { ClassItem, MonthPayrollData, TeacherProfile, UserAccount } from '../types';

export interface NotificationLesson {
  id: string;
  classId: string;
  date: string;
  coverTeacherId?: string | null;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  updated_at?: string;
  created_at?: string;
}

export interface TeacherNotification {
  key: string;
  title: string;
  detail: string;
  tab: 'evaluation' | 'reconcile' | 'schedule';
  sortAt: string;
  date?: string;
  dateLabel?: string;
}

export function notificationDateText(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const })
  }).format(date);
}

export const teacherNotifications = (
  user: UserAccount,
  teachers: TeacherProfile[],
  users: UserAccount[],
  payrollStore: Record<string, MonthPayrollData>,
  classes: ClassItem[] = [],
  lessons: NotificationLesson[] = []
): TeacherNotification[] => {
  const teacher = resolveAccountTeacher(user, teachers, users);
  if (!teacher) return [];

  const evaluations: TeacherNotification[] = (teacher.evaluationReports || [])
    .filter(report => report.status === 'DA_DUYET' && report.recipientUserId === user.id)
    .map(report => ({
      key: `evaluation:${report.id}:${report.sentAt || report.overallScore}`,
      title: 'Có kết quả đánh giá chuyên môn',
      detail: `${report.classCode} · ${report.overallScore}/10 · ${report.rank}`,
      tab: 'evaluation' as const,
      date: report.sentAt || report.sessionDate,
      dateLabel: report.sentAt ? 'Gửi lúc' : 'Ngày buổi học',
      sortAt: report.sentAt || report.sessionDate || ''
    }));

  const disputes: TeacherNotification[] = Object.entries(payrollStore).flatMap(([month, period]) =>
    (period.disputes || [])
      .filter(dispute => dispute.teacherId === teacher.id && dispute.status !== 'CHO_DUYET')
      .map(dispute => ({
        key: `dispute:${month}:${dispute.id}:${dispute.status}:${dispute.adminNote || ''}`,
        title: dispute.status === 'DA_DUYET' ? 'Giải trình đã được duyệt' : 'Giải trình bị từ chối',
        detail: `Ca ${dispute.sessionId || dispute.classCode || ''} · Kỳ ${month}`,
        tab: 'reconcile' as const,
        sortAt: `${month}-01`
      }))
  );

  const classNotices: TeacherNotification[] = classes
    .filter(cls => cls.teacherId === teacher.id)
    .map(cls => {
      const stopped = ['Dừng lớp','Đã kết thúc'].includes(cls.status || '');
      return {
        key: `class:${cls.id}:${teacher.id}:${stopped ? (cls.status === 'Dừng lớp' ? 'Tạm dừng' : cls.status) : 'assigned'}`,
        title: stopped ? (cls.status === 'Dừng lớp' ? 'Lớp học đã dừng' : 'Lớp học đã kết thúc') : 'Bạn được phân công lớp học',
        detail: `${cls.code} · ${cls.name}${cls.schedule ? ' · '+cls.schedule : ''}`,
        tab: 'schedule' as const,
        date: (cls as ClassItem & {updated_at?:string}).updated_at || cls.created_at || cls.startDate,
        dateLabel: (cls as ClassItem & {updated_at?:string}).updated_at ? 'Cập nhật lúc' : cls.created_at ? 'Ngày tạo lớp' : 'Ngày bắt đầu lớp',
        sortAt: (cls as ClassItem & {updated_at?:string}).updated_at || cls.created_at || cls.startDate || ''
      };
    });
  const clock = (value?: string) => {
    if (!value) return '';
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0,5);
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('vi-VN', {timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}) : '';
  };
  const coverNotices: TeacherNotification[] = lessons.flatMap(lesson => {
    if (lesson.coverTeacherId !== teacher.id || ['HUY','NGHI_HOC'].includes(lesson.status || '')) return [];
    const cls = classes.find(item => item.id === lesson.classId);
    if (!cls || ['Dừng lớp','Đã kết thúc'].includes(cls.status || '')) return [];
    const day = /^\d{4}-\d{2}-\d{2}$/.test(lesson.date) ? lesson.date.split('-').reverse().join('/') : lesson.date;
    const time = [clock(lesson.startsAt),clock(lesson.endsAt)].filter(Boolean).join('–');
    return [{
      key: `cover:${lesson.id}:${teacher.id}:${lesson.date}:${lesson.startsAt || ''}:${lesson.endsAt || ''}`,
      title: 'Bạn được phân công dạy thay',
      detail: `${cls.code} · ${cls.name} · ${day}${time ? ' · '+time : ''}`,
      tab: 'schedule' as const,
      date: lesson.updated_at || lesson.created_at || lesson.date,
      dateLabel: lesson.updated_at ? 'Cập nhật lúc' : lesson.created_at ? 'Ngày tạo buổi học' : 'Ngày dạy thay',
      sortAt: lesson.updated_at || lesson.created_at || lesson.date
    }];
  });

  return [...evaluations, ...disputes, ...classNotices, ...coverNotices].sort((a, b) => b.sortAt.localeCompare(a.sortAt));
};
