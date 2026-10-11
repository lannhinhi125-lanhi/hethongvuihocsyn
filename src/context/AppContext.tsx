import { PORTAL_PREVIEW_MODE, PREVIEW_ACCOUNT } from '../lib/previewMode';
import { assignedRole, hasPermission, changedFields } from '../lib/accessControl';
import { classChangeAllowed, teacherChangeAllowed, incidentChangeAllowed } from '../lib/mutationPermissions';
import { payrollLockIssue } from '../lib/workflow';
import { resolveAccountTeacher } from '../lib/evaluation';
import { canManageTeacherProfiles, generateTeacherCredentials } from '../lib/teacherAccounts';
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
  PackageDurationItem,
  ClassModelItem,
  IncidentCategory,
  TeacherProfile,
  StudentRecord,
  ClassItem,
  CriteriaCategory,
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
  createTeacherWithAccount: (teacher: Omit<TeacherProfile, 'id' | 'username' | 'passwordRaw'>) => { id: string; username: string; password: string } | null;
  // Navigation & Role
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  activeModule: number; // 1 -> 8 cho Admin
  setActiveModule: (mod: number) => void;
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
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  toggleLockUser: (id: string) => void;

  // PH2: Master Data
  subjects: SubjectItem[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectItem[]>>;
  levels: LevelItem[];
  setLevels: React.Dispatch<React.SetStateAction<LevelItem[]>>;
  timeSlots: TimeSlotItem[];
  setTimeSlots: React.Dispatch<React.SetStateAction<TimeSlotItem[]>>;
  packages: PackageDurationItem[];
  setPackages: React.Dispatch<React.SetStateAction<PackageDurationItem[]>>;
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
  addStudent: (student: StudentRecord) => void;
  updateStudent: (id: string, updates: Partial<StudentRecord>) => void;
  deleteStudent: (id: string) => void;
  addClass: (cls: ClassItem) => void;
  updateClass: (id: string, updates: Partial<ClassItem>, successMessage?: string) => void;
  deleteClass: (id: string) => void;
  batchAssignMaterials: (classIds: string[], materials: ClassItem['materials']) => void;
  batchImportRoomLinks: (updates: { classCode: string; roomLink: string }[]) => { updated: number; skipped: number };

  // PH5: Operations & Monitoring (Giám sát ca & Cover)
  reportIncidentToSession: (sessionId: string, incidentType: string, note: string) => void;
  assignCoverTeacher: (sessionId: string, newTeacherName: string) => void;

  // PH6: AI Studio
  criteriaCategories: CriteriaCategory[];
  setCriteriaCategories: React.Dispatch<React.SetStateAction<CriteriaCategory[]>>;
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
  updateSessionCredit: (month: string, teacherId: string, sessionId: string, newCoeff: number, note?: string) => void;
  sendPayrollToTeachers: (month: string, teacherIds: string[]) => void;
  submitDispute: (month: string, dispute: DisputeItem) => boolean;
  reviewDispute: (month: string, disputeId: string, status: 'DA_DUYET' | 'TU_CHOI' | 'CHO_DUYET', note: string, creditCoeff: number) => void;
  lockPayrollMonth: (month: string) => void;
  unlockPayrollMonth: (month: string, reason: string) => void;

  // Reset demo data
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_USER: UserAccount = { id: '', name: '', username: '', passwordRaw: '', email: '', phone: '', role: 'Quản trị Toàn quyền', status: 'locked', avatarInitials: '' };
const EMPTY_RAG_CONFIG: RAGBotConfig = { welcomeGreeting: '', quickPrompts: [], personaTone: '', strictGroundingOnly: true, fallbackResponse: '', systemPrompt: '' };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Không đọc cache hoặc tự sinh dữ liệu mẫu. Dữ liệu mẫu chỉ nằm trong SQL.
  const [currentUser, setCurrentUser] = useState<UserAccount>(PORTAL_PREVIEW_MODE ? PREVIEW_ACCOUNT : EMPTY_USER);
  const [activeModule, setActiveModule] = useState<number>(1);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('ADMIN');
  const [teacherPortalTab, setTeacherPortalTab] = useState<'schedule' | 'availability' | 'payroll' | 'evaluation' | 'reconcile'>('availability');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roleGroups, setRoleGroups] = useState<SystemRoleGroup[]>([]);
  const [teachingCategories, setTeachingCategories] = useState<CategoryGroup[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotItem[]>([]);
  const [packages, setPackages] = useState<PackageDurationItem[]>([]);
  const [models, setModels] = useState<ClassModelItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentCategory[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [criteriaCategories, setCriteriaCategories] = useState<CriteriaCategory[]>([]);
  const [sopDocuments, setSopDocuments] = useState<SOPDocument[]>([]);
  const [ragBotConfig, setRagBotConfig] = useState<RAGBotConfig>(EMPTY_RAG_CONFIG);
  const [activeToneKey, setActiveToneKey] = useState<string>('');
  const [toneDirectives, setToneDirectives] = useState<Record<string, { name: string; directive: string }>>({});
  const [payrollStore, setPayrollStore] = useState<Record<string, MonthPayrollData>>({});
  // Tự động chuyển workspace khi đổi user
  useEffect(() => {
    if (currentUser.role === 'Giáo viên Giảng dạy') {
      setWorkspaceMode('TEACHER');
    } else {
      setWorkspaceMode('ADMIN');
    }
  }, [currentUser]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
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
    if (!permit('Tạo, sửa, xóa & Gán Nhóm quyền')) return;
    if (!assignedRole({ ...newUser, id: '' }, roleGroups)) { showToast('Chọn nhóm quyền đang tồn tại.', 'error'); return; }
    if (!permit("Cấp tài khoản & Mật khẩu người dùng")) return;
    const id = `USR-${String(users.length + 1).padStart(2, '0')}`;
    const user: UserAccount = { ...newUser, id };
    setUsers(prev => [user, ...prev]);
    showToast(`Đã cấp tài khoản mới [${user.username}] thành công!`, 'success');
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    if (['role', 'roleGroupId'].some(key => key in updates) && !permit('Tạo, sửa, xóa & Gán Nhóm quyền')) return;
    if (!permit("Chỉnh sửa thông tin tài khoản & Mật khẩu")) return;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    showToast('Cập nhật thông tin tài khoản thành công!', 'success');
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

  const createTeacherWithAccount: AppContextType['createTeacherWithAccount'] = (profile) => {
    if (!can('Thêm/sửa hồ sơ và cấp tài khoản giáo viên') && !can('Tạo hồ sơ và cấp tài khoản giáo viên')) { showToast('Bạn chưa được cấp quyền tạo hồ sơ giáo viên.', 'error'); return null; }
    const email = profile.email.trim().toLowerCase();
    if (!profile.name.trim() || !email || users.some(u => u.email.trim().toLowerCase() === email) || teachers.some(t => t.email.trim().toLowerCase() === email)) { showToast('Tên/email không hợp lệ hoặc email đã được sử dụng.', 'error'); return null; }
    const category = teachingCategories.find(c => c.id === profile.levelId && c.status !== false);
    if (!subjects.some(subject => subject.code === profile.subject && subject.status) || !category || !profile.grades.length || !profile.grades.every(grade => category.options.some(option => option.id === grade)) || !profile.models?.length) { showToast('Vui lòng chọn môn, lớp dạy và mô hình hợp lệ từ danh mục.', 'error'); return null; }
    const credentials = generateTeacherCredentials(teachers, users);
    const teacher = { ...profile, id: credentials.id, username: credentials.username, email, schedule: {}, freeSlots: 0, busySlots: 0, isFull: false, successfulSessions: [] };
    const account: UserAccount = { id: credentials.id, username: credentials.username, passwordRaw: credentials.password, name: profile.name.trim(), email, phone: profile.phone, role: 'Giáo viên Giảng dạy', subject: profile.subject, status: 'active', avatarInitials: profile.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() };
    setTeachers(prev => [teacher, ...prev]);
    setUsers(prev => [account, ...prev]);
    return credentials;
  };

  // PH3 Actions
  const addTeacher = (teacher: TeacherProfile) => {
    if (!permit("Thêm/sửa hồ sơ và cấp tài khoản giáo viên")) return;
    setTeachers(prev => [teacher, ...prev]);
    showToast(`Đã thêm hồ sơ Giáo viên [${teacher.name}] thành công!`, 'success');
  };

  const updateTeacher = (id: string, updates: Partial<TeacherProfile>) => {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher || !teacherChangeAllowed([teacher], [{ ...teacher, ...updates }], can, ownTeacher?.id)) { showToast('Bạn không có quyền sửa các trường hồ sơ đã chọn.', 'error'); return false; }
    const editsProfile = Object.keys(updates).some(key => !['schedule', 'freeSlots', 'busySlots', 'isFull', 'evalStatus', 'evalScore', 'evalComment', 'evalCriteriaScores', 'evaluationReports'].includes(key));
    if (editsProfile && !canManageTeacherProfiles(currentUser, roleGroups)) { showToast('Bạn chưa được cấp quyền sửa hồ sơ giáo viên.', 'error'); return false; }
    const editsAvailability = ['schedule', 'freeSlots', 'busySlots', 'isFull'].some(key => Object.prototype.hasOwnProperty.call(updates, key));
    if (!teacher || (editsAvailability && !canEditTeacherAvailability(currentUser, teacher))) {
      showToast('Chỉ giáo viên được cập nhật lịch rảnh của mình.', 'warning');
      return false;
    }
    if (editsProfile && teacher) {
      const linked = users.find(u => u.id === teacher.id || (teacher.username && u.username === teacher.username) || (teacher.email && u.email.toLowerCase() === teacher.email.toLowerCase()));
      if (updates.email && users.some(u => u.id !== linked?.id && u.email.toLowerCase() === updates.email!.trim().toLowerCase())) { showToast('Email đã được sử dụng.', 'error'); return false; }
      if (linked) setUsers(prev => prev.map(u => u.id === linked.id ? { ...u, name: updates.name ?? u.name, email: updates.email ?? u.email, phone: updates.phone ?? u.phone, subject: updates.subject ?? u.subject } : u));
    }
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    showToast('Cập nhật hồ sơ Giáo viên thành công!', 'success');
    return true;
  };

  // PH4 Actions
  const addStudent = (student: StudentRecord) => {
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return;
    setStudents(prev => [student, ...prev]);
    showToast(`Đã tiếp nhận hồ sơ học sinh [${student.name}]!`, 'success');
  };

  const updateStudent = (id: string, updates: Partial<StudentRecord>) => {
    if ('currentClassCode' in updates && !permit('Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)')) return;
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    showToast('Cập nhật hồ sơ học sinh thành công!', 'success');
  };

  const deleteStudent = (id: string) => {
    if (!permit("Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: c.studentIds.filter(sid => sid !== id)
    })));
    showToast('Đã xóa hồ sơ học sinh khỏi hệ thống!', 'info');
  };

  const addClass = (cls: ClassItem) => {
    if (!classChangeAllowed([], [cls], can)) { showToast('Bạn chưa có đủ quyền tạo lớp và gán học sinh/giáo viên.', 'error'); return; }
    if (!permit("Tạo, sửa, xóa lớp và cập nhật link phòng học")) return;
    setClasses(prev => [cls, ...prev]);
    if (cls.studentIds && cls.studentIds.length > 0) {
      setStudents(prev => prev.map(s => {
        if (cls.studentIds.includes(s.id)) {
          return { ...s, status: 'Đang học', currentClassCode: cls.code };
        }
        return s;
      }));
    }
    showToast(`Khởi tạo thành công lớp [${cls.code}]!`, 'success');
  };

  const updateClass = (id: string, updates: Partial<ClassItem>, successMessage?: string) => {
    const existing = classes.find(item => item.id === id);
    if (!existing || !classChangeAllowed([existing], [{ ...existing, ...updates }], can, ownTeacher?.id, ownTeacher?.name)) { showToast('Bạn không có quyền sửa các trường lớp học đã chọn.', 'error'); return; }
    const previousClass = classes.find(item => item.id === id);
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (previousClass && (updates.studentIds !== undefined || updates.code !== undefined)) {
      const nextClass = { ...previousClass, ...updates };
      setStudents(prev => prev.map(student => {
        if (nextClass.studentIds.includes(student.id)) {
          const newlyAssigned = !previousClass.studentIds.includes(student.id);
          return { ...student, currentClassCode: nextClass.code, status: newlyAssigned ? 'Đang học' : student.status };
        }
        if (previousClass.studentIds.includes(student.id) && student.currentClassCode === previousClass.code) {
          const otherClass = classes.find(item => item.id !== id && item.studentIds.includes(student.id));
          return { ...student, currentClassCode: otherClass?.code, status: otherClass ? student.status : 'Chờ xếp lớp' };
        }
        return student;
      }));
    }
    showToast(successMessage || 'Cập nhật lớp học thành công!', 'success');
  };

  const deleteClass = (id: string) => {
    if (!permit("Tạo, sửa, xóa lớp và cập nhật link phòng học")) return;
    const cls = classes.find(c => c.id === id);
    if (cls && cls.studentIds) {
      setStudents(prev => prev.map(s => {
        if (cls.studentIds.includes(s.id)) {
          return { ...s, status: 'Chờ xếp lớp', currentClassCode: 'Chưa xếp lớp' };
        }
        return s;
      }));
    }
    setClasses(prev => prev.filter(c => c.id !== id));
    showToast('Đã xóa lớp học thành công! Học sinh đã được đưa về danh sách chờ xếp lớp.', 'info');
  };

  const batchAssignMaterials = (classIds: string[], newMaterials: ClassItem['materials']) => {
    if (!permit("Thêm, sửa, xóa và nạp học liệu theo tuần")) return;
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
  const reportIncidentToSession = (sessionId: string, incidentType: string, note: string) => {
    if (!can('Ghi nhận và xử lý sự cố ca dạy')) {
      if (!permit('Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)')) return;
      const record = Object.values(payrollStore).flatMap(month => month.teachers).find(teacher => teacher.teacherId === ownTeacher?.id && teacher.sessions.some(session => session.id === sessionId));
      if (!record) { showToast('Chỉ được báo sự cố ca dạy được phân công cho mình.', 'error'); return; }
    }
    setPayrollStore(prev => {
      const monthKey = '2026-09';
      const monthData = prev[monthKey];
      if (!monthData) return prev;

      const updatedTeachers = monthData.teachers.map(t => {
        const hasSession = (t.sessions || []).some(s => s.id === sessionId);
        if (hasSession) {
          const updatedSessions = t.sessions.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                type: 'EMERGENCY' as const,
                statusText: incidentType,
                creditCoeff: 0.0,
                hrPayNote: `Sự cố: ${incidentType} (${note || 'Cần nộp giải trình đối soát'})`
              };
            }
            return s;
          });
          return {
            ...t,
            emergencySessions: (t.emergencySessions || 0) + 1,
            reconcileStatus: 'CO_GIAI_TRINH' as const,
            sessions: updatedSessions
          };
        }
        return t;
      });

      return {
        ...prev,
        [monthKey]: {
          ...monthData,
          teachers: updatedTeachers
        }
      };
    });
    showToast(`Đã ghi nhận sự cố [${incidentType}] cho ca ${sessionId}! Dữ liệu đã được lưu vào hệ thống giám sát.`, 'warning');
  };

  const assignCoverTeacher = (sessionId: string, newTeacherName: string) => {
    if (!permit("Tìm và phân công giáo viên dạy thay")) return;
    setPayrollStore(prev => {
      const monthKey = '2026-09';
      const monthData = prev[monthKey];
      if (!monthData) return prev;

      let coverTeacherId = '';
      const matchedTeacher = teachers.find(t => t.name === newTeacherName);
      if (matchedTeacher) coverTeacherId = matchedTeacher.id;

      const updatedTeachers = monthData.teachers.map(t => {
        // Nếu là giáo viên được giao Cover, cộng thêm 1 ca cover
        if (coverTeacherId && t.teacherId === coverTeacherId) {
          return {
            ...t,
            coverSessions: (t.coverSessions || 0) + 1
          };
        }
        // Đổi trạng thái ca học tương ứng thành COVER
        const hasSession = (t.sessions || []).some(s => s.id === sessionId);
        if (hasSession) {
          const updatedSessions = t.sessions.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                type: 'COVER' as const,
                statusText: `Dạy thay bởi ${newTeacherName}`,
                hrPayNote: `Ca Cover giao cho ${newTeacherName}`
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
        [monthKey]: {
          ...monthData,
          teachers: updatedTeachers
        }
      };
    });
    showToast(`Đã điều phối giáo viên [${newTeacherName}] dạy thay (Cover) ca ${sessionId}!`, 'success');
  };

  // PH7 Actions
  const updateSessionCredit = (month: string, teacherId: string, sessionId: string, newCoeff: number, note?: string) => {
    if (!permit("Điều chỉnh hệ số công từng buổi kèm lý do")) return;
    if (!Number.isFinite(newCoeff) || newCoeff < 0) { showToast('Hệ số công phải là số không âm.', 'error'); return; }
    if (payrollStore[month]?.isLocked) {
      showToast('Không thể sửa công khi kỳ đã khóa. Hãy mở khóa kỳ trước khi điều chỉnh.', 'error');
      return;
    }
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
                payrollSent: true
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
    if (!ownTeacher || ownTeacher.id !== dispute.teacherId || !record?.payrollSent || !record.sessions.some(session => session.id === dispute.sessionId)) { showToast('Chỉ được giải trình ca dạy trong bảng công đã gửi của chính mình.', 'error'); return false; }
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
    if (!permit("Xử lý & phê duyệt đơn giải trình công dạy")) return;
    if (payrollStore[month]?.isLocked) { showToast('Hãy mở khóa kỳ trước khi xử lý giải trình.', 'error'); return; }
    if (!Number.isFinite(creditCoeff) || creditCoeff < 0) { showToast('Hệ số công phải là số không âm.', 'error'); return; }
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
                  statusText: 'Đã duyệt GT (Miễn phạt)',
                  creditCoeff,
                  hrPayNote: note.trim() || `Đã duyệt giải trình · Hệ số ${creditCoeff}`,
                  dispute: updatedDisputeObj
                };
              } else {
                return {
                  ...s,
                  type: 'EMERGENCY' as const,
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
    setUsers([]);
    setRoleGroups([]);
    setTeachingCategories([]);
    setSubjects([]);
    setLevels([]);
    setTimeSlots([]);
    setPackages([]);
    setModels([]);
    setIncidents([]);
    setTeachers([]);
    setStudents([]);
    setClasses([]);
    setCriteriaCategories([]);
    setSopDocuments([]);
    setPayrollStore({});
    setRagBotConfig(EMPTY_RAG_CONFIG);
    setToneDirectives({}); setActiveToneKey('');
    setCurrentUser(EMPTY_USER); setActiveModule(1); setWorkspaceMode('ADMIN');
    showToast('Đã xóa dữ liệu trong phiên làm việc.', 'info');
  };
  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeModule,
        setActiveModule,
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
        packages,
        setPackages: guardedSetter(setPackages, 'Tạo, sửa, xóa lớp và cập nhật link phòng học'),
        models,
        setModels: guardedSetter(setModels, 'Quản lý mô hình lớp và sĩ số tối đa'),
        incidents,
        setIncidents: guardedSetter(setIncidents, (before, after) => incidentChangeAllowed(before, after, can)),
        teachers,
        setTeachers: guardedSetter(setTeachers, (before, after) => teacherChangeAllowed(before, after, can, ownTeacher?.id)),
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
        criteriaCategories,
        setCriteriaCategories: guardedSetter(setCriteriaCategories, 'Cấu hình Prompt văn phong & Tiêu chí nhận xét môn'),
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
      {children}

      {/* Global Toast Render */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
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
