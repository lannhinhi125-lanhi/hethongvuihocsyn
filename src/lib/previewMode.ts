import type { UserAccount, SystemRoleGroup } from '../types';
// Đăng nhập thật bằng NGUOI_DUNG; không bỏ qua quyền bằng tài khoản mẫu.
export const PORTAL_PREVIEW_MODE = false;
export const PREVIEW_ACCOUNT: UserAccount = {
  id: 'PREVIEW-ADMIN', roleGroupId: 'PREVIEW-ROLE', name: 'Tài khoản mẫu toàn quyền',
  username: 'demo', passwordRaw: 'Demo@123456', email: '', phone: '',
  role: 'Quản trị Toàn quyền', status: 'active', avatarInitials: 'QT'
};
export const PREVIEW_ROLE: SystemRoleGroup = {
  id: 'PREVIEW-ROLE', name: 'Quản trị Toàn quyền', category: 'HỆ THỐNG',
  desc: 'Quyền xem trước giao diện trong bộ nhớ', userCount: 0, portal: 'ADMIN', permissions: ['ALL']
};

/** Chỉ danh tính mẫu này được bỏ giới hạn quyền khi chế độ thử đang bật. */
export function isPreviewAccount(user: Pick<UserAccount, 'id' | 'status'>): boolean {
  return PORTAL_PREVIEW_MODE && user.id === PREVIEW_ACCOUNT.id && user.status === 'active';
}
