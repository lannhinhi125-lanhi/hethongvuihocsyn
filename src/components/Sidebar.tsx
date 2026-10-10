import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  CalendarCheck,
  Users,
  Sparkles,
  ClipboardCheck,
  PieChart,
  FileCheck,
  Clock,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    activeModule,
    setActiveModule,
    currentUser,
    workspaceMode,
    setWorkspaceMode,
    teacherPortalTab,
    setTeacherPortalTab,
    showToast
  } = useApp();

  // Menu Quản trị chuẩn theo mẫu hệ thống (có đối soát công, không có thù lao)
  const adminNavItems = [
    { id: 1, label: 'Tài khoản & Phân quyền', icon: ShieldCheck },
    { id: 2, label: 'Danh mục Dùng chung', icon: SlidersHorizontal },
    { id: 3, label: 'Hồ sơ GV & Dự giờ', icon: UserCheck },
    { id: 4, label: 'Học sinh & Ghép lớp', icon: Users },
    { id: 5, label: 'Giám sát Ca & Sự cố', icon: CalendarCheck },
    { id: 6, label: 'Trợ lý AI Giảng dạy', icon: Sparkles },
    { id: 7, label: 'Đối soát công ca dạy', icon: ClipboardCheck },
    { id: 8, label: 'Báo cáo & Thống kê', icon: PieChart }
  ];

  // Menu Cổng Giáo viên & Gia sư theo đúng luồng:
  // 1. Đăng ký lịch rảnh (lên đầu) -> 2. Lịch dạy & Phòng học -> 3. Hồ sơ & Đánh giá dự giờ -> 4. Đối soát công ca dạy
  const teacherNavItems = [
    { id: 'availability', label: 'Đăng ký lịch rảnh', icon: Clock },
    { id: 'schedule', label: 'Lịch dạy & Phòng học', icon: CalendarCheck },
    { id: 'evaluation', label: 'Hồ sơ & Đánh giá dự giờ', icon: FileCheck },
    { id: 'reconcile', label: 'Đối soát công ca dạy', icon: ClipboardCheck }
  ];

  const handleAdminNavClick = (id: number) => {
    setActiveModule(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleTeacherNavClick = (tabId: string) => {
    setTeacherPortalTab(tabId as any);
    if (onCloseMobile) onCloseMobile();
  };

  const handleToggleWorkspace = () => {
    if (workspaceMode === 'ADMIN') {
      setWorkspaceMode('TEACHER');
      showToast('Đã chuyển sang Cổng Giảng dạy (Giáo viên & Gia sư)', 'info');
    } else {
      setWorkspaceMode('ADMIN');
      showToast('Đã chuyển về Cổng Quản trị Hệ thống', 'info');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-60 bg-[#0B0F19] text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800/80 z-30 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Brand Logo VUIHOC TUTOR - Figma style clean mark */}
          <div className="p-4 pb-3 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              V
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-white leading-tight">
                VUIHOC <span className="text-indigo-400 font-medium">TUTOR</span>
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-medium text-slate-400">Operations Platform</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1 text-xs flex-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 pt-1">
              {workspaceMode === 'ADMIN' ? 'HỆ THỐNG & VẬN HÀNH' : 'CỔNG GIẢNG DẠY'}
            </div>

            {workspaceMode === 'ADMIN' ? (
              // QUẢN TRỊ VIÊN
              adminNavItems.map(item => {
                const isActive = activeModule === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleAdminNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-left cursor-pointer text-xs ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate tracking-tight">{item.label}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              // CỔNG GIÁO VIÊN & GIA SƯ
              teacherNavItems.map(item => {
                const isActive = teacherPortalTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTeacherNavClick(item.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-left cursor-pointer text-xs ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate tracking-tight">{item.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </nav>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 px-1 text-[10px] leading-none" aria-label="Thời gian hiện tại">
              <Clock className="w-3.5 h-3.5 text-indigo-300" />
              <time dateTime={currentTime.toISOString()} className="font-semibold tracking-wide text-slate-300">
                {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </time>
              <span className="text-slate-600">·</span>
              <span>{currentTime.toLocaleDateString('vi-VN')}</span>
            </div>
            <button
              onClick={handleToggleWorkspace}
              className="w-full py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60"
            >
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>{workspaceMode === 'ADMIN' ? 'Cổng Giảng dạy' : 'Cổng Quản trị'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center text-xs">
                  {currentUser.avatarInitials}
                </div>
                <div className="truncate">
                  <div className="font-medium text-slate-200 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.role}</div>
                </div>
              </div>
              <span className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Online</span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
