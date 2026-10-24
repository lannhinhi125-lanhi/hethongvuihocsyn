import { ConfirmAction } from '../components/ConfirmAction';
import { canAssignClassMaterials } from '../lib/classMaterialEligibility';
import {classBindingEditIssue,studentsNeedingScheduleValidation} from '../lib/classEditing';
import {studentStudyEditIssue,teacherStudyEditIssue,teacherScheduleEditIssue} from '../lib/profileEditing';
import { updateStudentRegistration, studentScheduleConflict } from '../lib/studentRegistrations';
import { useBusinessValue, useBusinessStatus, loadBusinessData, refreshBusinessData, resetBusinessData, acceptBusinessTeacher, businessSaving, getBusinessSnapshot, setBusinessValue } from '../lib/businessPersistence';
import { persistTeacher } from '../lib/teacherPersistence';
import { teacherSessionRequest, useAccountSession, setSessionUsers, setSessionGroups, logoutAccount, getAccountSnapshot } from '../lib/accountSession';
import { PORTAL_PREVIEW_MODE, PREVIEW_ACCOUNT, isPreviewAccount } from '../lib/previewMode';
import { assignedRole, hasPermission, changedFields, accountPortal } from '../lib/accessControl';
import { classChangeAllowed, teacherChangeAllowed, incidentChangeAllowed } from '../lib/mutationPermissions';
import { payrollLockIssue } from '../lib/workflow';
import { resolveAccountTeacher } from '../lib/evaluation';
import { canManageTeacherProfiles } from '../lib/teacherAccounts';
import type { CategoryGroup } from '../components/CategoryMultiFilter';
import { clearLegacyBrowserData, runtimeStorage } from '../lib/localData';
import { canEditTeacherAvailability } from '../lib/teacherAvailability';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  SystemRoleGroup,
  SubjectItem,
  LevelItem,
  TimeSlotItem,
  ClassModelItem,
  IncidentCategory,
  TeacherProfile,
  StudentRecord,
  ClassItem,
  SOPDocument,
  RAGBotConfig,
  MonthPayrollData,
  DisputeItem,
  SessionPayrollRecord
} from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export type WorkspaceMode = 'ADMIN' | 'TEACHER';

interface AppContextType {
  teachingCategories: CategoryGroup[];
  setTeachingCategories: React.Dispatch<React.SetStateAction<CategoryGroup[]>>;
  createTeacherWithAccount: (teacher: Omit<TeacherProfile, 'id' | 'username' | 'passwordRaw'>) => Promise<{ id: string; username: string; password: string } | null>;
  // Navigation & Role
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  activeModule: number; // 1 -> 8 cho Admin
  setActiveModule: (mod: number) => void;
  reportSection: 'detail' | 'custom';
  setReportSection: React.Dispatch<React.SetStateAction<'detail' | 'custom'>>;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  teacherPortalTab: 'schedule' | 'availability' | 'payroll' | 'evaluation' | 'reconcile';
  setTeacherPortalTab: (tab: 'schedule' | 'availability' | 'payroll' | 'evaluation' | 'reconcile') => void;

  // Toast
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

  // PH1: Users & Roles
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  roleGroups: SystemRoleGroup[];
  setRoleGroups: React.Dispatch<React.SetStateAction<SystemRoleGroup[]>>;
  addUser: (user: Omit<UserAccount, 'id'>) => boolean;
  updateUser: (id: string, updates: Partial<UserAccount>) => boolean;
  toggleLockUser: (id: string) => void;

