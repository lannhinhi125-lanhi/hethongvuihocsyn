import { LoginView } from './views/LoginView';
import React, { useState } from 'react';
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
  const { activeModule, workspaceMode, teacherPortalTab, currentUser, users } = useApp();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('vuihoc_authenticated') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Sidebar điều hướng thông minh theo phân quyền (Quản trị vs Giáo viên & Gia sư) */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header với Breadcrumb, Switcher vai trò, Xóa & Reset dữ liệu */}
        <Header onLogout={() => { sessionStorage.removeItem('vuihoc_authenticated'); setAuthenticated(false); }} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <div className="max-w-7xl mx-auto w-full">
            {workspaceMode === 'ADMIN' ? (
              // ================= GIAO DIỆN QUẢN TRỊ VIÊN =================
              <>
                {activeModule === 1 && (currentUser.role === 'Quản trị Toàn quyền' ? <Module1_UsersRoles /> : <p className="p-6 text-slate-500">Chỉ quản trị viên được quản lý tài khoản và phân quyền.</p>)}
                {activeModule === 2 && <Module2_MasterData />}
                {activeModule === 3 && <Module3_Teachers />}
                {activeModule === 4 && <Module4_StudentsClasses />}
                {activeModule === 5 && <Module5_OperationsMonitoring />}
                {activeModule === 6 && <Module6_AIStudio />}
                {activeModule === 7 && <Module7_WorkReconciliation />}
                {activeModule === 8 && <Module8_Reports />}
              </>
            ) : (
              // ================= GIAO DIỆN CỔNG GIÁO VIÊN & GIA SƯ =================
              <>
                {teacherPortalTab === 'availability' && <TeacherAvailabilityView />}
                {teacherPortalTab === 'schedule' && <Module4_TeacherSchedule />}
                {teacherPortalTab === 'evaluation' && <TeacherEvaluationView />}
                {(teacherPortalTab === 'reconcile' || teacherPortalTab === 'payroll') && <TeacherWorkReconciliationView />}
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
