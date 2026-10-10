import { canManageTeacherProfiles, generateTeacherCredentials } from '../lib/teacherAccounts';
import { DEFAULT_TEACHER_CATEGORIES, type CategoryGroup } from '../components/CategoryMultiFilter';
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
  submitDispute: (month: string, dispute: DisputeItem) => void;
  reviewDispute: (month: string, disputeId: string, status: 'DA_DUYET' | 'TU_CHOI' | 'CHO_DUYET', note: string, creditCoeff: number) => void;
  lockPayrollMonth: (month: string) => void;
  unlockPayrollMonth: (month: string, reason: string) => void;

  // Reset demo data
  resetAllDataToDefaults: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'vuihoc_tutor_central_clean_v3';

// ==============================================================
// 1 DỮ LIỆU MẪU XUYÊN SUỐT, NHẤT QUÁN 100% GIỮA TẤT CẢ CÁC MÀN HÌNH
// ==============================================================

const initialUsers: UserAccount[] = [
  {
    id: 'USR-01',
    name: 'Trần Quản Trị',
    username: 'admin.tong',
    passwordRaw: 'AdminPass@2026',
    email: 'admin.tong@vuihoc.vn',
    phone: '0987.654.321',
    role: 'Quản trị Toàn quyền',
    status: 'active',
    avatarInitials: 'AD'
  },
  {
    id: 'USR-02',
    name: 'Nguyễn Mai Hoa',
    username: 'hoa.academic',
    passwordRaw: 'HoaVuihoc@123',
    email: 'maihoa.academic@vuihoc.vn',
    phone: '0912.333.444',
    role: 'Quản lý Chuyên môn',
    status: 'active',
    avatarInitials: 'MH'
  },
  {
    id: 'USR-03',
    name: 'Lê Tuấn Quang',
    username: 'quang.ops',
    passwordRaw: 'QuangOps#2026',
    email: 'tuanquang.ops@vuihoc.vn',
    phone: '0978.111.222',
    role: 'Nhân viên Vận hành Lớp',
    status: 'active',
    avatarInitials: 'TQ'
  },
  {
    id: 'USR-04',
    name: 'Thầy Trần Anh Tuấn',
    username: 'tuan.anhtuan',
    passwordRaw: 'AnhTuan@123',
    email: 'anhtuan.math@vuihoc.vn',
    phone: '0982.555.666',
    role: 'Giáo viên Giảng dạy',
    subject: 'SUB-MATH',
    status: 'active',
    avatarInitials: 'AT'
  },
  {
    id: 'USR-05',
    name: 'Cô Nguyễn Thị Mai Hoa',
    username: 'maihoa.eng',
    passwordRaw: 'MaiHoa@123',
    email: 'maihoa.eng@vuihoc.vn',
    phone: '0912.999.888',
    role: 'Giáo viên Giảng dạy',
    subject: 'SUB-ENG',
    status: 'active',
    avatarInitials: 'MH'
  },
  {
    id: 'USR-06',
    name: 'Gia sư Lê Hoàng Nam',
    username: 'hoangnam.tutor',
    passwordRaw: 'TutorNam@2026',
    email: 'hoangnam.tutor@vuihoc.vn',
    phone: '0977.888.999',
    role: 'Giáo viên Giảng dạy',
    subject: 'SUB-MATH',
    status: 'active',
    avatarInitials: 'HN'
  }
];

const initialRoleGroups: SystemRoleGroup[] = [
  {
    id: 'ROLE-01',
    name: 'Quản trị Toàn quyền',
    category: 'HỆ THỐNG',
    desc: 'Toàn quyền cấu hình bảo mật, tài khoản, chốt sổ và vận hành toàn hệ thống.',
    userCount: 1,
    permissions: ['ALL'],
    isDefault: true
  },
  {
    id: 'ROLE-02',
    name: 'Quản lý Chuyên môn',
    category: 'CHUYÊN MÔN',
    desc: 'Dự giờ sư phạm, cấu hình tiêu chí chấm điểm, duyệt học liệu, kiểm soát AI.',
    userCount: 1,
    permissions: ['PH2_READ', 'PH3_ALL', 'PH6_ALL', 'PH8_ALL']
  },
  {
    id: 'ROLE-03',
    name: 'Nhân viên Vận hành Lớp',
    category: 'VẬN HÀNH',
    desc: 'Tiếp nhận học sinh, khởi tạo lớp, ghép lớp chặn trần, giám sát ca dạy.',
    userCount: 1,
    permissions: ['PH2_READ', 'PH4_ALL', 'PH5_ALL', 'PH7_READ']
  },
  {
    id: 'ROLE-04',
    name: 'Giáo viên Giảng dạy',
    category: 'GIẢNG DẠY',
    desc: 'Lịch dạy, vào lớp Zoom, điểm danh, AI nhận xét, tra cứu công và giải trình.',
    userCount: 2,
    permissions: ['TEACHER_PORTAL']
  }
];

const initialSubjects: SubjectItem[] = [
  { id: 'SUB-1', code: 'SUB-MATH', abbr: 'TOAN', name: 'Môn Toán', desc: 'Toán tư duy và Toán tiểu học bám sát khung Bộ Giáo Dục', status: true },
  { id: 'SUB-2', code: 'SUB-ENG', abbr: 'ENG', name: 'Môn Tiếng Anh', desc: 'Tiếng Anh giao tiếp và chương trình chuẩn Cambridge', status: true }
];

const initialLevels: LevelItem[] = [
  { id: 'LVL-1', code: 'LVL-F1', abbr: 'NT1', name: 'Nền tảng 1', target: 'Học sinh yếu mất gốc kiến thức', objective: 'Lấy lại kiến thức cơ bản', status: true },
  { id: 'LVL-2', code: 'LVL-F2', abbr: 'NT2', name: 'Nền tảng 2', target: 'Học sinh củng cố kiến thức cơ bản', objective: 'Thành thạo phép tính căn bản', status: true },
  { id: 'LVL-3', code: 'LVL-STD', abbr: 'TC', name: 'Tiêu chuẩn', target: 'Học sinh nắm vững chương trình SGK', objective: 'Tự tin giải quyết bài học theo khung chuẩn', status: true },
  { id: 'LVL-4', code: 'LVL-ADV', abbr: 'NC', name: 'Nâng cao', target: 'Học sinh khá giỏi, tư duy mở rộng', objective: 'Phát triển tư duy logic mở rộng', status: true }
];

const initialTimeSlots: TimeSlotItem[] = [
  { id: 'SLOT-1250', code: 'SLOT-1250', name: 'Ca Trưa Thử Nghiệm (12:50 - 13:50)', timeRange: '12:50 - 13:50', durationMinutes: 60, status: true },
  { id: 'SLOT-1', code: 'SLOT-E1', name: 'Ca Tối 1 (Giờ vàng)', timeRange: '18:00 - 19:30', durationMinutes: 90, status: true },
  { id: 'SLOT-2', code: 'SLOT-E2', name: 'Ca Tối 2', timeRange: '19:45 - 21:15', durationMinutes: 90, status: true },
  { id: 'SLOT-3', code: 'SLOT-A1', name: 'Ca Chiều', timeRange: '16:15 - 17:45', durationMinutes: 90, status: true }
];

const initialPackages: PackageDurationItem[] = [
  { id: 'PKG-1', code: 'PKG-03M', name: 'Gói 3 tháng', months: 3, daysConverted: 90, status: true },
  { id: 'PKG-2', code: 'PKG-06M', name: 'Gói 6 tháng', months: 6, daysConverted: 180, status: true },
  { id: 'PKG-3', code: 'PKG-12M', name: 'Gói 12 tháng', months: 12, daysConverted: 365, status: true }
];

const initialModels: ClassModelItem[] = [
  { id: 'MOD-1', code: '1-1', name: 'Lớp 1 - 1 (Kèm 1-1)', maxStudents: 1, status: true },
  { id: 'MOD-2', code: '1-n', name: 'Lớp 1 - n (Nhóm chung)', maxStudents: 5, status: true },
  { id: 'MOD-3', code: '1-5', name: 'Lớp 1 - 5', maxStudents: 5, status: true },
  { id: 'MOD-4', code: '1-10', name: 'Lớp 1 - 10', maxStudents: 10, status: true }
];

