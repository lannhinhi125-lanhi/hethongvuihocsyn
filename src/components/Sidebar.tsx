import { usePermissions } from '../hooks/usePermissions';
import { teacherModuleIds } from '../lib/accessControl';
import { PORTAL_PREVIEW_MODE, isPreviewAccount } from '../lib/previewMode';
import { resolveAccountTeacher } from '../lib/evaluation';
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
  const { canModule } = usePermissions();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    activeModule,
    setActiveModule,
    currentUser,
    users,
    teachers,
    setCurrentUser,
    workspaceMode,
    setWorkspaceMode,
    teacherPortalTab,
    setTeacherPortalTab,
    showToast
  } = useApp();

  // Menu Quản trị chuẩn theo mẫu hệ thống (có đối soát công, không có thù lao)
  const adminNavItems = [
    { id: 1, label: 'Tài khoản & phân quyền', icon: ShieldCheck },
    { id: 2, label: 'Danh mục dùng chung', icon: SlidersHorizontal },
    { id: 3, label: 'Hồ sơ & chuyên môn', icon: UserCheck },
    { id: 4, label: 'Học sinh & ghép lớp', icon: Users },
    { id: 5, label: 'Giám sát ca & sự cố', icon: CalendarCheck },
    { id: 6, label: 'Tri thức & Cấu hình AI', icon: Sparkles },
    { id: 7, label: 'Đối soát công ca dạy', icon: ClipboardCheck },
    { id: 8, label: 'Báo cáo & thống kê', icon: PieChart }
  ];

  const adminNavGroups = [
    { title: 'Hệ thống & cấu hình', ids: [1, 2] },
    { title: 'Vận hành đào tạo', ids: [3, 4, 5] },
    { title: 'Đối soát & quản trị', ids: [6, 7, 8] }
  ];

  // Menu Cổng Giáo viên & Gia sư theo đúng luồng:
  // 1. Đăng ký lịch rảnh (lên đầu) -> 2. Lịch dạy & phòng học -> 3. Hồ sơ & chuyên môn -> 4. Đối soát công ca dạy
  const teacherNavItems = [
    { id: 'availability', label: 'Đăng ký lịch rảnh', icon: Clock },
    { id: 'schedule', label: 'Lịch dạy & phòng học', icon: CalendarCheck },
    { id: 'evaluation', label: 'Hồ sơ & chuyên môn', icon: FileCheck },
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
    if (isPreviewAccount(currentUser)) {
      setWorkspaceMode(workspaceMode === 'ADMIN' ? 'TEACHER' : 'ADMIN');
      setTeacherPortalTab('availability');
      onCloseMobile?.();
      return;
    }
    if (PORTAL_PREVIEW_MODE) {
      const target = workspaceMode === 'ADMIN'
        ? users.find(user => resolveAccountTeacher(user, teachers, users)) || users.find(user => user.status === 'active' && user.role === 'Giáo viên Giảng dạy')
        : users.find(user => user.status === 'active' && user.role === 'Quản trị Toàn quyền');
      if (!target) { showToast('Chưa có tài khoản phù hợp để kiểm tra cổng này.', 'warning'); return; }
      setCurrentUser(target);
      setTeacherPortalTab('availability');
      if (onCloseMobile) onCloseMobile();
      return;
    }
    if (!PORTAL_PREVIEW_MODE) return;
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
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-[#131329] text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-white/5 z-50 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex min-h-0 h-full flex-col">
          {/* Brand Logo VUIHOC TUTOR - Figma style clean mark */}
          <div className="px-5 py-4 border-b border-white/10 flex shrink-0 items-center gap-3 bg-gradient-to-b from-white/10 to-transparent">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-300 to-[#FF5C00] flex items-center justify-center text-white font-bold text-xl tracking-tight shadow-xs">
              V
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-white leading-tight">
                VUIHOC <span className="text-orange-400 font-semibold">TUTOR</span>
              </h1>
              <p className="text-[11px] font-normal text-[#9BAED4]">Quản lý & giảng dạy</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav aria-label={workspaceMode === 'ADMIN' ? 'Điều hướng cổng quản trị' : 'Điều hướng cổng giảng dạy'} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-5 text-xs [scrollbar-width:thin]">
            {workspaceMode === 'ADMIN' ? (
              adminNavGroups.map(group => {
                const items = adminNavItems.filter(item => group.ids.includes(item.id) && canModule('PH' + item.id));
                if (!items.length) return null;
                return <section key={group.title} aria-label={group.title} className="mb-6 last:mb-0">
                  <h2 className="mb-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[#687FA9]">{group.title}</h2>
                  <div className="space-y-1">
                    {items.map(item => {
                      const isActive = activeModule === item.id;
                      const Icon = item.icon;
                      return <button type="button" key={item.id} aria-current={isActive ? 'page' : undefined} title={item.label}
                        onClick={() => handleAdminNavClick(item.id)}
                        className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${isActive ? 'bg-[#FF5C00] text-white font-semibold shadow-sm' : 'text-[#A9BDE2] hover:bg-white/5 hover:text-white'}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="leading-5">{item.label}</span>
                      </button>;
                    })}
                  </div>
                </section>;
              })
            ) : (
              <section aria-label="Cổng giảng dạy">
                <h2 className="mb-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[#687FA9]">Cổng giảng dạy</h2>
                <div className="space-y-1">
                  {teacherNavItems.filter(item => canModule(teacherModuleIds[item.id])).map(item => {
                    const isActive = teacherPortalTab === item.id;
                    const Icon = item.icon;
                    return <button type="button" key={item.id} aria-current={isActive ? 'page' : undefined} title={item.label}
                      onClick={() => handleTeacherNavClick(item.id)}
                      className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${isActive ? 'bg-[#FF5C00] text-white font-semibold shadow-sm' : 'text-[#A9BDE2] hover:bg-white/5 hover:text-white'}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="leading-5">{item.label}</span>
                    </button>;
                  })}
                </div>
              </section>
            )}
          </nav>

          {/* User Profile Footer */}
          <div className="p-3 shrink-0 border-t border-white/10 bg-black/10 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 px-1 text-[10px] leading-none" aria-label="Thời gian hiện tại">
              <Clock className="w-3.5 h-3.5 text-orange-300" />
              <time dateTime={currentTime.toISOString()} className="font-semibold tracking-wide text-slate-300">
                {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </time>
              <span className="text-slate-600">·</span>
              <span>{currentTime.toLocaleDateString('vi-VN')}</span>
            </div>
            {PORTAL_PREVIEW_MODE && <button
              onClick={handleToggleWorkspace}
              className="w-full py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60"
            >
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>{workspaceMode === 'ADMIN' ? 'Cổng Giảng dạy' : 'Cổng Quản trị'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>}

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
