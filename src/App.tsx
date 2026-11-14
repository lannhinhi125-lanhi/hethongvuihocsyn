import { useBusinessStatus, loadBusinessData } from './lib/businessPersistence';
import { useAccountSession, logoutAccount, refreshAccountSession, hasRememberedAccountSession } from './lib/accountSession';
import { canAccessModule, teacherModuleIds, accountPortal } from './lib/accessControl';
import { LoginView } from './views/LoginView';
import React, { useEffect, useState, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
const Module1_UsersRoles = React.lazy(() => import('./views/Module1_UsersRoles').then(m => ({ default: m.Module1_UsersRoles })));
const Module2_MasterData = React.lazy(() => import('./views/Module2_MasterData').then(m => ({ default: m.Module2_MasterData })));
const Module3_Teachers = React.lazy(() => import('./views/Module3_Teachers').then(m => ({ default: m.Module3_Teachers })));
const Module4_StudentsClasses = React.lazy(() => import('./views/Module4_StudentsClasses').then(m => ({ default: m.Module4_StudentsClasses })));
const Module4_TeacherSchedule = React.lazy(() => import('./views/Module4_TeacherSchedule').then(m => ({ default: m.Module4_TeacherSchedule })));
const Module5_OperationsMonitoring = React.lazy(() => import('./views/Module5_OperationsMonitoring').then(m => ({ default: m.Module5_OperationsMonitoring })));
const Module6_AIStudio = React.lazy(() => import('./views/Module6_AIStudio').then(m => ({ default: m.Module6_AIStudio })));
const Module7_WorkReconciliation = React.lazy(() => import('./views/Module7_WorkReconciliation').then(m => ({ default: m.Module7_WorkReconciliation })));
const ReportWorkspace = React.lazy(() => import('./views/ReportWorkspace').then(m => ({ default: m.ReportWorkspace })));
const Workbench = React.lazy(() => import('./views/Workbench').then(m => ({ default: m.Workbench })));
const TeacherEvaluationView = React.lazy(() => import('./views/TeacherEvaluationView').then(m => ({ default: m.TeacherEvaluationView })));
const TeacherAvailabilityView = React.lazy(() => import('./views/TeacherAvailabilityView').then(m => ({ default: m.TeacherAvailabilityView })));
const TeacherWorkReconciliationView = React.lazy(() => import('./views/TeacherWorkReconciliationView').then(m => ({ default: m.TeacherWorkReconciliationView })));

const MainLayout: React.FC = () => {
  const { activeModule, workspaceMode, teacherPortalTab, currentUser, users, roleGroups, setCurrentUser, setActiveModule, setTeacherPortalTab } = useApp();
  const session = useAccountSession();
  const business = useBusinessStatus();
  const activeAccount = session.actor ? users.find(user => user.id === session.actor!.id && user.status === 'active') : undefined;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const openedAccount=useRef<string|null>(null);
  useEffect(() => {
    if (!activeAccount) {openedAccount.current=null;return;}
    if (currentUser !== activeAccount) setCurrentUser(activeAccount);
    if(openedAccount.current!==activeAccount.id){
      openedAccount.current=activeAccount.id;
      if(accountPortal(activeAccount,roleGroups)==='ADMIN'){
        const first=[0,1,2,3,4,5,6,7,8].find(id=>canAccessModule(activeAccount,roleGroups,'PH'+id));
        if(first!==undefined)setActiveModule(first);
      }
    }
    if (accountPortal(activeAccount,roleGroups)==='ADMIN' && !canAccessModule(activeAccount,roleGroups,'PH'+activeModule)) {
      const first=[0,1,2,3,4,5,6,7,8].find(id=>canAccessModule(activeAccount,roleGroups,'PH'+id));
      if(first!==undefined)setActiveModule(first);
    }
    if(accountPortal(activeAccount,roleGroups)==='TEACHER' && !canAccessModule(activeAccount,roleGroups,teacherModuleIds[teacherPortalTab])) {
      const first=['availability','schedule','evaluation','reconcile'].find(tab=>canAccessModule(activeAccount,roleGroups,teacherModuleIds[tab]));
      if(first)setTeacherPortalTab(first as 'availability'|'schedule'|'evaluation'|'reconcile');
    }
  },[activeAccount,currentUser,roleGroups,activeModule,teacherPortalTab]);
  if(session.loading)return <main className="p-8" role="status">Đang kiểm tra phiên đăng nhập…</main>;
  if(!activeAccount && hasRememberedAccountSession() && session.error)return <main className="space-y-3 p-8" role="alert"><p>Chưa thể kết nối để khôi phục phiên đăng nhập. Bạn có thể thử lại mà không cần đăng nhập lại.</p><p>{session.error}</p><button className="mr-4 underline" onClick={()=>void refreshAccountSession()}>Thử kết nối lại</button><button className="underline" onClick={()=>void logoutAccount()}>Đăng xuất</button></main>;
  if(!activeAccount)return <LoginView onLogin={()=>setMobileMenuOpen(false)} />;
  if(currentUser.id!==activeAccount.id)return null;
  if(business.loading)return <main className="p-8" role="status">Đang tải dữ liệu…</main>;
  if(business.error && !Object.keys(business.data).length)return <main className="p-8" role="alert">{business.error} <button className="underline" onClick={()=>void loadBusinessData()}>Thử tải lại</button> <button className="underline" onClick={()=>void logoutAccount()}>Đăng xuất</button></main>;

  return (
    <div className="workspace-ui flex h-dvh min-h-0 overflow-hidden bg-[#f8f9fc] text-slate-800 antialiased font-sans">
      {/* Sidebar điều hướng thông minh theo phân quyền (Quản trị vs Giáo viên & Gia sư) */}
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} onLogout={() => { void logoutAccount(); setMobileMenuOpen(false); }} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* Header với Breadcrumb, Switcher vai trò, Xóa & Reset dữ liệu */}
        <Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(value => !value)} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Scrollable Main Content */}
        <main className="workspace-content relative flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 sm:p-4 min-w-0">
          {business.loading && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">Đang tải dữ liệu…</p>}
          {session.saving && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">Đang lưu…</p>}
          <div className={workspaceMode === 'ADMIN' && activeModule === 5 ? 'w-full' : 'max-w-[1600px] mx-auto w-full'}>
            <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-sm font-medium text-slate-500 animate-pulse">Đang tải phân hệ…</div>}>
              {workspaceMode === 'ADMIN' && accountPortal(currentUser, roleGroups) === 'ADMIN' ? (
                // ================= GIAO DIỆN QUẢN TRỊ VIÊN =================
                <>
                  {!canAccessModule(currentUser, roleGroups, 'PH' + activeModule) && <p role="alert" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Nhóm quyền chưa được cấp quyền truy cập phân hệ này.</p>}
                  {activeModule === 1 && canAccessModule(currentUser, roleGroups, 'PH1') && <Module1_UsersRoles />}
                  {activeModule === 2 && canAccessModule(currentUser, roleGroups, 'PH2') && <Module2_MasterData />}
                  {activeModule === 3 && canAccessModule(currentUser, roleGroups, 'PH3') && <Module3_Teachers />}
                  {activeModule === 4 && canAccessModule(currentUser, roleGroups, 'PH4') && <Module4_StudentsClasses />}
                  {activeModule === 5 && canAccessModule(currentUser, roleGroups, 'PH5') && <Module5_OperationsMonitoring />}
                  {activeModule === 6 && canAccessModule(currentUser, roleGroups, 'PH6') && <Module6_AIStudio />}
                  {activeModule === 7 && canAccessModule(currentUser, roleGroups, 'PH7') && <Module7_WorkReconciliation />}
                  {activeModule === 0 && canAccessModule(currentUser, roleGroups, 'PH0') && <Workbench />}
                  {activeModule === 8 && canAccessModule(currentUser, roleGroups, 'PH8') && <ReportWorkspace />}
                </>
              ) : (
                // ================= GIAO DIỆN CỔNG GIÁO VIÊN & GIA SƯ =================
                <>
                  {!canAccessModule(currentUser, roleGroups, teacherModuleIds[teacherPortalTab]) && <p role="alert" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Nhóm quyền chưa được cấp quyền truy cập phân hệ giảng dạy này.</p>}
                  {teacherPortalTab === 'availability' && canAccessModule(currentUser, roleGroups, teacherModuleIds[teacherPortalTab]) && <TeacherAvailabilityView />}
                  {teacherPortalTab === 'schedule' && canAccessModule(currentUser, roleGroups, teacherModuleIds[teacherPortalTab]) && <Module4_TeacherSchedule />}
                  {teacherPortalTab === 'evaluation' && canAccessModule(currentUser, roleGroups, teacherModuleIds[teacherPortalTab]) && <TeacherEvaluationView />}
                  {(teacherPortalTab === 'reconcile' || teacherPortalTab === 'payroll') && canAccessModule(currentUser, roleGroups, 'T_RECONCILE') && <TeacherWorkReconciliationView />}
                </>
              )}
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