const initialIncidents: IncidentCategory[] = [
  {
    id: 'GRP-1',
    code: 'GRP-ADV',
    name: 'Sự cố có báo trước (>12h)',
    desc: 'Báo bận trước để điều phối Cover',
    subIncidents: [
      { id: 'INC-1', code: 'INC-ADV-TCH', name: 'Giáo viên xin nghỉ có báo trước (>12h)', targetParty: 'Giáo viên', desc: 'GV báo trước để Vận hành xếp Cover', status: true },
      { id: 'INC-2', code: 'INC-ADV-STD', name: 'Học sinh xin nghỉ có phép', targetParty: 'Học sinh', desc: 'Phụ huynh báo trước khi ca diễn ra', status: true }
    ]
  },
  {
    id: 'GRP-2',
    code: 'GRP-EMG',
    name: 'Sự cố khẩn cấp (<2h)',
    desc: 'Sự cố phát sinh sát giờ hoặc trong ca dạy',
    subIncidents: [
      { id: 'INC-3', code: 'INC-EMG-TCH', name: 'Giáo viên vắng mặt đột xuất / Quá 10 phút không vào', targetParty: 'Giáo viên', desc: 'Quá 10 phút không vào phòng dạy', status: true },
      { id: 'INC-4', code: 'INC-EMG-TECH', name: 'Mất điện / Hỏng thiết bị mạng', targetParty: 'Khách quan', desc: 'Lỗi đường truyền Internet hoặc mất điện đột xuất', status: true }
    ]
  }
];

// 2 Giáo viên chính xuyên suốt
const initialTeachers: TeacherProfile[] = [
  {
    id: 'GV-001',
    name: 'Thầy Trần Anh Tuấn',
    subject: 'SUB-MATH',
    subjectName: 'Môn Toán',
    levelId: 'CAP-TH',
    levelName: 'Tiểu học',
    grades: ['Lớp 3', 'Lớp 4', 'Lớp 5'],
    models: ['1-1', '1-n'],
    phone: '0982.555.666',
    email: 'anhtuan.math@vuihoc.vn',
    degree: 'Đại học Sư phạm Hà Nội - Khoa Toán Tin',
    status: 'DANG_DAY',
    statusLabel: 'Đang dạy',
    evalStatus: 'SCORED',
    evalScore: '8.8',
    evalComment: 'Phương pháp gợi mở sinh động, kiểm soát tốt tiến độ bài dạy, tương tác tốt với học sinh.',
    evalCriteriaScores: { tc1: 9.0, tc2: 8.5, tc3: 9.0 },
    freeSlots: 8,
    busySlots: 6,
    isFull: false,
    successfulSessions: [
      {
        code: 'MAT03-B1',
        name: 'Toán Lớp 3 - Giải bài toán 3 bước tính (tiết 2)',
        date: 'Thứ Ba, 06/10',
        week: 'W1',
        slot: 'Ca Tối 1 (18:00 - 19:30)',
        students: '1/3 HS',
        status: 'Hoàn thành tốt',
        roomLink: 'https://vuihoc.zoom.us/j/988776655',
        recordLink: 'https://record.vuihoc.vn/meet/MAT03-B1-rec',
        checkin: '17:55 (Đúng giờ)',
        gradeLevel: 'Lớp 3',
        model: '1-3'
      }
    ],
    schedule: {
      'SLOT-1250': ['free', 'free', 'free', 'free', 'free', 'free', 'free'],
      'SLOT-E1': ['free', 'busy', 'free', 'busy', 'free', 'free', 'busy'],
      'SLOT-E2': ['busy', 'none', 'busy', 'none', 'free', 'busy', 'free']
    }
  },
  {
    id: 'GV-002',
    name: 'Cô Nguyễn Thị Mai Hoa',
    subject: 'SUB-ENG',
    subjectName: 'Môn Tiếng Anh',
    levelId: 'CAP-TH',
    levelName: 'Tiểu học',
    grades: ['Lớp 3', 'Lớp 4'],
    models: ['1-1', '1-n'],
    phone: '0912.999.888',
    email: 'maihoa.eng@vuihoc.vn',
    degree: 'Đại học Ngoại ngữ - ĐHQGHN, IELTS 8.0',
    status: 'DANG_DAY',
    statusLabel: 'Đang dạy',
    evalStatus: 'SCORED',
    evalScore: '9.2',
    evalComment: 'Phát âm chuẩn quốc tế, tạo không khí học hào hứng qua các mini game ngôn ngữ.',
    evalCriteriaScores: { tc1: 9.5, tc2: 9.0, tc3: 9.5 },
    freeSlots: 6,
    busySlots: 4,
    isFull: false,
    successfulSessions: [
      {
        code: 'ENG04-B1',
        name: 'Tiếng Anh Lớp 4 - Present Continuous Tense',
        date: 'Thứ Hai, 05/10',
        week: 'W1',
        slot: 'Ca Tối 2 (19:45 - 21:15)',
        students: '1/1 HS',
        status: 'Hoàn thành tốt',
        roomLink: 'https://classin.com/room/918237192',
        recordLink: 'https://record.vuihoc.vn/meet/ENG04-B1-rec',
        checkin: '19:40 (Đúng giờ)',
        gradeLevel: 'Lớp 4',
        model: '1-1'
      }
    ],
    schedule: {
      'SLOT-E1': ['free', 'none', 'free', 'busy', 'none', 'none', 'free'],
      'SLOT-E2': ['busy', 'none', 'busy', 'none', 'free', 'busy', 'none']
    }
  },
  {
    id: 'GV-003',
    name: 'Gia sư Lê Hoàng Nam',
    subject: 'SUB-MATH',
    subjectName: 'Môn Toán',
    levelId: 'CAP-TH',
    levelName: 'Tiểu học',
    grades: ['Lớp 3', 'Lớp 4', 'Lớp 5'],
    models: ['1-1'],
    phone: '0977.888.999',
    email: 'hoangnam.tutor@vuihoc.vn',
    degree: 'Đại học Bách Khoa HN - Gia sư Toán tư duy & Nhóm nhỏ',
    status: 'DANG_DAY',
    statusLabel: 'Đang dạy',
    evalStatus: 'SCORED',
    evalScore: '9.0',
    evalComment: 'Nhiệt tình, nắm chắc tâm lý học sinh nhóm 1-1 và 1-3, hướng dẫn tỉ mỉ bài tập.',
    evalCriteriaScores: { tc1: 9.0, tc2: 9.0, tc3: 9.0 },
    freeSlots: 10,
    busySlots: 8,
    isFull: false,
    successfulSessions: [
      {
        code: 'MAT-GS-01',
        name: 'Gia sư Toán Lớp 4 - Ôn tập phân số (1 kèm 1)',
        date: 'Thứ Năm, 08/10',
        week: 'W1',
        slot: 'Ca Tối 1 (18:00 - 19:30)',
        students: '1/1 HS',
        status: 'Hoàn thành tốt',
        roomLink: 'https://vuihoc.zoom.us/j/123456789',
        recordLink: 'https://record.vuihoc.vn/meet/MAT-GS-01-rec',
        checkin: '17:58 (Đúng giờ)',
        gradeLevel: 'Lớp 4',
        model: '1-1'
      }
    ],
    schedule: {
      'SLOT-E1': ['free', 'busy', 'free', 'busy', 'free', 'free', 'busy'],
      'SLOT-E2': ['busy', 'none', 'busy', 'none', 'free', 'busy', 'free']
    }
  },
  {
    id: 'GV-004',
    name: 'Thầy Đỗ Minh Đức',
    subject: 'SUB-MATH',
    subjectName: 'Môn Toán',
    levelId: 'CAP-THCS',
    levelName: 'THCS',
    grades: ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'],
    models: ['1-1', '1-n'],
    phone: '0903.222.111',
    email: 'minhduc.math@vuihoc.vn',
    degree: 'ThS Toán học - ĐH Khoa học Tự nhiên ĐHQGHN',
    status: 'DANG_DAY',
    statusLabel: 'Đang dạy',
    evalStatus: 'UNSCORED',
    evalScore: null,
    evalComment: '',
    freeSlots: 8,
    busySlots: 5,
    isFull: false,
    successfulSessions: [
      {
        code: 'MAT08-B2',
        name: 'Toán Lớp 8 - Hằng đẳng thức đáng nhớ & Ứng dụng',
        date: 'Thứ Tư, 07/10',
        week: 'W1',
        slot: 'Ca Tối 2 (19:45 - 21:15)',
        students: '3/3 HS',
        status: 'Hoàn thành tốt',
        roomLink: 'https://vuihoc.zoom.us/j/883344556',
        recordLink: 'https://record.vuihoc.vn/meet/MAT08-B2-rec',
        checkin: '19:42 (Đúng giờ)',
        gradeLevel: 'Lớp 8',
        model: '1-3'
      }
    ],
    schedule: {
      'SLOT-E1': ['busy', 'free', 'busy', 'free', 'none', 'free', 'busy'],
      'SLOT-E2': ['free', 'busy', 'free', 'none', 'free', 'busy', 'none']
    }
  },
  {
    id: 'GV-005',
    name: 'Cô Vũ Phương Linh',
    subject: 'SUB-ENG',
    subjectName: 'Môn Tiếng Anh',
    levelId: 'CAT-IELTS',
    levelName: 'IELTS & Quốc tế',
    grades: ['IELTS 6.5 - 7.5', 'IELTS 8.0+', 'Cambridge KET/PET'],
    models: ['1-1', '1-n'],
    phone: '0936.777.888',
    email: 'phuonglinh.ielts@vuihoc.vn',
    degree: 'Cử nhân Ngôn ngữ Anh - IELTS Overall 8.5 (Speaking 8.5)',
    status: 'DANG_DAY',
    statusLabel: 'Đang dạy',
    evalStatus: 'UNSCORED',
    evalScore: null,
    evalComment: '',
    freeSlots: 12,
    busySlots: 6,
    isFull: false,
    successfulSessions: [
      {
        code: 'IELTS-ADV-01',
        name: 'IELTS Writing Task 2 - Coherence and Cohesion Masterclass',
        date: 'Thứ Năm, 08/10',
        week: 'W1',
        slot: 'Ca Tối 1 (18:00 - 19:30)',
        students: '2/2 HS',
        status: 'Hoàn thành tốt',
        roomLink: 'https://vuihoc.zoom.us/j/992211443',
        recordLink: 'https://record.vuihoc.vn/meet/IELTS-ADV-01-rec',
        checkin: '17:54 (Đúng giờ)',
        gradeLevel: 'IELTS 7.0 - 7.5',
        model: '1-1'
      }
    ],
    schedule: {
      'SLOT-E1': ['free', 'busy', 'free', 'busy', 'free', 'free', 'busy'],
      'SLOT-E2': ['busy', 'none', 'busy', 'none', 'free', 'busy', 'free']
    }
  },
  {
    id: 'GV-006',
    name: 'Thầy Phạm Quốc Huy',
    subject: 'SUB-MATH',
    subjectName: 'Môn Toán',
    levelId: 'CAP-THPT',
    levelName: 'THPT',
    grades: ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Luyện thi ĐH (Toán)'],
    models: ['1-1', '1-n'],
    phone: '0966.555.444',
    email: 'quochuy.thpt@vuihoc.vn',
    degree: 'Thủ khoa Sư phạm Toán - Chuyên gia Luyện thi THPT Quốc Gia',
    status: 'CHO_LOP',
    statusLabel: 'Chờ lớp',
    evalStatus: 'UNSCORED',
    evalScore: null,
    evalComment: '',
    freeSlots: 14,
    busySlots: 2,
    isFull: false,
    successfulSessions: [],
    schedule: {
      'SLOT-E1': ['free', 'free', 'free', 'free', 'free', 'free', 'free'],
      'SLOT-E2': ['free', 'free', 'none', 'none', 'free', 'free', 'none']
    }
  }
];