  // PH2: Master Data
  subjects: SubjectItem[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectItem[]>>;
  levels: LevelItem[];
  setLevels: React.Dispatch<React.SetStateAction<LevelItem[]>>;
  timeSlots: TimeSlotItem[];
  setTimeSlots: React.Dispatch<React.SetStateAction<TimeSlotItem[]>>;
  models: ClassModelItem[];
  setModels: React.Dispatch<React.SetStateAction<ClassModelItem[]>>;
  incidents: IncidentCategory[];
  setIncidents: React.Dispatch<React.SetStateAction<IncidentCategory[]>>;

  // PH3: Teachers & Inspections
  teachers: TeacherProfile[];
  setTeachers: React.Dispatch<React.SetStateAction<TeacherProfile[]>>;
  addTeacher: (teacher: TeacherProfile) => void;
  updateTeacher: (id: string, updates: Partial<TeacherProfile>) => boolean;

  // PH4: Students & Classes (Quản trị)
  students: StudentRecord[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRecord[]>>;
  classes: ClassItem[];
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
  addStudent: (student: StudentRecord) => boolean;
  updateStudent: (id: string, updates: Partial<StudentRecord>) => boolean;
  deleteStudent: (id: string) => void;
  addClass: (cls: ClassItem) => boolean;
  updateClass: (id: string, updates: Partial<ClassItem>, successMessage?: string) => boolean;
  deleteClass: (id: string) => void;
  batchAssignMaterials: (classIds: string[], materials: ClassItem['materials']) => void;
  batchImportRoomLinks: (updates: { classCode: string; roomLink: string }[]) => { updated: number; skipped: number };

  // PH5: Operations & Monitoring (Giám sát ca & Cover)
  reportIncidentToSession: (classCode: string, incidentCode: string, note: string, date: string, timeRange: string) => Promise<boolean>;
  assignCoverTeacher: (sessionId: string, newTeacherId: string) => void;

  // PH6: AI Studio
  sopDocuments: SOPDocument[];
  setSopDocuments: React.Dispatch<React.SetStateAction<SOPDocument[]>>;
  ragBotConfig: RAGBotConfig;
  setRagBotConfig: React.Dispatch<React.SetStateAction<RAGBotConfig>>;
  activeToneKey: string;
  setActiveToneKey: (key: string) => void;
  toneDirectives: Record<string, { name: string; directive: string }>;
  setToneDirectives: React.Dispatch<React.SetStateAction<Record<string, { name: string; directive: string }>>>;

  // PH7: Payroll & Disputes
  payrollStore: Record<string, MonthPayrollData>;
  setPayrollStore: React.Dispatch<React.SetStateAction<Record<string, MonthPayrollData>>>;
  updateSessionCredit: (month: string, teacherId: string, sessionId: string, newCoeff: number, note?: string) => boolean;
  sendPayrollToTeachers: (month: string, teacherIds: string[]) => void;
  submitDispute: (month: string, dispute: DisputeItem) => boolean;
  reviewDispute: (month: string, disputeId: string, status: 'DA_DUYET' | 'TU_CHOI' | 'CHO_DUYET', note: string, creditCoeff: number) => boolean;
  lockPayrollMonth: (month: string) => void;
  unlockPayrollMonth: (month: string, reason: string) => void;

  // Reset demo data
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_USER: UserAccount = { id: '', name: '', username: '', passwordRaw: '', email: '', phone: '', role: 'Quản trị Toàn quyền', status: 'locked', avatarInitials: '' };
const EMPTY_RAG_CONFIG: RAGBotConfig = { welcomeGreeting: '',  personaTone: '', strictGroundingOnly: true, fallbackResponse: '', systemPrompt: '' };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Không đọc cache hoặc tự sinh dữ liệu mẫu. Dữ liệu mẫu chỉ nằm trong SQL.
  const [currentUser, setCurrentUser] = useState<UserAccount>(PORTAL_PREVIEW_MODE ? PREVIEW_ACCOUNT : EMPTY_USER);
  const [activeModule, setActiveModule] = useState<number>(0);
  const [reportSection, setReportSection] = useState<'detail' | 'custom'>('detail');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('ADMIN');
  const [teacherPortalTab, setTeacherPortalTab] = useState<'schedule' | 'availability' | 'payroll' | 'evaluation' | 'reconcile'>('availability');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const accountSession = useAccountSession();
  const users = accountSession.users, roleGroups = accountSession.groups;
  const setUsers = setSessionUsers, setRoleGroups = setSessionGroups;
  useEffect(() => { setCurrentUser(accountSession.actor || EMPTY_USER); }, [accountSession.actor]);
  const [teachingCategories, setTeachingCategories] = useBusinessValue<CategoryGroup[]>('teaching_categories');
  const [subjects, setSubjects] = useBusinessValue<SubjectItem[]>('subjects');
  const [levels, setLevels] = useBusinessValue<LevelItem[]>('levels');
  const [storedTimeSlots, setTimeSlots] = useBusinessValue<TimeSlotItem[]>('time_slots');
  const timeSlots = React.useMemo(() => {
    const startMinutes = (slot: TimeSlotItem) => {
      const match = slot.timeRange.match(/^\s*(\d{1,2}):(\d{2})/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
    };
    return [...storedTimeSlots].sort((a, b) => startMinutes(a) - startMinutes(b));
  }, [storedTimeSlots]);
  const [models, setModels] = useBusinessValue<ClassModelItem[]>('class_models');
  const [incidents, setIncidents] = useBusinessValue<IncidentCategory[]>('incident_categories');
  const [teachers, setTeachers] = useBusinessValue<TeacherProfile[]>('teachers');
  const [students, setStudents] = useBusinessValue<StudentRecord[]>('students');
  const [classes, setClasses] = useBusinessValue<ClassItem[]>('classes');
  const [sopDocuments, setSopDocuments] = useBusinessValue<SOPDocument[]>('sop_documents');
  const [ragBotConfig, setRagBotConfig] = useBusinessValue<RAGBotConfig>('rag_bot_config');
  const [activeToneKey, setActiveToneKey] = useBusinessValue<string>('active_tone_key');
  const [toneDirectives, setToneDirectives] = useBusinessValue<Record<string, { name: string; directive: string }>>('tone_directives');
  const [payrollStore, setPayrollStore] = useBusinessValue<Record<string, MonthPayrollData>>('monthly_payroll');
  const businessStatus = useBusinessStatus();
  const contactVersion=JSON.stringify(accountSession.users.map(user=>[user.id,user.name,user.username,user.email,user.phone]));
  const previousContactVersion=React.useRef(contactVersion);
  useEffect(()=>{
    if(previousContactVersion.current===contactVersion || businessStatus.loading || businessStatus.saving)return;
    previousContactVersion.current=contactVersion;
    if(accountSession.actor)void refreshBusinessData();
  },[contactVersion,businessStatus.loading,businessStatus.saving,accountSession.actor?.id]);
  useEffect(() => {
    if (!accountSession.actor || isPreviewAccount(accountSession.actor)) return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshBusinessData(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [accountSession.actor?.id]);
  const teacherAccess = JSON.stringify(accountSession.groups.map(g=>[g.id,g.permissions,g.portal]));
  useEffect(() => {
    resetBusinessData();
    if (accountSession.actor && !isPreviewAccount(accountSession.actor)) void loadBusinessData();
    return resetBusinessData;
  }, [accountSession.actor?.id, accountSession.actor?.roleGroupId, teacherAccess]);
  useEffect(() => { if (businessStatus.error) showToast(businessStatus.error,'error'); },[businessStatus.error]);
  useEffect(() => { if (businessStatus.saved && !businessStatus.saving && !businessStatus.error) showToast('Lưu thành công.','success'); },[businessStatus.saved, businessStatus.saving]);
  useEffect(() => { if (accountSession.error) showToast(accountSession.error, 'error'); }, [accountSession.error]);
  useEffect(() => { if (accountSession.saved && !accountSession.saving && !accountSession.error) showToast('Lưu thành công.', 'success'); }, [accountSession.saving, accountSession.saved]);
  // Tự động chuyển workspace khi đổi user
  useEffect(() => {
    if (accountPortal(currentUser, roleGroups) === 'TEACHER') {
      setWorkspaceMode('TEACHER');
    } else {
      setWorkspaceMode('ADMIN');
    }
  }, [currentUser, roleGroups]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const business = getBusinessSnapshot(), accounts = getAccountSnapshot();
    if ((type === 'success' || type === 'info') && (business.saving || accounts.saving)) return;
    if (type === 'success' && (business.error || accounts.error)) return;
    if (type === 'success' && businessSaving()) { message='Đang lưu…'; type='info'; }
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => prev.some(t=>t.type===type&&t.message===message)?prev:[...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, type==='error'||type==='warning'?9000:3200);
  };

  const actor = users.find(user => user.id === currentUser.id) || (PORTAL_PREVIEW_MODE && currentUser.id === PREVIEW_ACCOUNT.id ? PREVIEW_ACCOUNT : { ...currentUser, status: 'locked' as const });
  const can = (permission: string) => hasPermission(actor, roleGroups, permission);
  const permit = (permission: string) => {
    if (can(permission)) return true;
    showToast('Nhóm quyền của bạn không được phép thực hiện thao tác này.', 'error'); return false;
  };
  const guardedSetter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, allowed: string | ((before: T, after: T) => boolean)): React.Dispatch<React.SetStateAction<T>> => action => {
    if (typeof allowed === 'string' && !permit(allowed)) return;
    setter(before => {
      const after = typeof action === 'function' ? (action as (value: T) => T)(before) : action;
      if (typeof allowed === 'function' && !allowed(before, after)) {
        queueMicrotask(() => showToast('Thao tác bị từ chối do nhóm quyền không cho phép thay đổi dữ liệu này.', 'error')); return before;
      }
      return after;
    });
  };
  const ownTeacher = resolveAccountTeacher(actor, teachers, users);
  // PH1 Actions
  const addUser = (newUser: Omit<UserAccount, 'id'>) => {
    if (!permit('Tạo, sửa, xóa & Gán Nhóm quyền')) return false;
    if (!assignedRole({ ...newUser, id: '' }, roleGroups)) { showToast('Chọn nhóm quyền đang tồn tại.', 'error'); return false; }
    if (!permit("Cấp tài khoản & Mật khẩu người dùng")) return false;
    const id = 'USR-' + crypto.randomUUID();
    const user: UserAccount = { ...newUser, id };
    setUsers(prev => [user, ...prev]);
    showToast(`Đang lưu tài khoản [${user.username}]…`, 'info');
    return true;
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    if(!users.some(user=>user.id===id)){showToast('Tài khoản không còn tồn tại. Hãy tải lại dữ liệu.','error');return false;}
    if (['role', 'roleGroupId'].some(key => key in updates) && !permit('Tạo, sửa, xóa & Gán Nhóm quyền')) return false;
    if (!permit("Chỉnh sửa thông tin tài khoản & Mật khẩu")) return false;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    showToast('Đang lưu thông tin tài khoản…', 'info');
    return true;
  };

  const toggleLockUser = (id: string) => {
    if (!permit("Khóa / Mở khóa tài khoản nhân sự")) return;
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'active' ? 'locked' : 'active';
        showToast(`Đã ${nextStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản [${u.username}]`, 'info');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const createTeacherWithAccount: AppContextType['createTeacherWithAccount'] = async (profile) => {
    if (!can('Thêm/sửa hồ sơ và cấp tài khoản giáo viên') && !can('Tạo hồ sơ và cấp tài khoản giáo viên')) { showToast('Bạn chưa được cấp quyền tạo hồ sơ giáo viên.', 'error'); return null; }
    try {
      const result = await persistTeacher(profile);
      acceptBusinessTeacher(result.teacher);
      return {id:result.id,username:result.username,password:result.password};
    } catch (error) { showToast((error as Error).message,'error'); return null; }
  };

  // PH3 Actions
  const addTeacher = (teacher: TeacherProfile) => {
    if (!permit("Thêm/sửa hồ sơ và cấp tài khoản giáo viên")) return;
    setTeachers(prev => [teacher, ...prev]);
    showToast(`Đã thêm hồ sơ Giáo viên [${teacher.name}] thành công!`, 'success');
  };

  const updateTeacher = (id: string, updates: Partial<TeacherProfile>) => {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher || !teacherChangeAllowed([teacher], [{ ...teacher, ...updates }], can, isPreviewAccount(actor) ? id : ownTeacher?.id)) { showToast('Bạn không có quyền sửa các trường hồ sơ đã chọn.', 'error'); return false; }
    const editsProfile = Object.keys(updates).some(key => !['schedule', 'freeSlots', 'busySlots', 'isFull', 'evalStatus', 'evalScore', 'evalComment', 'evalCriteriaScores', 'evaluationReports'].includes(key));
    if (editsProfile && !canManageTeacherProfiles(currentUser, roleGroups)) { showToast('Bạn chưa được cấp quyền sửa hồ sơ giáo viên.', 'error'); return false; }
    const editsAvailability = ['schedule', 'freeSlots', 'busySlots', 'isFull'].some(key => Object.prototype.hasOwnProperty.call(updates, key));
    if (!teacher || (editsAvailability && !canEditTeacherAvailability(currentUser, teacher))) {
      showToast('Chỉ giáo viên được cập nhật lịch rảnh của mình.', 'warning');
      return false;
    }
    if (editsProfile && teacher) {
      const linked = users.find(u => u.id === teacher.user_id);
      if (updates.email && updates.email.trim().toLowerCase()!==teacher.email.trim().toLowerCase() && users.some(u => u.id !== linked?.id && u.email.toLowerCase() === updates.email!.trim().toLowerCase())) { showToast('Email đã được sử dụng.', 'error'); return false; }
    }
    const next={...teacher,...updates};
    const issue=teacherStudyEditIssue(teacher,next,classes) || (editsAvailability && teacherScheduleEditIssue(teacher,next,classes,timeSlots));
    if(issue){showToast(issue,'warning');return false;}
    setTeachers(prev => prev.map(t => t.id === id ? next : t));
    showToast('Cập nhật hồ sơ Giáo viên thành công!', 'success');
    return true;
  };

  // PH4 Actions
  const addStudent = (student: StudentRecord) => {
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return false;
    setStudents(prev => [updateStudentRegistration(student, student), ...prev]);
    showToast(`Đã tiếp nhận hồ sơ học sinh [${student.name}]!`, 'success');
    return true;
  };

  const updateStudent = (id: string, updates: Partial<StudentRecord>) => {
    const existing=students.find(student=>student.id===id);
    if(!existing){showToast('Học sinh không còn tồn tại. Hãy tải lại dữ liệu.','error');return false;}
    if ('currentClassCode' in updates && (updates.currentClassCode || '')!==(existing.currentClassCode || '') && !permit('Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)')) return false;
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return false;
    const next=updateStudentRegistration(existing,updates);
    const issue=studentStudyEditIssue(existing,next,classes);
    if(issue){showToast(issue,'warning');return false;}
    setStudents(prev => prev.map(s => s.id === id ? next : s));
    showToast('Cập nhật hồ sơ học sinh thành công!', 'success');
    return true;
  };

  const deleteStudent = (id: string) => {
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return;
    if(classes.some(cls=>cls.studentIds.includes(id)&&!['Dừng lớp','Đã kết thúc'].includes(cls.status||''))){showToast('Dừng hoạt động các lớp của học sinh trước khi xóa hồ sơ.','warning');return;}
    setStudents(prev => prev.filter(s => s.id !== id));
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: c.studentIds.filter(sid => sid !== id)
    })));
    showToast('Đã xóa hồ sơ học sinh khỏi hệ thống!', 'info');
  };

