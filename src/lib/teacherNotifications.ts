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
      const stopped = ['Tạm dừng','Đã kết thúc'].includes(cls.status || '');
      return {
        key: `class:${cls.id}:${teacher.id}:${stopped ? cls.status : 'assigned'}`,
        title: stopped ? (cls.status === 'Tạm dừng' ? 'Lớp học đã tạm dừng' : 'Lớp học đã kết thúc') : 'Bạn được phân công lớp học',
        detail: `${cls.code} · ${cls.name}${cls.schedule ? ' · '+cls.schedule : ''}`,
        tab: 'schedule' as const,
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
    if (!cls || ['Tạm dừng','Đã kết thúc'].includes(cls.status || '')) return [];
    const day = /^\d{4}-\d{2}-\d{2}$/.test(lesson.date) ? lesson.date.split('-').reverse().join('/') : lesson.date;
    const time = [clock(lesson.startsAt),clock(lesson.endsAt)].filter(Boolean).join('–');
    return [{
      key: `cover:${lesson.id}:${teacher.id}:${lesson.date}:${lesson.startsAt || ''}:${lesson.endsAt || ''}`,
      title: 'Bạn được phân công dạy thay',
      detail: `${cls.code} · ${cls.name} · ${day}${time ? ' · '+time : ''}`,
      tab: 'schedule' as const,
      sortAt: lesson.updated_at || lesson.created_at || lesson.date
    }];
  });

  return [...evaluations, ...disputes, ...classNotices, ...coverNotices].sort((a, b) => b.sortAt.localeCompare(a.sortAt));
};