// Học sinh xuyên suốt
const initialStudents: StudentRecord[] = [
  {
    id: 'HS-2026-001',
    name: 'Trần Gia Bảo',
    grade: 'Lớp 3',
    subject: 'SUB-MATH',
    model: '1-3',
    level: 'LVL-F2',
    fatherName: 'Trần Mạnh Hùng (Bố)',
    fatherPhone: '0912.888.999',
    motherName: 'Nguyễn Thị Thùy (Mẹ)',
    motherPhone: '0912.777.666',
    scheduleSlots: ['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)'],
    status: 'Đang học',
    currentClassCode: 'TOAN_K03_NT2_13_01'
  },
  {
    id: 'HS-2026-002',
    name: 'Lê Quỳnh Anh',
    grade: 'Lớp 4',
    subject: 'SUB-ENG',
    model: '1-1',
    level: 'LVL-ADV',
    fatherName: 'Lê Quang Minh (Bố)',
    fatherPhone: '0987.111.222',
    motherName: 'Nguyễn Mai Lan (Mẹ)',
    motherPhone: '0987.222.111',
    scheduleSlots: ['T2 (19:45 - 21:15)', 'T6 (19:45 - 21:15)'],
    status: 'Đang học',
    currentClassCode: 'ENG_K04_NC_11_01'
  },
  {
    id: 'HS-2026-003',
    name: 'Đặng Tuấn Kiệt',
    grade: 'Lớp 3',
    subject: 'SUB-MATH',
    model: '1-3',
    level: 'LVL-STD',
    fatherName: 'Đặng Quốc Tuấn (Bố)',
    fatherPhone: '0934.777.666',
    motherName: 'Phạm Hải Yến (Mẹ)',
    motherPhone: '0934.888.999',
    scheduleSlots: ['T7 (12:50 - 13:50)'],
    status: 'Đang học',
    currentClassCode: 'TOAN_K03_DEMO_T7'
  },
  {
    id: 'HS-2026-004',
    name: 'Nguyễn Hà My',
    grade: 'Lớp 4',
    subject: 'SUB-ENG',
    model: '1-1',
    level: 'LVL-STD',
    fatherName: 'Nguyễn Văn Hùng (Bố)',
    fatherPhone: '0911.222.333',
    motherName: 'Trần Thu Hà (Mẹ)',
    motherPhone: '0911.333.444',
    scheduleSlots: ['T7 (18:00 - 19:30)'],
    status: 'Đang học',
    currentClassCode: 'ENG_K04_DEMO_T7'
  }
];