  const addClass = (cls: ClassItem) => {
    if (!classChangeAllowed([], [cls], can)) { showToast('Bạn chưa có đủ quyền tạo lớp và gán học sinh/giáo viên.', 'error'); return false; }
    if (!permit("Tạo, sửa, xóa lớp và cập nhật link phòng học")) return false;
    if (cls.studentIds.some(id => studentScheduleConflict(id, cls, classes))) { showToast('Lịch lớp trùng với lớp môn khác của học sinh.', 'error'); return false; }
    setClasses(prev => [cls, ...prev]);
    showToast(`Khởi tạo thành công lớp [${cls.code}]!`, 'success');
    return true;
  };

  const updateClass = (id: string, updates: Partial<ClassItem>, successMessage?: string) => {
    const existing = classes.find(item => item.id === id);
    if (!existing || !classChangeAllowed([existing], [{ ...existing, ...updates }], can, ownTeacher?.id, ownTeacher?.name)) { showToast('Bạn không có quyền sửa các trường lớp học đã chọn.', 'error'); return false; }
    const releasing = updates.status === 'Dừng lớp' || updates.status === 'Đã kết thúc';
    if (releasing) updates = { ...updates, studentIds: [] };
    const next = { ...existing, ...updates };
    const bindingIssue=classBindingEditIssue(existing,next);
    if(bindingIssue){showToast(bindingIssue,'warning');return false;}
    if (studentsNeedingScheduleValidation(existing,next).some(studentId => studentScheduleConflict(studentId, next, classes))) {
      showToast('Lịch lớp trùng với lớp môn khác của học sinh đã chọn.', 'error'); return false;
    }
    setClasses(prev => prev.map(c => c.id === id ? next : c));
    showToast(successMessage || 'Cập nhật lớp học thành công!', 'success');
    return true;
  };

