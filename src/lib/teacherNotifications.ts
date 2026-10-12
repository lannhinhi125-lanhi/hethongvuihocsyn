import { resolveAccountTeacher } from './evaluation';
import type { MonthPayrollData, TeacherProfile, UserAccount } from '../types';

export interface TeacherNotification {
  key: string;
  title: string;
  detail: string;
  tab: 'evaluation' | 'reconcile';
  sortAt: string;
}

export const teacherNotifications = (
  user: UserAccount,
  teachers: TeacherProfile[],
  users: UserAccount[],
  payrollStore: Record<string, MonthPayrollData>
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

  return [...evaluations, ...disputes].sort((a, b) => b.sortAt.localeCompare(a.sortAt));
};
