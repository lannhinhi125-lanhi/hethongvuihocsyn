import { isPreviewAccount } from './previewMode';
import type { TeacherProfile, UserAccount } from '../types';

export function canEditTeacherAvailability(user: UserAccount, teacher?: TeacherProfile): boolean {
  if (isPreviewAccount(user)) return Boolean(teacher);
  return Boolean(teacher && user.role === 'Giáo viên Giảng dạy' && user.status === 'active' && (
    user.id === teacher.id ||
    (user.email && teacher.email && user.email.trim().toLowerCase() === teacher.email.trim().toLowerCase()) ||
    (user.username && teacher.username && user.username === teacher.username)
  ));
}