  const deleteClass = (id: string) => {
    if (!permit("Tạo, sửa, xóa lớp và cập nhật link phòng học")) return;
    const existing=classes.find(cls=>cls.id===id);
    if(existing&&!['Dừng lớp','Đã kết thúc'].includes(existing.status||'')&&(existing.teacherId||existing.studentIds.length)){showToast('Dừng hoạt động lớp để giải phóng ca trước khi xóa.','warning');return;}
    setClasses(prev => prev.filter(c => c.id !== id));
    showToast('Đã xóa lớp học thành công! Học sinh đã được đưa về danh sách chờ xếp lớp.', 'info');
  };

  const batchAssignMaterials = (classIds: string[], newMaterials: ClassItem['materials']) => {
    if (!permit("Thêm, sửa, xóa và nạp học liệu theo tuần")) return;
    if (classIds.some(id=>!classes.some(cls=>cls.id===id && canAssignClassMaterials(cls)))) {
      showToast('Chỉ gắn học liệu cho lớp đang học, không tạm dừng và còn hạn.','warning');return;
    }
    setClasses(prev => prev.map(c => {
      if (classIds.includes(c.id)) {
        const targetMonth = newMaterials[0]?.month;
        const targetWeek = newMaterials[0]?.week;
        const filtered = (c.materials || []).filter(m => m.month !== targetMonth || m.week !== targetWeek);
        return {
          ...c,
          materials: [...filtered, ...newMaterials]
        };
      }
      return c;
    }));
    showToast(`Đã phân phối học liệu thành công tới ${classIds.length} lớp học!`, 'success');
  };

