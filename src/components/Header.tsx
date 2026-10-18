import { ReportSelect } from './ReportSelect';
import { confirmAction } from './ConfirmAction';
import React from 'react';
import { PORTAL_PREVIEW_MODE, PREVIEW_ACCOUNT } from '../lib/previewMode';
import { useApp } from '../context/AppContext';
import { TeacherNotifications } from './TeacherNotifications';
import {
  Menu,
  ChevronRight,
  UserCheck,
  Trash2
} from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onLogout }) => {
  const {
    activeModule,
    reportSection,
    currentUser,
    users,
    setCurrentUser,
    workspaceMode,
    setWorkspaceMode,
    teacherPortalTab,
    clearAllData,
    showToast
  } = useApp();

  // Tiêu đề chức năng hệ thống (chuẩn nghiệp vụ, có đối soát công, không có thù lao)
  const adminModuleTitles: Record<number, { cat: string; title: string }> = {
    0: { cat: 'Tổng quan', title: 'Bàn làm việc' },
    1: { cat: 'Hệ thống', title: 'Tài khoản & phân quyền' },
    2: { cat: 'Hệ thống', title: 'Danh mục dùng chung' },
    3: { cat: 'Chuyên môn', title: 'Hồ sơ & chuyên môn' },
    4: { cat: 'Vận hành', title: 'Học sinh & ghép lớp' },
    5: { cat: 'Vận hành', title: 'Giám sát ca & sự cố' },
    6: { cat: 'Vận hành', title: 'Quản lý tri thức và cấu hình AI' },
    7: { cat: 'Vận hành & Đối soát', title: 'Đối soát công ca dạy' },
    8: { cat: 'Báo cáo & thống kê', title: reportSection === 'custom' ? 'Lập báo cáo' : 'Báo cáo chi tiết' }
  };

  // Tiêu đề Cổng Giáo viên & Gia sư (chuẩn nghiệp vụ giảng dạy)
  const teacherTabTitles: Record<string, { cat: string; title: string }> = {
    schedule: { cat: 'Giảng dạy', title: 'Lịch dạy & phòng học' },
    reconcile: { cat: 'Nghiệp vụ ca dạy', title: 'Đối soát công ca dạy' },
    evaluation: { cat: 'Chuyên môn', title: 'Hồ sơ & chuyên môn' },
    availability: { cat: 'Thời khóa biểu', title: 'Đăng ký lịch rảnh' }
  };

  const currentInfo =
    workspaceMode === 'ADMIN'
      ? adminModuleTitles[activeModule] || { cat: 'Quản trị', title: 'Hệ thống Vận hành' }
      : teacherTabTitles[teacherPortalTab] || { cat: 'Cổng Giáo viên', title: 'Bảng Giảng Dạy' };


  const handleConfirmClear = async () => {
    if (await confirmAction('XÓA SẠCH DỮ LIỆU: Thao tác này xóa toàn bộ dữ liệu trong phiên và đăng xuất. Dữ liệu đã lưu trong hệ thống vẫn được giữ. Bạn có chắc chắn không?')) {
      clearAllData();
    }
  };

  return (
    <>
      <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          {workspaceMode === 'TEACHER' && <TeacherNotifications />}
          {/* Nút Xóa sạch dữ liệu (Empty State) */}
          <button
            disabled={currentUser.role !== 'Quản trị Toàn quyền'} onClick={handleConfirmClear}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-md border border-slate-200 hover:border-rose-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Xóa dữ liệu phiên và đăng xuất" aria-label="Xóa dữ liệu phiên và đăng xuất"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden xl:inline">Xóa dữ liệu phiên</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {PORTAL_PREVIEW_MODE ? (
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
          ) : <button type="button" onClick={onLogout} className="px-3 py-2 text-xs border border-slate-200 rounded-lg">Đăng xuất</button>}
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
    </>
  );
};
