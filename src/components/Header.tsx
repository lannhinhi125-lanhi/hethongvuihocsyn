import { usePermissions } from '../hooks/usePermissions';
import { teacherModuleIds } from '../lib/accessControl';
import { ReportSelect } from './ReportSelect';
import React, { useRef, useState } from 'react';
import { useAccountSession, refreshAccountSession, getAccountSnapshot } from '../lib/accountSession';
import { useBusinessStatus, refreshBusinessData, getBusinessSnapshot } from '../lib/businessPersistence';
import { PORTAL_PREVIEW_MODE, PREVIEW_ACCOUNT } from '../lib/previewMode';
import { useApp } from '../context/AppContext';
import { TeacherNotifications } from './TeacherNotifications';
import { SystemGuide } from './SystemGuide';
import {
  Menu,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, sidebarCollapsed, onToggleSidebar }) => {
  const session = useAccountSession();
  const business = useBusinessStatus();
  const [reloading, setReloading] = useState(false);
  const reloadPending = useRef(false);
  const { canModule } = usePermissions();
  const {
    setActiveModule,
    setTeacherPortalTab,
    activeModule,
    reportSection,
    currentUser,
    users,
    setCurrentUser,
    workspaceMode,
    setWorkspaceMode,
    teacherPortalTab,
    showToast
  } = useApp();
  const reloadData = async () => {
    if (reloadPending.current || getAccountSnapshot().saving || getBusinessSnapshot().saving) return;
    reloadPending.current = true; setReloading(true);
    try {
      if (!await refreshAccountSession()) throw new Error(getAccountSnapshot().error || 'Chưa thể tải lại dữ liệu. Vui lòng thử lại.');
      const refreshed = await refreshBusinessData();
      const latest = getBusinessSnapshot();
      if (latest.refreshError || latest.error) throw new Error(latest.refreshError || latest.error);
      if (!refreshed) throw new Error('Dữ liệu đang thay đổi. Vui lòng đợi rồi tải lại.');
      showToast('Đã tải lại dữ liệu mới nhất.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Chưa tải lại được dữ liệu. Vui lòng thử lại.', 'error');
    } finally { reloadPending.current = false; setReloading(false); }
  };

  // Tiêu đề chức năng hệ thống (chuẩn nghiệp vụ, có đối soát công, không có thù lao)
  const adminModuleTitles: Record<number, { cat: string; title: string }> = {
    0: { cat: 'Tổng quan', title: 'Bàn làm việc' },
    1: { cat: 'Hệ thống', title: 'Tài khoản & phân quyền' },
    2: { cat: 'Hệ thống', title: 'Danh mục dùng chung' },
    3: { cat: 'Chuyên môn', title: 'Hồ sơ & chuyên môn' },
    4: { cat: 'Vận hành', title: 'Học sinh & lớp học' },
    5: { cat: 'Vận hành', title: 'Giám sát ca & sự cố' },
    6: { cat: 'Vận hành', title: 'Quản lý tri thức và cấu hình AI' },
    7: { cat: 'Vận hành & Đối soát', title: 'Đối soát công ca dạy' },
    8: { cat: 'Báo cáo & thống kê', title: reportSection === 'custom' ? 'Lập báo cáo' : 'Báo cáo chi tiết' }
  };

  // Tiêu đề Cổng Giáo viên & Gia sư (chuẩn nghiệp vụ giảng dạy)
  const teacherTabTitles: Record<string, { cat: string; title: string }> = {
    availability: { cat: 'Thời khóa biểu', title: 'Đăng ký lịch rảnh' },
    schedule: { cat: 'Giảng dạy', title: 'Lịch dạy & phòng học' },
    evaluation: { cat: 'Chuyên môn', title: 'Hồ sơ & chuyên môn' },
    reconcile: { cat: 'Nghiệp vụ ca dạy', title: 'Đối soát công ca dạy' }
  };

  const currentInfo =
    workspaceMode === 'ADMIN'
      ? adminModuleTitles[activeModule] || { cat: 'Quản trị', title: 'Hệ thống Vận hành' }
      : teacherTabTitles[teacherPortalTab] || { cat: 'Cổng Giáo viên', title: 'Bảng Giảng Dạy' };



  return (
    <div className="sticky top-0 z-30 w-full shrink-0">
      <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onToggleSidebar} aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? 'Hiện thanh bên' : 'Ẩn thanh bên'} title={sidebarCollapsed ? 'Hiện thanh bên' : 'Ẩn thanh bên'} className="hidden lg:inline-flex p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer">
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          {/* Mobile menu button */}
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            title="Mở menu" aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb phong cách Figma */}
          <div className="flex items-center gap-2 text-xs truncate">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                workspaceMode === 'ADMIN'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {workspaceMode === 'ADMIN' ? 'Quản trị' : 'Giảng dạy'}
            </span>
            <span className="text-slate-400 font-medium hidden sm:inline">{currentInfo.cat}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
            <span className="font-semibold text-slate-800 tracking-tight truncate max-w-[220px] sm:max-w-md">
              {currentInfo.title}
            </span>
          </div>
        </div>

        {/* Thanh công cụ phải */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button type="button" onClick={()=>void reloadData()} disabled={reloading || session.saving || business.saving || business.loading} aria-label="Tải lại dữ liệu" aria-busy={reloading} title="Tải lại dữ liệu từ hệ thống" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">{reloading ? 'Đang tải…' : 'Tải lại dữ liệu'}</span>
          </button>
          <SystemGuide />
          {workspaceMode === 'TEACHER' && <TeacherNotifications />}

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {PORTAL_PREVIEW_MODE && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span className="hidden sm:inline">Kiểm tra cổng:</span>
              <ReportSelect
                aria-label="Chọn tài khoản kiểm tra cổng"
                value={currentUser.id}
                onChange={event => {
                  const account = event.target.value === PREVIEW_ACCOUNT.id ? PREVIEW_ACCOUNT : users.find(user => user.id === event.target.value && user.status === 'active');
                  if (account) setCurrentUser(account);
                }}
                className="max-w-[210px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
              >
                <option value={PREVIEW_ACCOUNT.id}>Tài khoản mẫu · Toàn quyền hai cổng</option>
                {users.filter(user => user.status === 'active').map(user => (
                  <option key={user.id} value={user.id}>{user.name} · {user.role}</option>
                ))}
              </ReportSelect>
            </label>
          )}
          {/* Avatar người dùng hiện tại */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-semibold text-xs border border-orange-100">
              {currentUser.avatarInitials}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px] tracking-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
                {currentUser.role}
              </div>
            </div>
          </div>
        </div>
      </header>
      {sidebarCollapsed && <nav aria-label="Các phân hệ" className="hidden lg:flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#131329] px-4 py-2">
        {workspaceMode === 'ADMIN' ? Object.entries(adminModuleTitles).filter(([id]) => canModule('PH' + id)).map(([id, info]) => <button type="button" key={id} aria-current={activeModule === Number(id) ? 'page' : undefined} onClick={() => setActiveModule(Number(id))} className={activeModule === Number(id) ? 'module-top-tab bg-[#FF5C00] text-white' : 'module-top-tab text-[#A9BDE2] hover:bg-white/10 hover:text-white'}>{Number(id) === 8 ? 'Báo cáo & thống kê' : info.title}</button>) : Object.entries(teacherTabTitles).filter(([id]) => canModule(teacherModuleIds[id])).map(([id, info]) => <button type="button" key={id} aria-current={teacherPortalTab === id ? 'page' : undefined} onClick={() => setTeacherPortalTab(id as typeof teacherPortalTab)} className={teacherPortalTab === id ? 'module-top-tab bg-[#FF5C00] text-white' : 'module-top-tab text-[#A9BDE2] hover:bg-white/10 hover:text-white'}>{info.title}</button>)}
      </nav>}

    </div>
  );
};
