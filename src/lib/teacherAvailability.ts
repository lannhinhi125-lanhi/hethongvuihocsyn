import { isPreviewAccount } from './previewMode';
import type { TeacherProfile, UserAccount } from '../types';

/** Select the version effective at an instant; no week-end expiry or fallback across an empty version. */
export function teacherScheduleAt(teacher: Pick<TeacherProfile, 'schedule' | 'scheduleHistory'>, at: string): TeacherProfile['schedule'] {
  if (!teacher.scheduleHistory?.length) return teacher.schedule;
  const instant = Date.parse(at);
  if (!Number.isFinite(instant)) return {};
  return teacher.scheduleHistory
    .filter(version => Date.parse(version.effectiveFrom) <= instant)
    .reduce<(typeof teacher.scheduleHistory)[number] | undefined>((latest, version) =>
      !latest || Date.parse(version.effectiveFrom) > Date.parse(latest.effectiveFrom) ? version : latest, undefined)?.schedule ?? {};
}

export function canEditTeacherAvailability(user: UserAccount, teacher?: TeacherProfile): boolean {
  if (isPreviewAccount(user)) return Boolean(teacher);
  if (teacher?.user_id) return user.status==='active' && user.id===teacher.user_id;
  return Boolean(teacher && user.role === 'Giáo viên Giảng dạy' && user.status === 'active' && (
    user.id === teacher.id ||
    (user.email && teacher.email && user.email.trim().toLowerCase() === teacher.email.trim().toLowerCase()) ||
    (user.username && teacher.username && user.username === teacher.username)
  ));
}