// Lớp học xuyên suốt (Phân hệ 4 Quản trị)
const initialClasses: ClassItem[] = [
  {
    id: 'CLS-1250',
    code: 'TOAN_K04_VIP_1250',
    name: 'Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)',
    grade: 'Lớp 4',
    subject: 'SUB-MATH',
    level: 'LVL-ADV',
    model: '1-1',
    maxStudents: 1,
    studentIds: ['HS-2026-001'],
    schedule: 'T2 (12:50 - 13:50), T3 (12:50 - 13:50), T4 (12:50 - 13:50)',
    roomLink: 'https://vuihoc.zoom.us/j/8899125000',
    teacherName: 'Thầy Trần Anh Tuấn',
    teacherId: 'GV-001',
    materials: [
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 1,
        title: 'Tiết 12: Phân số & Tư duy hình học thực tế',
        slide: 'https://drive.vuihoc.vn/tailieu/toan4-tiet12.pdf',
        lms: 'https://vuihoc.vn/lms/toan4-tiet12'
      }
    ]
  },
  {
    id: 'CLS-001',
    code: 'TOAN_K03_NT2_13_01',
    name: 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)',
    grade: 'Lớp 3',
    subject: 'SUB-MATH',
    level: 'LVL-F2',
    model: '1-3',
    maxStudents: 3,
    studentIds: ['HS-2026-001'],
    schedule: 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)',
    roomLink: 'https://vuihoc.zoom.us/j/988776655',
    teacherName: 'Thầy Trần Anh Tuấn',
    teacherId: 'GV-001',
    materials: [
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 1,
        title: 'Giải bài toán bằng 3 bước tính (tiết 2)',
        slide: 'https://drive.google.com/file/d/slide-b1-toan3',
        lms: 'https://vuihoc.vn/lms/exercise/toan3_b1'
      },
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 2,
        title: 'Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt',
        slide: 'https://drive.google.com/file/d/slide-b2-toan3',
        lms: 'https://vuihoc.vn/lms/exercise/toan3_b2'
      }
    ],
    activeSessions: {
      1: {
        sessionNum: 1,
        dateStr: '2026-10-06 18:00 - 19:30',
        title: 'Giải bài toán bằng 3 bước tính (tiết 2)',
        status: 'Chưa diễn ra',
        materialGv: 'https://drive.google.com/file/d/slide-b1-toan3',
        materialHs: 'https://drive.google.com/file/d/slide-b1-toan3-hs',
        exerciseLms: 'https://vuihoc.vn/lms/exercise/toan3_b1',
        attendance: { 'HS-2026-001': 'present' }
      },
      2: {
        sessionNum: 2,
        dateStr: '2026-10-08 18:00 - 19:30',
        title: 'Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt',
        status: 'Chưa diễn ra',
        materialGv: 'https://drive.google.com/file/d/slide-b2-toan3',
        materialHs: 'https://drive.google.com/file/d/slide-b2-toan3-hs',
        exerciseLms: 'https://vuihoc.vn/lms/exercise/toan3_b2'
      }
    }
  },
  {
    id: 'CLS-002',
    code: 'ENG_K04_NC_11_01',
    name: 'Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)',
    grade: 'Lớp 4',
    subject: 'SUB-ENG',
    level: 'LVL-ADV',
    model: '1-1',
    maxStudents: 1,
    studentIds: ['HS-2026-002'],
    schedule: 'T2 (19:45 - 21:15), T6 (19:45 - 21:15)',
    roomLink: 'https://classin.com/room/918237192',
    teacherName: 'Cô Nguyễn Thị Mai Hoa',
    teacherId: 'GV-002',
    materials: [
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 1,
        title: 'Present Continuous Tense in Daily Routine',
        slide: 'https://drive.google.com/file/d/slide-eng4-b1',
        lms: 'https://vuihoc.vn/lms/exercise/eng4_b1'
      }
    ],
    activeSessions: {
      1: {
        sessionNum: 1,
        dateStr: '2026-10-05 19:45 - 21:15',
        title: 'Present Continuous Tense in Daily Routine',
        status: 'Đã hoàn thành',
        materialGv: 'https://drive.google.com/file/d/slide-eng4-b1',
        materialHs: 'https://drive.google.com/file/d/slide-eng4-b1-hs',
        exerciseLms: 'https://vuihoc.vn/lms/exercise/eng4_b1',
        attendance: { 'HS-2026-002': 'present' }
      }
    }
  },
  {
    id: 'CLS-DEMO-MATH-T7',
    code: 'TOAN_K03_DEMO_T7',
    name: 'Toán Nền tảng Lớp 3 - Ca thứ Bảy',
    grade: 'Lớp 3',
    subject: 'SUB-MATH',
    level: 'LVL-F2',
    model: '1-1',
    maxStudents: 1,
    studentIds: ['HS-2026-003'],
    schedule: 'T7 (12:50 - 13:50)',
    roomLink: 'https://vuihoc.zoom.us/j/1003102026',
    teacherName: 'Gia sư Lê Hoàng Nam',
    teacherId: 'GV-003',
    materials: [
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 1,
        title: 'Ôn tập phép nhân, phép chia và giải toán có lời văn',
        slide: 'https://drive.google.com/file/d/demo-toan-t7-slide',
        lms: 'https://vuihoc.vn/lms/demo-toan-t7'
      }
    ],
    activeSessions: {
      1: {
        sessionNum: 1,
        dateStr: '2026-10-10 12:50 - 13:50',
        title: 'Ôn tập phép nhân, phép chia và giải toán có lời văn',
        status: 'Đã hoàn thành',
        checkinTime: '12:47:00',
        teacherAttendance: 'ATTENDED',
        checkinBy: 'Gia sư Lê Hoàng Nam',
        materialGv: 'https://drive.google.com/file/d/demo-toan-t7-slide',
        materialHs: 'https://drive.google.com/file/d/demo-toan-t7-student',
        exerciseLms: 'https://vuihoc.vn/lms/demo-toan-t7',
        attendance: { 'HS-2026-003': 'present' },
        feedback: { 'HS-2026-003': 'Con tập trung, thực hiện tốt các phép tính và trình bày lời giải rõ ràng.' }
      }
    }
  },
  {
    id: 'CLS-DEMO-ENG-T7',
    code: 'ENG_K04_DEMO_T7',
    name: 'Tiếng Anh Giao tiếp Lớp 4 - Ca thứ Bảy',
    grade: 'Lớp 4',
    subject: 'SUB-ENG',
    level: 'LVL-STD',
    model: '1-1',
    maxStudents: 1,
    studentIds: ['HS-2026-004'],
    schedule: 'T7 (18:00 - 19:30)',
    roomLink: 'https://classin.com/room/demo-eng-t7',
    teacherName: 'Cô Vũ Phương Linh',
    teacherId: 'GV-005',
    materials: [
      {
        month: '10/2026',
        week: 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
        session: 1,
        title: 'Daily routines: hỏi và trả lời về hoạt động hằng ngày',
        slide: 'https://drive.google.com/file/d/demo-eng-t7-slide',
        lms: 'https://vuihoc.vn/lms/demo-eng-t7'
      }
    ]
  }
];

// Cấu hình AI Studio (Phân hệ 6)
const initialCriteria: CriteriaCategory[] = [
  {
    id: 'CAT_TOAN_01',
    subject: 'TOAN',
    name: '1. Mức độ tập trung & Kỷ luật giờ giấc',
    criteria: [
      {
        id: 'CRI_T1',
        name: 'Mức độ tập trung trong ca học',
        options: [
          { id: 'OPT_T1_1', label: 'Rất tập trung, hăng hái tương tác', isDefault: true },
          { id: 'OPT_T1_2', label: 'Khá tập trung, chú ý nghe giảng', isDefault: false },
          { id: 'OPT_T1_3', label: 'Còn mất tập trung, nhìn ra ngoài', isDefault: false }
        ]
      }
    ]
  },
  {
    id: 'CAT_TOAN_02',
    subject: 'TOAN',
    name: '2. Năng lực tiếp thu & Kỹ năng giải toán',
    criteria: [
      {
        id: 'CRI_T2',
        name: 'Khả năng hiểu lý thuyết & Bản chất',
        options: [
          { id: 'OPT_T2_1', label: 'Nắm rất chắc lý thuyết và bản chất các phép tính', isDefault: true },
          { id: 'OPT_T2_2', label: 'Còn đôi chỗ lúng túng ở các bước tính toán phức tạp', isDefault: false }
        ]
      }
    ]
  }
];

const initialToneDirectives: Record<string, { name: string; directive: string }> = {
  'khich-le': {
    name: 'Khích lệ, ân cần & Khen ngợi (Khuyến nghị cho Tiểu học)',
    directive: 'Bạn là giáo viên Vuihoc tâm lý, ân cần. Hãy tổng hợp các tiêu chí giáo viên đã tick để viết một đoạn nhận xét ấm áp, khen ngợi nỗ lực của con và dặn dò bài tập chu đáo.'
  },
  'chuan-muc': {
    name: 'Sư phạm chuẩn mực & Khách quan',
    directive: 'Bạn là giáo viên bộ môn chuẩn mực. Hãy viết đoạn nhận xét đánh giá đúng thực chất năng lực và nề nếp buổi học của học sinh, nêu rõ ưu điểm và khuyến nghị cụ thể.'
  }
};

