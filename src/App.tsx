import { useBusinessStatus, loadBusinessData } from './lib/businessPersistence';
import { useAccountSession, logoutAccount, refreshAccountSession } from './lib/accountSession';
import { canAccessModule, teacherModuleIds, accountPortal } from './lib/accessControl';
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
  const { activeModule, workspaceMode, teacherPortalTab, currentUser, users, roleGroups, setCurrentUser, setActiveModule, setTeacherPortalTab } = useApp();
  const session = useAccountSession();
  const business = useBusinessStatus();
  const activeAccount = session.actor ? users.find(user => user.id === session.actor!.id && user.status === 'active') : undefined;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!activeAccount) return;
    if (currentUser !== activeAccount) setCurrentUser(activeAccount);
    if (accountPortal(activeAccount,roleGroups)==='ADMIN' && !canAccessModule(activeAccount,roleGroups,'PH'+activeModule)) {
      const first=[1,2,3,4,5,6,7,8].find(id=>canAccessModule(activeAccount,roleGroups,'PH'+id));
      if(first)setActiveModule(first);
    }
    if(accountPortal(activeAccount,roleGroups)==='TEACHER' && !canAccessModule(activeAccount,roleGroups,teacherModuleIds[teacherPortalTab])) {
      const first=['availability','schedule','evaluation','reconcile'].find(tab=>canAccessModule(activeAccount,roleGroups,teacherModuleIds[tab]));
      if(first)setTeacherPortalTab(first as 'availability'|'schedule'|'evaluation'|'reconcile');
    }
  },[activeAccount,currentUser,roleGroups,activeModule,teacherPortalTab]);
  if(session.loading)return <main className="p-8" role="status">Đang kiểm tra phiên đăng nhập…</main>;
  if(!activeAccount)return <LoginView onLogin={()=>setMobileMenuOpen(false)} />;
  if(currentUser.id!==activeAccount.id)return null;
  if(business.loading)return <main className="p-8" role="status">Đang tải dữ liệu từ Supabase…</main>;
  if(business.error && !Object.keys(business.data).length)return <main className="p-8" role="alert">{business.error} <button className="underline" onClick={()=>void loadBusinessData()}>Thử tải lại</button> <button className="underline" onClick={()=>void logoutAccount()}>Đăng xuất</button></main>;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Sidebar điều hướng thông minh theo phân quyền (Quản trị vs Giáo viên & Gia sư) */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header với Breadcrumb, Switcher vai trò, Xóa & Reset dữ liệu */}
        <Header onLogout={() => { void logoutAccount(); setMobileMenuOpen(false); }} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          {business.loading && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">Đang tải dữ liệu từ Supabase…</p>}
          {business.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm">{business.error} <button className="underline" onClick={()=>void loadBusinessData()}>Tải lại dữ liệu</button></p>}
          {session.saving && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">Đang lưu dữ liệu vào Supabase…</p>}
          {session.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Không lưu được: {session.error} <button onClick={()=>void refreshAccountSession()} className="underline">Tải lại dữ liệu</button></p>}
          {session.saved && !session.saving && !session.error && <p role="status" className="mb-4 text-sm text-green-700">Đã lưu dữ liệu vào Supabase.</p>}
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
