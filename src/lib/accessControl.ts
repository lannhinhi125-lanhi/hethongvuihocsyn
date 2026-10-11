import { PORTAL_PREVIEW_MODE, PREVIEW_ACCOUNT, PREVIEW_ROLE, isPreviewAccount } from './previewMode';
import type { UserAccount, SystemRoleGroup } from '../types';
import { expandPermissions, permissionModules, rolePortal, type AccountPortal } from './portalPermissions';
export function assignedRole(user: UserAccount, groups: SystemRoleGroup[]): SystemRoleGroup | undefined {
  if (PORTAL_PREVIEW_MODE && user.id === PREVIEW_ACCOUNT.id) return PREVIEW_ROLE;
  const matches = groups.filter(group => user.roleGroupId ? group.id === user.roleGroupId : group.name === user.role);
  return matches.length === 1 ? matches[0] : undefined;
}
export function accountPortal(user: UserAccount, groups: SystemRoleGroup[]): AccountPortal {
  const role = assignedRole(user, groups);
  return role ? rolePortal(role) : user.role === 'Giáo viên Giảng dạy' ? 'TEACHER' : 'ADMIN';
}
export function hasPermission(user: UserAccount, groups: SystemRoleGroup[], feature: string): boolean {
  if (user.status !== 'active') return false;
  if (isPreviewAccount(user)) return [...expandPermissions(['ALL'], 'ADMIN'), ...expandPermissions(['ALL'], 'TEACHER')].includes(feature);
  const role = assignedRole(user, groups);
  if (!role) return false;
  return expandPermissions(role.permissions || [], rolePortal(role)).includes(feature);
}
export function canAccessModule(user: UserAccount, groups: SystemRoleGroup[], moduleId: string): boolean {
  if (isPreviewAccount(user)) return [...permissionModules.ADMIN, ...permissionModules.TEACHER].some(module => module.id === moduleId);
  const role = assignedRole(user, groups);
  if (!role || user.status !== 'active') return false;
  const module = permissionModules[rolePortal(role)].find(item => item.id === moduleId);
  return Boolean(module?.features.some(feature => hasPermission(user, groups, feature)));
}
export const teacherModuleIds: Record<string, string> = { availability: 'T_AVAILABILITY', schedule: 'T_SCHEDULE', evaluation: 'T_EVALUATION', reconcile: 'T_RECONCILE', payroll: 'T_RECONCILE' };
export function changedFields(previous: object, next: object): string[] {
  const before = previous as Record<string, unknown>, after = next as Record<string, unknown>;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}