const initialSOPDocuments: SOPDocument[] = [
  {
    id: 'DOC-01',
    title: 'SOP_Bao_Nghi_Va_Su_Co_Ca_Day_2026.txt',
    category: 'Sự cố & Báo nghỉ',
    summary: 'Quy định báo bận trước ca dạy (4 tiếng) và quy trình xử lý mất mạng đột xuất.',
    updatedAt: '05/10/2026',
    content: 'ĐIỀU 1: BÁO NGHỈ ĐỘT XUẤT: Phải báo trước ít nhất 04 TIẾNG để Vận hành kịp xếp Cover. Dưới 2 tiếng xử lý vi phạm mức 2.\nĐIỀU 2: SỰ CỐ MẤT MẠNG/MẤT ĐIỆN: Dùng 4G báo vào Zalo Trực Ban trong 05 phút, tối đa 10 phút khắc phục.'
  },
  {
    id: 'DOC-02',
    title: 'Quy_Che_Doi_Soat_Cong_Va_Khieu_Nai.txt',
    category: 'Chốt công & Đối soát',
    summary: 'Khóa sổ kỳ công Chủ nhật hàng tuần, thời hạn khiếu nại trước 12h Thứ 2.',
    updatedAt: '28/09/2026',
    content: 'ĐIỀU 1: Khóa sổ kỳ công vào 23h59 Chủ nhật. Bàn giao Kế toán vào sáng Thứ 2.\nĐIỀU 2: Khiếu nại sai lệch gửi trước 12h00 trưa Thứ 2 kèm ảnh minh chứng.'
  }
];

const initialRAGBotConfig: RAGBotConfig = {
  welcomeGreeting: 'Dạ em chào Thầy/Cô ạ! Em là Trợ lý AI Vận hành Vuihoc Tutor 24/7. Em có thể hỗ trợ giải đáp nhanh quy chế đào tạo, báo nghỉ và hướng dẫn ca dạy.',
  quickPrompts: [
    'Quy định báo nghỉ trước ca dạy bao nhiêu tiếng?',
    'Sự cố mất mạng đột xuất xử lý thế nào?',
    'Quy trình bàn giao ca dạy và hỗ trợ kỹ thuật'
  ],
  personaTone: "Xưng 'Em', gọi 'Thầy/Cô'; hòa nhã, ân cần, ngắn gọn và chuẩn mực sư phạm.",
  strictGroundingOnly: true,
  fallbackResponse: 'Dạ thưa Thầy/Cô, hiện tại vấn đề này chưa có quy định trong tài liệu SOP. Vui lòng liên hệ trực tiếp Quản lý ca trực qua Zalo Nhóm Vận Hành để được hỗ trợ ạ!',
  systemPrompt: 'Bạn là Trợ lý AI Vận hành VUIHOC TUTOR. Trả lời dựa trên tài liệu SOP được cung cấp.'
};