  const batchImportRoomLinks = (updates: { classCode: string; roomLink: string }[]) => {
    if (!permit("Tạo, sửa, xóa lớp và cập nhật link phòng học")) return { updated: 0, skipped: 0 };
    let updated = 0;
    let skipped = 0;
    setClasses(prev => prev.map(c => {
      const match = updates.find(u => u.classCode === c.code);
      if (match && match.roomLink) {
        if (!c.roomLink || c.roomLink.trim() === '') {
          updated++;
          return { ...c, roomLink: match.roomLink };
        } else {
          skipped++;
        }
      }
      return c;
    }));
    return { updated, skipped };
  };

  // PH5: Operations & Monitoring (Điều phối Cover & Báo cáo Sự cố liên thông PH7)
  const reportIncidentToSession: AppContextType['reportIncidentToSession'] = async (classCode,incidentCode,note,date,timeRange) => {
    if (!can('Ghi nhận và xử lý sự cố ca dạy')) return false;
    try {
      await teacherSessionRequest('vuihoc_report_lesson_incident',{p_class_code:classCode,p_date:date,p_time_range:timeRange,p_incident_code:incidentCode,p_note:note});
      await loadBusinessData();showToast('Lưu báo cáo sự cố thành công.','success');return true;
    } catch(error){showToast((error as Error).message,'error');return false;}
  };

  const assignCoverTeacher = (sessionId: string, newTeacherId: string) => {
    if (!permit('Tìm và phân công giáo viên dạy thay')) return;
    const teacher = teachers.find(item => item.id === newTeacherId);
    const lessons = getBusinessSnapshot().data.dated_lessons || [];
    const payrollSession = Object.values(payrollStore).flatMap(month => month.teachers).flatMap(row => row.sessions).find(row => row.id === sessionId);
    const lesson = lessons.find((item: any) => item.id === (payrollSession?.lessonId || sessionId));
    if (!teacher || !lesson) { showToast('Không tìm thấy mã giáo viên hoặc buổi học cần phân công.', 'error'); return; }
    setBusinessValue('dated_lessons', lessons.map((item: any) => item.id === lesson.id ? { ...item, coverTeacherId: newTeacherId } : item));
  };

