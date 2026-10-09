import type { UserAccount, SystemRoleGroup, TeacherProfile } from '../types';
export const TEACHER_PROFILE_PERMISSION = 'Thêm/sửa hồ sơ và cấp tài khoản giáo viên';
export function canManageTeacherProfiles(user: UserAccount, groups: SystemRoleGroup[]): boolean {
  if (user.status !== 'active' || user.role === 'Giáo viên Giảng dạy') return false;
  if (user.role === 'Quản trị Toàn quyền') return true;
  const permissions = groups.find(group => group.name === user.role)?.permissions || [];
  return permissions.some(permission => ['ALL', 'PH3_ALL', 'PH3_WRITE', TEACHER_PROFILE_PERMISSION].includes(permission));
}
export function generateTeacherCredentials(teachers: TeacherProfile[], users: UserAccount[]) {
  const used = new Set([...teachers.map(t => t.id.toUpperCase()), ...users.flatMap(u => [u.id.toUpperCase(), u.username.toUpperCase()])]);
  let number = 1;
  for (const code of used) { const match = /^GV-(\d+)$/.exec(code); if (match) number = Math.max(number, Number(match[1]) + 1); }
  let id = 'GV-' + String(number).padStart(3, '0');
  while (used.has(id)) id = 'GV-' + String(++number).padStart(3, '0');
  const random = crypto.getRandomValues(new Uint8Array(16));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const password = 'Gv@' + Array.from(random, value => alphabet[value % alphabet.length]).join('');
  return { id, username: id, password };
}

export function findLoginAccount(users: UserAccount[], username: string, password: string): UserAccount | undefined {
  const matches = users.filter(user => user.username.trim().toLowerCase() === username.trim().toLowerCase());
  return matches.length === 1 && matches[0].status === 'active' && matches[0].passwordRaw === password ? matches[0] : undefined;
}
