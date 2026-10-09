import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu,
  RotateCcw,
  ChevronRight,
  UserCheck,
  Trash2
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    activeModule,
    currentUser,
    users,
    setCurrentUser,
    workspaceMode,
    setWorkspaceMode,
    teacherPortalTab,
    resetAllDataToDefaults,
    clearAllData,
    showToast
  } = useApp();

  // Tiêu đề chức năng hệ thống (chuẩn nghiệp vụ, có đối soát công, không có thù lao)
  const adminModuleTitles: Record<number, { cat: string; title: string }> = {
    1: { cat: 'Hệ thống', title: 'Tài khoản & Phân quyền' },
    2: { cat: 'Hệ thống', title: 'Danh mục Dùng chung' },
    3: { cat: 'Chuyên môn', title: 'Hồ sơ GV & Dự giờ' },
    4: { cat: 'Vận hành', title: 'Học sinh & Ghép lớp' },
    5: { cat: 'Vận hành', title: 'Giám sát Ca & Sự cố' },
    6: { cat: 'Vận hành', title: 'Trợ lý AI Giảng dạy' },
    7: { cat: 'Vận hành & Đối soát', title: 'Đối soát công ca dạy & Gia sư' },
    8: { cat: 'Thống kê', title: 'Báo cáo & Thống kê' }
  };

  // Tiêu đề Cổng Giáo viên & Gia sư (chuẩn nghiệp vụ giảng dạy)
  const teacherTabTitles: Record<string, { cat: string; title: string }> = {
    schedule: { cat: 'Giảng dạy', title: 'Lịch dạy & Phòng học' },
    reconcile: { cat: 'Nghiệp vụ ca dạy', title: 'Đối soát công ca dạy & Gia sư' },
    evaluation: { cat: 'Chuyên môn', title: 'Hồ sơ & Đánh giá dự giờ' },
    availability: { cat: 'Thời khóa biểu', title: 'Đăng ký lịch rảnh' }
  };

  const currentInfo =
    workspaceMode === 'ADMIN'
      ? adminModuleTitles[activeModule] || { cat: 'Quản trị', title: 'Hệ thống Vận hành' }
      : teacherTabTitles[teacherPortalTab] || { cat: 'Cổng Giáo viên', title: 'Bảng Giảng Dạy' };

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = users.find(u => u.id === e.target.value);
    if (selected) {
      setCurrentUser(selected);
      if (selected.role === 'Giáo viên Giảng dạy') {
        setWorkspaceMode('TEACHER');
      } else {
        setWorkspaceMode('ADMIN');
      }
      showToast(`Đã chuyển sang tài khoản [${selected.name}] (${selected.role})`, 'info');
    }
  };

  const handleConfirmReset = () => {
    if (window.confirm('Khôi phục toàn bộ hệ thống về 1 bộ dữ liệu liên thông chuẩn xuyên suốt?')) {
      resetAllDataToDefaults();
    }
  };

  const handleConfirmClear = () => {
    if (window.confirm('XÓA SẠCH DỮ LIỆU: Thao tác này sẽ xóa toàn bộ học sinh, lớp học và khiếu nại về trạng thái trống (0 bản ghi) để bạn nhập từ đầu. Bạn có chắc chắn không?')) {
      clearAllData();
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            title="Mở menu"
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
          {/* Nút Xóa sạch dữ liệu (Empty State) */}
          <button
            onClick={handleConfirmClear}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-md border border-slate-200 hover:border-rose-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Xóa trống toàn bộ dữ liệu (0 học sinh, 0 lớp học, 0 khiếu nại)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden xl:inline">Xóa dữ liệu</span>
          </button>

          {/* Nút Khôi phục dữ liệu chuẩn */}
          <button
            onClick={handleConfirmReset}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Khôi phục 1 bộ dữ liệu liên thông chuẩn xuyên suốt"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Dữ liệu chuẩn</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Switcher đổi tài khoản / vai trò nhanh */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-role-user"
              value={currentUser.id}
              onChange={handleRoleSelect}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer max-w-[150px] lg:max-w-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.includes('Giáo viên') ? 'GV' : u.role.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Avatar người dùng hiện tại */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-semibold text-xs border border-slate-700">
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