// Dữ liệu đối soát xuyên suốt (Phân hệ 7: Dành cho Giáo viên & Gia sư)
const initialPayrollStore: Record<string, MonthPayrollData> = {
  '2026-09': {
    isLocked: false,
    adminSentNotice: true,
    teachers: [
      {
        teacherId: 'GV-001',
        teacherName: 'Thầy Trần Anh Tuấn',
        staffRole: 'GIAO_VIEN',
        staffRoleName: 'Giáo viên',
        subject: 'TOAN',
        subjectName: 'Môn Toán',
        standardSessions: 23,
        coverSessions: 2,
        studentCanceledSessions: 1,
        lateSessions: 1,
        emergencySessions: 0,
        approvedExplanations: 0,
        reconcileStatus: 'CO_GIAI_TRINH',
        sessions: [
          {
            id: 'S-0901',
            week: 'W1',
            date: '2026-09-02',
            dateStr: '02/09/2026',
            dayOfWeek: 'Thứ 4',
            time: '18:00 - 19:30',
            classCode: 'TOAN_K03_NT2_13_01',
            className: 'Toán Lớp 3 Nền tảng 2',
            studentName: 'Trần Gia Bảo',
            studentNames: ['Trần Gia Bảo', 'Đặng Tuấn Kiệt', 'Nguyễn Hà My'],
            type: 'STANDARD',
            statusText: 'Dạy chuẩn',
            checkin: '17:56 (Đúng giờ)',
            checkout: '19:32 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công chuẩn',
            dispute: null,
            teacherId: 'GV-001',
            teacherName: 'Thầy Trần Anh Tuấn',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-3',
            durationMinutes: 90,
            studentCount: 3,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0904',
            week: 'W1',
            date: '2026-09-05',
            dateStr: '05/09/2026',
            dayOfWeek: 'Thứ 7',
            time: '18:00 - 19:30',
            classCode: 'TOAN_K03_NT2_13_01',
            className: 'Toán Lớp 3 Nền tảng 2',
            studentName: 'Trần Gia Bảo',
            studentNames: ['Trần Gia Bảo', 'Đặng Tuấn Kiệt', 'Nguyễn Hà My'],
            type: 'LATE',
            statusText: 'Đi muộn 15 phút (Đã bù giờ đủ)',
            checkin: '18:15 (Trễ 15p)',
            checkout: '19:45 (Bù giờ đủ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công (Bù giờ đủ)',
            dispute: null,
            teacherId: 'GV-001',
            teacherName: 'Thầy Trần Anh Tuấn',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-3',
            durationMinutes: 90,
            studentCount: 3,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0912',
            week: 'W2',
            date: '2026-09-12',
            dateStr: '12/09/2026',
            dayOfWeek: 'Thứ 7',
            time: '18:00 - 19:30',
            classCode: 'TOAN_K03_NT2_13_01',
            className: 'Toán Lớp 3 Nền tảng 2',
            studentName: 'Trần Gia Bảo',
            studentNames: ['Trần Gia Bảo', 'Đặng Tuấn Kiệt', 'Nguyễn Hà My'],
            type: 'COVER',
            statusText: 'Dạy thay đồng nghiệp (Cover)',
            checkin: '17:58 (Đúng giờ)',
            checkout: '19:30 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công chuẩn (Dạy thay)',
            dispute: null,
            teacherId: 'GV-001',
            teacherName: 'Thầy Trần Anh Tuấn',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-3',
            durationMinutes: 90,
            studentCount: 3,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0925',
            week: 'W4',
            date: '2026-09-26',
            dateStr: '26/09/2026',
            dayOfWeek: 'Thứ 7',
            time: '18:00 - 19:30',
            classCode: 'TOAN_K03_NT2_13_01',
            className: 'Toán Lớp 3 Nền tảng 2',
            studentName: 'Trần Gia Bảo',
            studentNames: ['Trần Gia Bảo', 'Đặng Tuấn Kiệt', 'Nguyễn Hà My'],
            type: 'STUDENT_CANCELED',
            statusText: 'HS xin nghỉ gấp sát giờ (Đang giải trình)',
            checkin: '17:55 (Đã trực phòng)',
            checkout: '18:30 (Được cho nghỉ)',
            hasAiReview: false,
            creditCoeff: 0.5,
            hrPayNote: 'Tạm tính 0.5 công (Trực phòng chờ)',
            dispute: null,
            teacherId: 'GV-001',
            teacherName: 'Thầy Trần Anh Tuấn',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-3',
            durationMinutes: 35,
            studentCount: 0,
            reconcileStatus: 'CO_GIAI_TRINH'
          }
        ]
      },
      {
        teacherId: 'GV-002',
        teacherName: 'Cô Nguyễn Thị Mai Hoa',
        staffRole: 'GIAO_VIEN',
        staffRoleName: 'Giáo viên',
        subject: 'ANH',
        subjectName: 'Môn Tiếng Anh',
        standardSessions: 24,
        coverSessions: 1,
        studentCanceledSessions: 0,
        lateSessions: 0,
        emergencySessions: 0,
        approvedExplanations: 0,
        reconcileStatus: 'DA_GUI',
        sessions: [
          {
            id: 'S-0902',
            week: 'W1',
            date: '2026-09-03',
            dateStr: '03/09/2026',
            dayOfWeek: 'Thứ 5',
            time: '19:45 - 21:15',
            classCode: 'ENG_K04_NC_11_01',
            className: 'Tiếng Anh Lớp 4 Nâng cao',
            studentName: 'Em Lê Quỳnh Anh (1-1)',
            type: 'STANDARD',
            statusText: 'Dạy chuẩn',
            checkin: '19:40 (Đúng giờ)',
            checkout: '21:15 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công chuẩn',
            dispute: null,
            teacherId: 'GV-002',
            teacherName: 'Cô Nguyễn Thị Mai Hoa',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-1',
            durationMinutes: 90,
            studentCount: 1,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0908',
            week: 'W2',
            date: '2026-09-10',
            dateStr: '10/09/2026',
            dayOfWeek: 'Thứ 5',
            time: '19:45 - 21:15',
            classCode: 'ENG_K04_NC_11_01',
            className: 'Tiếng Anh Lớp 4 Nâng cao',
            studentName: 'Em Lê Quỳnh Anh (1-1)',
            type: 'STANDARD',
            statusText: 'Dạy chuẩn',
            checkin: '19:42 (Đúng giờ)',
            checkout: '21:18 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công chuẩn',
            dispute: null,
            teacherId: 'GV-002',
            teacherName: 'Cô Nguyễn Thị Mai Hoa',
            staffRole: 'GIAO_VIEN',
            staffRoleName: 'Giáo viên',
            model: '1-1',
            durationMinutes: 90,
            studentCount: 1,
            reconcileStatus: 'DA_XAC_NHAN'
          }
        ]
      },
      {
        teacherId: 'GV-003',
        teacherName: 'Gia sư Lê Hoàng Nam',
        staffRole: 'GIA_SU',
        staffRoleName: 'Gia sư',
        subject: 'TOAN',
        subjectName: 'Môn Toán',
        standardSessions: 18,
        coverSessions: 1,
        studentCanceledSessions: 1,
        lateSessions: 0,
        emergencySessions: 0,
        approvedExplanations: 0,
        reconcileStatus: 'CHO_GUI',
        sessions: [
          {
            id: 'S-0905',
            week: 'W1',
            date: '2026-09-04',
            dateStr: '04/09/2026',
            dayOfWeek: 'Thứ 6',
            time: '18:00 - 19:30',
            classCode: 'TOAN_GS_K04_11_02',
            className: 'Gia sư Toán Lớp 4 Kèm 1-1',
            studentName: 'Em Nguyễn Minh Triết (1-1)',
            type: 'STANDARD',
            statusText: 'Dạy chuẩn kèm 1-1',
            checkin: '17:55 (Đúng giờ)',
            checkout: '19:30 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công gia sư kèm 1-1',
            dispute: null,
            teacherId: 'GV-003',
            teacherName: 'Gia sư Lê Hoàng Nam',
            staffRole: 'GIA_SU',
            staffRoleName: 'Gia sư',
            model: '1-1',
            durationMinutes: 90,
            studentCount: 1,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0915',
            week: 'W2',
            date: '2026-09-11',
            dateStr: '11/09/2026',
            dayOfWeek: 'Thứ 6',
            time: '18:00 - 19:30',
            classCode: 'TOAN_GS_K04_11_02',
            className: 'Gia sư Toán Lớp 4 Kèm 1-1',
            studentName: 'Em Nguyễn Minh Triết (1-1)',
            type: 'STANDARD',
            statusText: 'Dạy chuẩn kèm 1-1',
            checkin: '17:58 (Đúng giờ)',
            checkout: '19:30 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công gia sư kèm 1-1',
            dispute: null,
            teacherId: 'GV-003',
            teacherName: 'Gia sư Lê Hoàng Nam',
            staffRole: 'GIA_SU',
            staffRoleName: 'Gia sư',
            model: '1-1',
            durationMinutes: 90,
            studentCount: 1,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0922',
            week: 'W3',
            date: '2026-09-18',
            dateStr: '18/09/2026',
            dayOfWeek: 'Thứ 6',
            time: '18:00 - 19:30',
            classCode: 'TOAN_GS_K04_13_01',
            className: 'Gia sư Nhóm nhỏ Toán Lớp 4 (1-3)',
            studentName: 'Trần Gia Bảo',
            studentNames: ['Trần Gia Bảo', 'Đặng Tuấn Kiệt', 'Nguyễn Hà My'],
            type: 'STANDARD',
            statusText: 'Dạy chuẩn nhóm 1-3',
            checkin: '17:56 (Đúng giờ)',
            checkout: '19:32 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công gia sư nhóm 1-3',
            dispute: null,
            teacherId: 'GV-003',
            teacherName: 'Gia sư Lê Hoàng Nam',
            staffRole: 'GIA_SU',
            staffRoleName: 'Gia sư',
            model: '1-3',
            durationMinutes: 90,
            studentCount: 3,
            reconcileStatus: 'DA_XAC_NHAN'
          },
          {
            id: 'S-0928',
            week: 'W4',
            date: '2026-09-25',
            dateStr: '25/09/2026',
            dayOfWeek: 'Thứ 6',
            time: '18:00 - 19:30',
            classCode: 'TOAN_GS_K04_11_02',
            className: 'Gia sư Toán Lớp 4 Kèm 1-1',
            studentName: 'Em Nguyễn Minh Triết (1-1)',
            type: 'COVER',
            statusText: 'Dạy thay gia sư đồng nghiệp',
            checkin: '17:59 (Đúng giờ)',
            checkout: '19:31 (Đủ giờ)',
            hasAiReview: true,
            creditCoeff: 1.0,
            hrPayNote: '1.0 công (Gia sư dạy thay)',
            dispute: null,
            teacherId: 'GV-003',
            teacherName: 'Gia sư Lê Hoàng Nam',
            staffRole: 'GIA_SU',
            staffRoleName: 'Gia sư',
            model: '1-1',
            durationMinutes: 90,
            studentCount: 1,
            reconcileStatus: 'DA_XAC_NHAN'
          }
        ]
      }
    ],
    disputes: [
      {
        id: 'DSP-0901',
        teacherId: 'GV-001',
        teacherName: 'Thầy Trần Anh Tuấn',
        staffRole: 'GIAO_VIEN',
        subject: 'TOAN',
        sessionId: 'S-0925',
        sessionTime: '26/09/2026 (18:00 - 19:30)',
        classCode: 'TOAN_K03_NT2_13_01',
        incidentType: 'Học sinh xin nghỉ sát giờ nhưng hệ thống ghi nhận nhầm GV vắng',
        content: 'Học sinh xin nghỉ sát giờ trước 30 phút, tôi đã vào trực phòng và đợi đến 18:30 theo quy chế vận hành. Kính đề nghị bảo lưu 1.0 công thay vì 0.5 công.',
        attachment: 'Anh_chup_man_hinh_doi_lop.png',
        status: 'CHO_DUYET',
        adminNote: ''
      }
    ]
  }
};

