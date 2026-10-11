import type { UserAccount, SystemRoleGroup } from '../types';
// Truy cập giao diện không đăng nhập theo yêu cầu; danh tính chỉ ở bộ nhớ.
export const PORTAL_PREVIEW_MODE = true;
export const PREVIEW_ACCOUNT: UserAccount = {
  id: 'PREVIEW-ADMIN', roleGroupId: 'PREVIEW-ROLE', name: 'Quản trị xem trước',
  username: '', passwordRaw: '', email: '', phone: '',
  role: 'Quản trị Toàn quyền', status: 'active', avatarInitials: 'QT'
};
export const PREVIEW_ROLE: SystemRoleGroup = {
  id: 'PREVIEW-ROLE', name: 'Quản trị Toàn quyền', category: 'HỆ THỐNG',
  desc: 'Quyền xem trước giao diện trong bộ nhớ', userCount: 0, portal: 'ADMIN', permissions: ['ALL']
};
