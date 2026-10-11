import type { MonthPayrollData, UserAccount } from '../types';

export function resolveActiveAccount(users: UserAccount[], sessionUserId: string | null): UserAccount | undefined {
  if (!sessionUserId) return undefined;
  const matches = users.filter(user => user.id === sessionUserId);
  return matches.length === 1 && matches[0].status === 'active' ? matches[0] : undefined;
}

export function payrollLockIssue(period: MonthPayrollData | undefined): string | undefined {
  if (!period || !period.teachers.some(teacher => teacher.sessions.length > 0)) return 'Kỳ chưa có ca dạy để chốt.';
  if (period.isLocked) return 'Kỳ công đã khóa.';
  if (period.disputes.some(dispute => dispute.status === 'CHO_DUYET')) return 'Hãy xử lý hết giải trình đang chờ duyệt trước khi chốt kỳ.';
  if (period.teachers.some(teacher => teacher.sessions.length > 0 && !teacher.payrollSent)) return 'Hãy gửi bảng công cho các giáo viên có ca dạy trước khi chốt kỳ.';
  return undefined;
}

export function schedulesOverlap(first: string, second: string): boolean {
  const parse = (schedule: string) => Array.from(schedule.matchAll(/(T[2-7]|CN|Chủ nhật)\s*\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/gi), match => ({
    day: match[1].toUpperCase() === 'CHỦ NHẬT' ? 'CN' : match[1].toUpperCase(),
    start: Number(match[2]) * 60 + Number(match[3]),
    end: Number(match[4]) * 60 + Number(match[5])
  }));
  return parse(first).some(a => parse(second).some(b => a.day === b.day && a.start < b.end && b.start < a.end));
}
