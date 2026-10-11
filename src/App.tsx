import { canAccessModule, teacherModuleIds, accountPortal } from './lib/accessControl';
import { PORTAL_PREVIEW_MODE } from './lib/previewMode';
import { resolveActiveAccount } from './lib/workflow';
import { LoginView } from './views/LoginView';
import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Module1_UsersRoles } from './views/Module1_UsersRoles';
import { Module2_MasterData } from './views/Module2_MasterData';
import { Module3_Teachers } from './views/Module3_Teachers';
import { Module4_StudentsClasses } from './views/Module4_StudentsClasses';
import { Module4_TeacherSchedule } from './views/Module4_TeacherSchedule';
import { Module5_OperationsMonitoring } from './views/Module5_OperationsMonitoring';
import { Module6_AIStudio } from './views/Module6_AIStudio';
import { Module7_WorkReconciliation } from './views/Module7_WorkReconciliation';
import { Module8_Reports } from './views/Module8_Reports';
import { TeacherEvaluationView } from './views/TeacherEvaluationView';
import { TeacherAvailabilityView } from './views/TeacherAvailabilityView';
import { TeacherWorkReconciliationView } from './views/TeacherWorkReconciliationView';

const MainLayout: React.FC = () => {
  const { activeModule, workspaceMode, teacherPortalTab, currentUser, users, roleGroups, setCurrentUser, setActiveModule } = useApp();
  const [authenticatedUserId, setAuthenticatedUserId] = useState(() => sessionStorage.getItem('vuihoc_authenticated_user_id'));
  const activeAccount = PORTAL_PREVIEW_MODE
    ? resolveActiveAccount(users, currentUser.id) || users.find(user => user.status === 'active' && user.role === 'Quản trị Toàn quyền')
    : resolveActiveAccount(users, authenticatedUserId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!PORTAL_PREVIEW_MODE || users.some(user => user.id === currentUser.id)) return;
    const admin = users.find(user => user.role === 'Quản trị Toàn quyền' && user.status === 'active');
    if (admin) setCurrentUser(admin);
  }, []);

  useEffect(() => {
    if (activeAccount && activeAccount !== currentUser) setCurrentUser(activeAccount);
    if (activeAccount && workspaceMode === 'ADMIN' && !canAccessModule(activeAccount, roleGroups, 'PH' + activeModule)) {
      const first = [1,2,3,4,5,6,7,8].find(id => canAccessModule(activeAccount, roleGroups, 'PH' + id));
      if (first) setActiveModule(first);
    }
  }, [activeAccount, currentUser, activeModule, workspaceMode, roleGroups, setCurrentUser, setActiveModule]);

  useEffect(() => {
    if (!PORTAL_PREVIEW_MODE && authenticatedUserId && !activeAccount) {
      sessionStorage.removeItem('vuihoc_authenticated_user_id');
      sessionStorage.removeItem('vuihoc_authenticated');
      setAuthenticatedUserId(null);
    }
  }, [authenticatedUserId, activeAccount]);

  if (!activeAccount) return <LoginView onLogin={userId => {
    sessionStorage.setItem('vuihoc_authenticated_user_id', userId);
    setAuthenticatedUserId(userId);
    setMobileMenuOpen(false);
  }} />;
  if (currentUser !== activeAccount) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Sidebar điều hướng thông minh theo phân quyền (Quản trị vs Giáo viên & Gia sư) */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header với Breadcrumb, Switcher vai trò, Xóa & Reset dữ liệu */}
        <Header onLogout={() => { sessionStorage.removeItem('vuihoc_authenticated'); sessionStorage.removeItem('vuihoc_authenticated_user_id'); setAuthenticatedUserId(null); setMobileMenuOpen(false); }} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <div className="max-w-7xl mx-auto w-full">
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
                {activeModule === 8 && canAccessModule(currentUser, roleGroups, 'PH8') && <Module8_Reports />}
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