  // PH7 Actions
  const updateSessionCredit = (month: string, teacherId: string, sessionId: string, newCoeff: number, note?: string) => {
    if (!permit("Điều chỉnh hệ số công từng buổi kèm lý do")) return false;
    if (!Number.isFinite(newCoeff) || Math.abs(newCoeff) > 999.999) { showToast('Hệ số công phải là số từ -999.999 đến 999.999.', 'error'); return false; }
    if (payrollStore[month]?.isLocked) {
      showToast('Không thể sửa công khi kỳ đã khóa. Hãy mở khóa kỳ trước khi điều chỉnh.', 'error');
      return false;
    }
    if(!payrollStore[month]?.teachers.some(teacher=>teacher.teacherId===teacherId && teacher.sessions?.some(session=>session.id===sessionId))){showToast('Ca công không còn tồn tại. Hãy tải lại dữ liệu.','error');return false;}
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;
      const updatedTeachers = currentMonthData.teachers.map(t => {
        if (t.teacherId === teacherId) {
          const updatedSessions = (t.sessions || []).map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                creditCoeff: newCoeff,
                reconciliationSent: false,
                hrPayNote: note?.trim() || `Hệ số được cập nhật: ${newCoeff}`
              };
            }
            return s;
          });
          return { ...t, payrollSent: false, sessions: updatedSessions };
        }
        return t;
      });
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          teachers: updatedTeachers
        }
      };
    });
    showToast(`Đã cập nhật hệ số buổi học [${sessionId}] sang ${newCoeff}; cần gửi lại bảng công đã cập nhật cho giáo viên.`, 'success');
    return true;
  };

  const sendPayrollToTeachers = (month: string, teacherIds: string[]) => {
    if (!permit("Gửi bảng công cho giáo viên đối soát")) return;
    const teacherIdSet = new Set(teacherIds);
    const currentMonthData = payrollStore[month];
    const sendableTeacherIds = new Set(
      currentMonthData && !currentMonthData.isLocked
        ? currentMonthData.teachers
            .filter(teacher =>
              teacherIdSet.has(teacher.teacherId) &&
              (teacher.staffRole || 'GIAO_VIEN') === 'GIAO_VIEN' &&
              !teacher.payrollSent
            )
            .map(teacher => teacher.teacherId)
        : []
    );
    if (sendableTeacherIds.size === 0) {
      showToast('Không có giáo viên nào chưa gửi đối soát trong lựa chọn này.', 'info');
      return;
    }

    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData || currentMonthData.isLocked) return prev;
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          teachers: currentMonthData.teachers.map(teacher =>
            sendableTeacherIds.has(teacher.teacherId) && !teacher.payrollSent
            ? {
                ...teacher,
                reconcileStatus: ['CHO_GUI', 'DA_XU_LY_GT'].includes(teacher.reconcileStatus)
                  ? 'DA_GUI'
                  : teacher.reconcileStatus,
                payrollSent: true,
                sessions: teacher.sessions.map(session => ({ ...session, reconciliationSent: true }))
              }
              : teacher
          )
        }
      };
    });
    showToast(`Đã gửi đối soát cho ${sendableTeacherIds.size} giáo viên chưa gửi trong kỳ ${month}.`, 'success');
  };

  const submitDispute = (month: string, dispute: DisputeItem) => {
    if (!permit("Gửi giải trình / khiếu nại sai lệch ca dạy")) return false;
    const period = payrollStore[month];
    const ownTeacher = resolveAccountTeacher(currentUser, teachers, users);
    const record = period?.teachers.find(teacher => teacher.teacherId === dispute.teacherId);
    if (!period || period.isLocked) { showToast('Không thể gửi giải trình khi kỳ chưa có dữ liệu hoặc đã khóa.', 'error'); return false; }
    if (!ownTeacher || ownTeacher.id !== dispute.teacherId || !record?.sessions.some(session => session.id === dispute.sessionId && (session.reconciliationSent ?? record.payrollSent))) { showToast('Chỉ được giải trình ca dạy đã được gửi đối soát của chính mình.', 'error'); return false; }
    if (!dispute.content.trim()) { showToast('Vui lòng nhập nội dung giải trình.', 'error'); return false; }
    if (period.disputes.some(item => item.teacherId === dispute.teacherId && item.sessionId === dispute.sessionId && item.status === 'CHO_DUYET')) { showToast('Ca này đã có giải trình đang chờ duyệt.', 'warning'); return false; }
    setPayrollStore(prev => {
      const currentMonthData = prev[month] || { isLocked: false, adminSentNotice: true, teachers: [], disputes: [] };
      const newDispute: DisputeItem = {
        ...dispute,
        id: `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'CHO_DUYET'
      };

      const updatedTeachers = currentMonthData.teachers.map(t => {
        if (t.teacherId === dispute.teacherId) {
          const updatedSessions = (t.sessions || []).map(s => {
            if (s.id === dispute.sessionId) {
              return { ...s, dispute: newDispute };
            }
            return s;
          });
          return {
            ...t,
            reconcileStatus: 'CO_GIAI_TRINH' as const,
            sessions: updatedSessions
          };
        }
        return t;
      });

      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          disputes: [newDispute, ...(currentMonthData.disputes || [])],
          teachers: updatedTeachers
        }
      };
    });
    showToast('Đã gửi đơn giải trình thành công! Đang chờ Quản trị viên duyệt.', 'success');
    return true;
  };

  const reviewDispute = (month: string, disputeId: string, status: 'DA_DUYET' | 'TU_CHOI' | 'CHO_DUYET', note: string, creditCoeff: number) => {
    if (!permit("Xử lý & phê duyệt đơn giải trình công dạy")) return false;
    if (payrollStore[month]?.isLocked) { showToast('Hãy mở khóa kỳ trước khi xử lý giải trình.', 'error'); return false; }
    if (!Number.isFinite(creditCoeff) || Math.abs(creditCoeff) > 999.999) { showToast('Hệ số công phải là số từ -999.999 đến 999.999.', 'error'); return false; }
    if(!payrollStore[month]?.disputes.some(dispute=>dispute.id===disputeId)){showToast('Giải trình không còn tồn tại. Hãy tải lại dữ liệu.','error');return false;}
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;

      const targetDispute = currentMonthData.disputes.find(d => d.id === disputeId);
      if (!targetDispute) return prev;

      const updatedDisputes = currentMonthData.disputes.map(d => {
        if (d.id === disputeId) {
          return { ...d, status, adminNote: note };
        }
        return d;
      });

      const updatedTeachers = currentMonthData.teachers.map(t => {
        if (t.teacherId === targetDispute.teacherId) {
          const hasPendingDispute = updatedDisputes.some(
            dispute => dispute.teacherId === t.teacherId && dispute.status === 'CHO_DUYET'
          );
          let approvedDelta = 0;
          let emergencyDelta = 0;

          if (targetDispute.status !== 'DA_DUYET' && status === 'DA_DUYET') {
            approvedDelta = 1;
            emergencyDelta = -1;
          } else if (targetDispute.status === 'DA_DUYET' && status !== 'DA_DUYET') {
            approvedDelta = -1;
            emergencyDelta = 1;
          }

          const updatedSessions = (t.sessions || []).map(s => {
            if (s.id === targetDispute.sessionId) {
              const updatedDisputeObj: DisputeItem = { ...targetDispute, status, adminNote: note };
              if (status === 'DA_DUYET') {
                return {
                  ...s,
                  type: 'APPROVED_EXPLANATION' as const,
                  reconciliationSent: false,
                  statusText: 'Đã duyệt GT (Miễn phạt)',
                  creditCoeff,
                  hrPayNote: note.trim() || `Đã duyệt giải trình · Hệ số ${creditCoeff}`,
                  dispute: updatedDisputeObj
                };
              } else {
                return {
                  ...s,
                  type: 'EMERGENCY' as const,
                  reconciliationSent: false,
                  statusText: status === 'TU_CHOI' ? 'Bị từ chối GT' : 'Đang chờ duyệt GT',
                  creditCoeff,
                  hrPayNote: note.trim() || `Từ chối giải trình · Hệ số ${creditCoeff}`,
                  dispute: updatedDisputeObj
                };
              }
            }
            return s;
          });

          return {
            ...t,
            approvedExplanations: Math.max(0, (t.approvedExplanations || 0) + approvedDelta),
            emergencySessions: Math.max(0, (t.emergencySessions || 0) + emergencyDelta),
            reconcileStatus: hasPendingDispute ? 'CO_GIAI_TRINH' as const : 'DA_XU_LY_GT' as const,
            payrollSent: false,
            sessions: updatedSessions
          };
        }
        return t;
      });

      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          disputes: updatedDisputes,
          teachers: updatedTeachers
        }
      };
    });

    showToast('Đã xử lý giải trình. Bảng công chuyển sang Chưa gửi; hãy gửi lại để giáo viên xem kết quả.', 'success');
    return true;
  };

  const lockPayrollMonth = (month: string) => {
    if (!permit("Khóa, mở kỳ công và xuất CSV / in bảng công")) return;
    const issue = payrollLockIssue(payrollStore[month]);
    if (issue) { showToast(issue, 'warning'); return; }
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          isLocked: true,
          locked_at: new Date().toISOString(),
          teachers: currentMonthData.teachers.map(t => ({
            ...t,
            reconcileStatus: 'DA_CHOT' as const,
            payrollSent: true
          }))
        }
      };
    });
    showToast(`Đã khóa sổ kỳ công ${month}! Nút 'Xuất Excel gửi Nhân sự' đã sẵn sàng.`, 'success');
  };

  const unlockPayrollMonth = (month: string, reason: string) => {
    if (!permit("Khóa, mở kỳ công và xuất CSV / in bảng công")) return;
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          isLocked: false,
          unlock_reason: reason.trim() || 'Hiệu chỉnh dữ liệu',
          teachers: currentMonthData.teachers.map(t => ({
            ...t,
            reconcileStatus: t.reconcileStatus === 'DA_CHOT' ? 'DA_GUI' as const : t.reconcileStatus
          }))
        }
      };
    });
    showToast(`Admin đã mở lại sổ kỳ công ${month}. Lý do: "${reason || 'Hiệu chỉnh dữ liệu'}"`, 'info');
  };

  const clearAllData = () => {
    if (!permit("Tạo, sửa, xóa & Gán Nhóm quyền")) return;
    clearLegacyBrowserData();
    runtimeStorage.clear();
    void logoutAccount();
    resetBusinessData();
    setCurrentUser(EMPTY_USER); setActiveModule(0); setWorkspaceMode('ADMIN');
    showToast('Đã xóa dữ liệu trong phiên làm việc.', 'info');
  };
  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeModule,
        setActiveModule,
        reportSection,
        setReportSection,
        workspaceMode,
        setWorkspaceMode,
        teacherPortalTab,
        setTeacherPortalTab,
        showToast,
        users,
        setUsers: guardedSetter(setUsers, 'Chỉnh sửa thông tin tài khoản & Mật khẩu'),
        roleGroups,
        setRoleGroups: guardedSetter(setRoleGroups, 'Tạo, sửa, xóa & Gán Nhóm quyền'),
        addUser,
        updateUser,
        toggleLockUser,
        teachingCategories,
        setTeachingCategories: guardedSetter(setTeachingCategories, 'Cấu hình Cấp học & Lớp dạy'),
        createTeacherWithAccount,
        subjects,
        setSubjects: guardedSetter(setSubjects, 'Quản lý danh mục môn học'),
        levels,
        setLevels: guardedSetter(setLevels, 'Quản lý danh mục trình độ'),
        timeSlots,
        setTimeSlots: guardedSetter(setTimeSlots, 'Cấu hình Khung giờ ca dạy chuẩn (Time Slot)'),
        models,
        setModels: guardedSetter(setModels, 'Quản lý mô hình lớp và sĩ số tối đa'),
        incidents,
        setIncidents: guardedSetter(setIncidents, (before, after) => incidentChangeAllowed(before, after, can)),
        teachers,
        setTeachers: guardedSetter(setTeachers, (before, after) => isPreviewAccount(actor) || teacherChangeAllowed(before, after, can, ownTeacher?.id)),
        addTeacher,
        updateTeacher,
        students,
        setStudents: guardedSetter(setStudents, 'Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy'),
        classes,
        setClasses: guardedSetter(setClasses, (before, after) => classChangeAllowed(before, after, can, ownTeacher?.id, ownTeacher?.name)),
        addStudent,
        updateStudent,
        deleteStudent,
        addClass,
        updateClass,
        deleteClass,
        batchAssignMaterials,
        batchImportRoomLinks,
        reportIncidentToSession,
        assignCoverTeacher,
        sopDocuments,
        setSopDocuments: guardedSetter(setSopDocuments, 'Quản lý kho tài liệu tri thức SOP'),
        ragBotConfig,
        setRagBotConfig: guardedSetter(setRagBotConfig, 'Cấu hình Prompt văn phong & Tiêu chí nhận xét môn'),
        activeToneKey,
        setActiveToneKey: guardedSetter(setActiveToneKey, 'Cấu hình Prompt văn phong & Tiêu chí nhận xét môn'),
        toneDirectives,
        setToneDirectives: guardedSetter(setToneDirectives, 'Cấu hình Prompt văn phong & Tiêu chí nhận xét môn'),
        payrollStore,
        setPayrollStore: guardedSetter(setPayrollStore, 'Điều chỉnh hệ số công từng buổi kèm lý do'),
        updateSessionCredit,
        sendPayrollToTeachers,
        submitDispute,
        reviewDispute,
        lockPayrollMonth,
        unlockPayrollMonth,
        clearAllData
      }}
    >
      <ConfirmAction />
      {(businessStatus.saving || accountSession.saving) && <div role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] rounded-xl bg-blue-600 px-4 py-2 text-sm text-white shadow-lg">Đang lưu…</div>}
      {(businessStatus.error || accountSession.error) && <div role="alert" className="sticky top-0 z-40 border-b border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        <strong>Chưa lưu được dữ liệu.</strong> {businessStatus.error || accountSession.error} Vui lòng kiểm tra lỗi và thực hiện lại thao tác.
      </div>}
      {children}

      {/* Global Toast Render */}
      <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.type==='error'||t.type==='warning'?'alert':'status'}
            className={`p-3.5 rounded-xl shadow-xl border text-xs font-medium flex items-center gap-2.5 transition-all pointer-events-auto ${
              t.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : t.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : t.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-blue-900 text-white border-blue-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                t.type === 'success' ? 'bg-emerald-400' :
                t.type === 'error' ? 'bg-rose-400' :
                t.type === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
              }`}
            />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={()=>setToasts(prev=>prev.filter(item=>item.id!==t.id))} className="shrink-0 self-start px-1 text-base leading-none opacity-80 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