const createOctoberPayrollSample = (septemberData: MonthPayrollData): MonthPayrollData => {
  const sessionIdMap = new Map<string, string>();
  septemberData.teachers.forEach(teacher => {
    teacher.sessions.forEach(session => {
      sessionIdMap.set(session.id, session.id.replace(/^S-09/, 'S-10'));
    });
  });

  const disputes = septemberData.disputes.map(dispute => {
    return {
      ...dispute,
      id: dispute.id.replace(/^DSP-09/, 'DSP-10'),
      sessionId: dispute.sessionId ? sessionIdMap.get(dispute.sessionId) || dispute.sessionId : undefined,
      sessionTime: dispute.sessionTime?.replace(/\/09\/2026/g, '/10/2026'),
      status: 'CHO_DUYET' as const,
      adminNote: ''
    };
  });
  const disputedSessionIds = new Set(disputes.map(dispute => dispute.sessionId).filter(Boolean));

  return {
    isLocked: false,
    adminSentNotice: true,
    teachers: septemberData.teachers.map(teacher => {
      const sessions = teacher.sessions.map(session => {
        const date = new Date(`${session.date}T12:00:00`);
        date.setMonth(date.getMonth() + 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${day}/${month}/${year}`;

        return {
          ...session,
          id: sessionIdMap.get(session.id) || session.id,
          date: `${year}-${month}-${day}`,
          dateStr,
          dayOfWeek: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
          reconcileStatus: disputedSessionIds.has(sessionIdMap.get(session.id) || '')
            ? 'CO_GIAI_TRINH' as const
            : 'CHO_DOI_SOAT' as const,
          dispute: null
        };
      });
      const countType = (type: SessionPayrollRecord['type']) =>
        sessions.filter(session => session.type === type).length;

      return {
        ...teacher,
        standardSessions: countType('STANDARD'),
        coverSessions: countType('COVER'),
        studentCanceledSessions: countType('STUDENT_CANCELED'),
        lateSessions: countType('LATE'),
        emergencySessions: countType('EMERGENCY'),
        approvedExplanations: countType('APPROVED_EXPLANATION'),
        reconcileStatus: disputes.some(dispute => dispute.teacherId === teacher.teacherId)
          ? 'CO_GIAI_TRINH' as const
          : 'CHO_GUI' as const,
        sessions
      };
    }),
    disputes
  };
};

initialPayrollStore['2026-10'] = createOctoberPayrollSample(initialPayrollStore['2026-09']);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shouldSeedLinkedSamples] = useState(() => {
    try {
      return localStorage.getItem('vuihoc_linked_demo_samples_v1') !== 'true';
    } catch {
      return false;
    }
  });

  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => getStored('currentUser', initialUsers[0]));
  const [activeModule, setActiveModule] = useState<number>(() => getStored('activeModule', 1));
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() =>
    currentUser.role === 'Giáo viên Giảng dạy' ? 'TEACHER' : 'ADMIN'
  );
  const [teacherPortalTab, setTeacherPortalTab] = useState<'schedule' | 'availability' | 'payroll' | 'evaluation' | 'reconcile'>('availability');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // PH1
  const [users, setUsers] = useState<UserAccount[]>(() => getStored('users', initialUsers));
  const [roleGroups, setRoleGroups] = useState<SystemRoleGroup[]>(() => getStored('roleGroups', initialRoleGroups));

  const [teachingCategories, setTeachingCategories] = useState<CategoryGroup[]>(() => getStored('teachingCategories', DEFAULT_TEACHER_CATEGORIES.map(category => ({ ...category, options: category.id.startsWith('CAP-') ? category.options.filter(option => option.id.startsWith('Lớp ')) : category.options }))));
  // PH2
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => getStored('subjects', initialSubjects));
  const [levels, setLevels] = useState<LevelItem[]>(() => getStored('levels', initialLevels));
  const [timeSlots, setTimeSlots] = useState<TimeSlotItem[]>(() => {
    const stored = getStored<TimeSlotItem[]>('timeSlots', initialTimeSlots);
    if (!stored.some(s => s.code === 'SLOT-1250' || s.timeRange.includes('12:50'))) {
      return [initialTimeSlots[0], ...stored];
    }
    return stored;
  });
  const [packages, setPackages] = useState<PackageDurationItem[]>(() => getStored('packages', initialPackages));
  const [models, setModels] = useState<ClassModelItem[]>(() => getStored('models', initialModels));
  const [incidents, setIncidents] = useState<IncidentCategory[]>(() => getStored('incidents', initialIncidents));

  // PH3
  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => {
    const stored = getStored<TeacherProfile[]>('teachers', initialTeachers);
    return stored.map(t => {
      if (t.id === 'GV-001' && (!t.schedule?.['SLOT-1250'] || t.schedule['SLOT-1250'].length === 0)) {
        return {
          ...t,
          schedule: {
            ...t.schedule,
            'SLOT-1250': ['free', 'free', 'free', 'free', 'free', 'free', 'free']
          }
        };
      }
      return t;
    });
  });

  // PH4 (Students & Classes)
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    const stored = getStored<StudentRecord[]>('students', initialStudents);
    if (!shouldSeedLinkedSamples) return stored;
    const normalized = stored.map(student => student.id === 'HS-2026-003' && student.currentClassCode === 'Chưa xếp lớp'
      ? { ...student, scheduleSlots: ['T7 (12:50 - 13:50)'], status: 'Đang học' as const, currentClassCode: 'TOAN_K03_DEMO_T7' }
      : student);
    const sampleStudent = initialStudents.find(student => student.id === 'HS-2026-004');
    return sampleStudent && !normalized.some(student => student.id === sampleStudent.id)
      ? [...normalized, sampleStudent]
      : normalized;
  });
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const stored = getStored<ClassItem[]>('classes', initialClasses);
    let next = stored;
    if (!stored.some(c => c.id === 'CLS-1250' || c.code === 'TOAN_K04_VIP_1250')) {
      next = [initialClasses[0], ...next];
    }
    if (shouldSeedLinkedSamples) {
      const sampleClasses = initialClasses.filter(cls => cls.id.startsWith('CLS-DEMO-'));
      next = [...next, ...sampleClasses.filter(sample => !next.some(cls => cls.id === sample.id))];
    }
    return next;
  });

  // PH6
  const [criteriaCategories, setCriteriaCategories] = useState<CriteriaCategory[]>(() => getStored('criteria', initialCriteria));
  const [sopDocuments, setSopDocuments] = useState<SOPDocument[]>(() => getStored('sopDocs', initialSOPDocuments));
  const [ragBotConfig, setRagBotConfig] = useState<RAGBotConfig>(() => getStored('ragConfig', initialRAGBotConfig));
  const [activeToneKey, setActiveToneKey] = useState<string>(() => getStored('activeToneKey', 'khich-le'));
  const [toneDirectives, setToneDirectives] = useState<Record<string, { name: string; directive: string }>>(() =>
    getStored('toneDirectives', initialToneDirectives)
  );

  // PH7
  const [payrollStore, setPayrollStore] = useState<Record<string, MonthPayrollData>>(() => {
    const stored = getStored<Record<string, MonthPayrollData>>('payrollStore', initialPayrollStore);
    return {
      ...initialPayrollStore,
      ...stored,
      '2026-10': stored['2026-10'] || initialPayrollStore['2026-10']
    };
  });

  // Tự động chuyển workspace khi đổi user
  useEffect(() => {
    if (currentUser.role === 'Giáo viên Giảng dạy') {
      setWorkspaceMode('TEACHER');
    } else {
      setWorkspaceMode('ADMIN');
    }
  }, [currentUser]);

  // Lưu cache LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_currentUser`, JSON.stringify(currentUser));
      localStorage.setItem(`${STORAGE_KEY}_activeModule`, JSON.stringify(activeModule));
      localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
      localStorage.setItem(`${STORAGE_KEY}_roleGroups`, JSON.stringify(roleGroups));
      localStorage.setItem(`${STORAGE_KEY}_teachingCategories`, JSON.stringify(teachingCategories));
      localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
      localStorage.setItem(`${STORAGE_KEY}_levels`, JSON.stringify(levels));
      localStorage.setItem(`${STORAGE_KEY}_timeSlots`, JSON.stringify(timeSlots));
      localStorage.setItem(`${STORAGE_KEY}_packages`, JSON.stringify(packages));
      localStorage.setItem(`${STORAGE_KEY}_models`, JSON.stringify(models));
      localStorage.setItem(`${STORAGE_KEY}_incidents`, JSON.stringify(incidents));
      localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(teachers));
      localStorage.setItem(`${STORAGE_KEY}_students`, JSON.stringify(students));
      localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(classes));
      localStorage.setItem(`${STORAGE_KEY}_criteria`, JSON.stringify(criteriaCategories));
      localStorage.setItem(`${STORAGE_KEY}_sopDocs`, JSON.stringify(sopDocuments));
      localStorage.setItem(`${STORAGE_KEY}_ragConfig`, JSON.stringify(ragBotConfig));
      localStorage.setItem(`${STORAGE_KEY}_activeToneKey`, JSON.stringify(activeToneKey));
      localStorage.setItem(`${STORAGE_KEY}_toneDirectives`, JSON.stringify(toneDirectives));
      localStorage.setItem(`${STORAGE_KEY}_payrollStore`, JSON.stringify(payrollStore));
    } catch {
      // ignore
    }
  }, [
    currentUser, activeModule, users, roleGroups, teachingCategories, subjects, levels,
    timeSlots, packages, models, incidents, teachers, students,
    classes, criteriaCategories, sopDocuments, ragBotConfig, activeToneKey, toneDirectives, payrollStore
  ]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!shouldSeedLinkedSamples) return;
    try {
      localStorage.setItem('vuihoc_linked_demo_samples_v1', 'true');
    } catch {
      showToast('Không thể đánh dấu dữ liệu mẫu đã liên kết trên thiết bị này.', 'warning');
    }
  }, [shouldSeedLinkedSamples]);

  // PH1 Actions
  const addUser = (newUser: Omit<UserAccount, 'id'>) => {
    const id = `USR-${String(users.length + 1).padStart(2, '0')}`;
    const user: UserAccount = { ...newUser, id };
    setUsers(prev => [user, ...prev]);
    showToast(`Đã cấp tài khoản mới [${user.username}] thành công!`, 'success');
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    showToast('Cập nhật thông tin tài khoản thành công!', 'success');
  };

  const toggleLockUser = (id: string) => {
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
    if (!canManageTeacherProfiles(currentUser, roleGroups)) { showToast('Bạn chưa được cấp quyền quản lý hồ sơ giáo viên.', 'error'); return null; }
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
    setTeachers(prev => [teacher, ...prev]);
    showToast(`Đã thêm hồ sơ Giáo viên [${teacher.name}] thành công!`, 'success');
  };

  const updateTeacher = (id: string, updates: Partial<TeacherProfile>) => {
    const teacher = teachers.find(t => t.id === id);
    const editsProfile = Object.keys(updates).some(key => !['schedule', 'freeSlots', 'busySlots', 'isFull'].includes(key));
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
    setStudents(prev => [student, ...prev]);
    showToast(`Đã tiếp nhận hồ sơ học sinh [${student.name}]!`, 'success');
  };

  const updateStudent = (id: string, updates: Partial<StudentRecord>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    showToast('Cập nhật hồ sơ học sinh thành công!', 'success');
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: c.studentIds.filter(sid => sid !== id)
    })));
    showToast('Đã xóa hồ sơ học sinh khỏi hệ thống!', 'info');
  };

  const addClass = (cls: ClassItem) => {
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
          return { ...t, sessions: updatedSessions };
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
          return { ...t, sessions: updatedSessions };
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
    showToast(`Đã cập nhật hệ số buổi học [${sessionId}] sang ${newCoeff}.`, 'success');
  };

  const sendPayrollToTeachers = (month: string, teacherIds: string[]) => {
    const teacherIdSet = new Set(teacherIds);
    const currentMonthData = payrollStore[month];
    const sendableTeacherIds = new Set(
      currentMonthData && !currentMonthData.isLocked
        ? currentMonthData.teachers
            .filter(teacher =>
              teacherIdSet.has(teacher.teacherId) &&
              (teacher.staffRole || 'GIAO_VIEN') === 'GIA_SU' &&
              ['CHO_GUI', 'DA_XU_LY_GT'].includes(teacher.reconcileStatus)
            )
            .map(teacher => teacher.teacherId)
        : []
    );
    if (sendableTeacherIds.size === 0) {
      showToast('Không có gia sư nào đang chờ gửi đối soát trong lựa chọn này.', 'info');
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
            sendableTeacherIds.has(teacher.teacherId) && ['CHO_GUI', 'DA_XU_LY_GT'].includes(teacher.reconcileStatus)
              ? { ...teacher, reconcileStatus: 'DA_GUI' }
              : teacher
          )
        }
      };
    });
    showToast(`Đã gửi đối soát cho ${sendableTeacherIds.size} gia sư trong kỳ ${month}.`, 'success');
  };

  const submitDispute = (month: string, dispute: DisputeItem) => {
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
    showToast(`Đã gửi đơn giải trình thành công! Đang chờ Quản trị viên duyệt.`, 'success');
  };

  const reviewDispute = (month: string, disputeId: string, status: 'DA_DUYET' | 'TU_CHOI' | 'CHO_DUYET', note: string, creditCoeff: number) => {
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

    showToast(`Đã gửi kết quả ${status === 'DA_DUYET' ? 'chấp nhận' : 'từ chối'} giải trình cho giáo viên.`, 'success');
  };

  const lockPayrollMonth = (month: string) => {
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          isLocked: true,
          teachers: currentMonthData.teachers.map(t => ({ ...t, reconcileStatus: 'DA_CHOT' as const }))
        }
      };
    });
    showToast(`Đã khóa sổ kỳ công ${month}! Nút 'Xuất Excel gửi Nhân sự' đã sẵn sàng.`, 'success');
  };

  const unlockPayrollMonth = (month: string, reason: string) => {
    setPayrollStore(prev => {
      const currentMonthData = prev[month];
      if (!currentMonthData) return prev;
      return {
        ...prev,
        [month]: {
          ...currentMonthData,
          isLocked: false,
          teachers: currentMonthData.teachers.map(t => ({ ...t, reconcileStatus: 'DA_GUI' as const }))
        }
      };
    });
    showToast(`Admin đã mở lại sổ kỳ công ${month}. Lý do: "${reason || 'Hiệu chỉnh dữ liệu'}"`, 'info');
  };

  const resetAllDataToDefaults = () => {
    localStorage.clear();
    setUsers(initialUsers);
    setRoleGroups(initialRoleGroups);
    setSubjects(initialSubjects);
    setLevels(initialLevels);
    setTimeSlots(initialTimeSlots);
    setPackages(initialPackages);
    setModels(initialModels);
    setIncidents(initialIncidents);
    setTeachers(initialTeachers);
    setStudents(initialStudents);
    setClasses(initialClasses);
    setCriteriaCategories(initialCriteria);
    setSopDocuments(initialSOPDocuments);
    setRagBotConfig(initialRAGBotConfig);
    setActiveToneKey('khich-le');
    setToneDirectives(initialToneDirectives);
    setPayrollStore(initialPayrollStore);
    setCurrentUser(initialUsers[0]);
    setActiveModule(1);
    setWorkspaceMode('ADMIN');
    showToast('Đã khôi phục toàn bộ hệ thống về 1 bộ dữ liệu liên thông sạch chuẩn!', 'success');
  };

  const clearAllData = () => {
    setStudents([]);
    setClasses([]);
    setPayrollStore({
      '2026-09': {
        isLocked: false,
        adminSentNotice: true,
        teachers: teachers.map(t => ({
          teacherId: t.id,
          teacherName: t.name,
          subject: (t.subject === 'SUB-MATH' ? 'TOAN' : 'ANH') as 'TOAN' | 'ANH',
          subjectName: t.subjectName,
          standardSessions: 0,
          coverSessions: 0,
          studentCanceledSessions: 0,
          lateSessions: 0,
          emergencySessions: 0,
          approvedExplanations: 0,
          reconcileStatus: 'CHO_GUI' as const,
          sessions: []
        })),
        disputes: []
      }
    });
    showToast('Đã xóa sạch toàn bộ danh sách học sinh, lớp học và khiếu nại (Empty State)!', 'info');
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
        setUsers,
        roleGroups,
        setRoleGroups,
        addUser,
        updateUser,
        toggleLockUser,
        teachingCategories,
        setTeachingCategories,
        createTeacherWithAccount,
        subjects,
        setSubjects,
        levels,
        setLevels,
        timeSlots,
        setTimeSlots,
        packages,
        setPackages,
        models,
        setModels,
        incidents,
        setIncidents,
        teachers,
        setTeachers,
        addTeacher,
        updateTeacher,
        students,
        setStudents,
        classes,
        setClasses,
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
        setCriteriaCategories,
        sopDocuments,
        setSopDocuments,
        ragBotConfig,
        setRagBotConfig,
        activeToneKey,
        setActiveToneKey,
        toneDirectives,
        setToneDirectives,
        payrollStore,
        setPayrollStore,
        updateSessionCredit,
        sendPayrollToTeachers,
        submitDispute,
        reviewDispute,
        lockPayrollMonth,
        unlockPayrollMonth,
        resetAllDataToDefaults,
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
