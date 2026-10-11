import { isPreviewAccount } from '../lib/previewMode';
import { useApp } from '../context/AppContext';
import { assignedRole, hasPermission, canAccessModule, accountPortal } from '../lib/accessControl';
export function usePermissions() {
  const { currentUser, users, roleGroups, showToast } = useApp();
  const actor = users.find(user => user.id === currentUser.id) || (isPreviewAccount(currentUser) ? currentUser : { ...currentUser, status: 'locked' as const });
  const can = (feature: string) => hasPermission(actor, roleGroups, feature);
  const requirePermission = (feature: string) => {
    if (can(feature)) return true;
    showToast('Nhóm quyền của bạn không được phép thực hiện thao tác này.', 'error'); return false;
  };
  return { can, requirePermission, role: assignedRole(actor, roleGroups), portal: accountPortal(actor, roleGroups), canModule: (id: string) => canAccessModule(actor, roleGroups, id) };
}
