import { isPreviewAccount } from './previewMode';
import type { SuccessfulSession, TeacherProfile, UserAccount } from '../types';

export function sessionDateISO(session: SuccessfulSession): string {
  if (session.dateISO) return session.dateISO;
  if (/^\d{4}-\d{2}-\d{2}$/.test(session.date)) return session.date;
  const match = session.date.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (!match) return '';
  // Existing seeded sessions belong to October 2026. New sessions should supply dateISO.
  const [, day, month, year = '2026'] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function sessionsInRange(teacher: TeacherProfile, from: string, to: string): SuccessfulSession[] {
  if (from && to && from > to) return [];
  return (teacher.successfulSessions || []).filter(session => {
    const date = sessionDateISO(session);
    return (!from && !to) || Boolean(date && (!from || date >= from) && (!to || date <= to));
  }).sort((a, b) => sessionDateISO(b).localeCompare(sessionDateISO(a)));
}

export function resolveAccountTeacher(user: UserAccount, teachers: TeacherProfile[], users: UserAccount[]): TeacherProfile | undefined {
  if (isPreviewAccount(user)) return teachers[0];
  if (user.role !== 'Giáo viên Giảng dạy' || user.status !== 'active') return undefined;
  const matches = teachers.filter(teacher => resolveTeacherAccount(teacher, users)?.id === user.id);
  return matches.length === 1 ? matches[0] : undefined;
}

export function resolveTeacherAccount(teacher: TeacherProfile, users: UserAccount[]): UserAccount | undefined {
  // The database foreign key is authoritative, including renamed role groups.
  if (teacher.user_id) return users.find(user => user.id === teacher.user_id);
  const sameId = users.find(user => user.id === teacher.id);
  if (sameId) return sameId;

  const matches = users.filter(user => user.role === 'Giáo viên Giảng dạy' && (
    user.id === teacher.id ||
    Boolean(teacher.email && user.email.toLowerCase() === teacher.email.toLowerCase()) ||
    Boolean(teacher.username && user.username === teacher.username)
  ));
  return matches.length === 1 ? matches[0] : undefined;
}
