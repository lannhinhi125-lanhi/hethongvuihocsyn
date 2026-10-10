// Định nghĩa toàn bộ types cho hệ thống Vuihoc Tutor liên thông 8 phân hệ

export type UserRole = 'Quản trị Toàn quyền' | 'Quản lý Chuyên môn' | 'Nhân viên Vận hành Lớp' | 'Giáo viên Giảng dạy';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  passwordRaw: string;
  email: string;
  phone: string;
  role: UserRole;
  subject?: string;
  status: 'active' | 'locked';
  avatarInitials: string;
}

export interface SystemRoleGroup {
  id: string;
  name: string;
  category: 'HỆ THỐNG' | 'CHUYÊN MÔN' | 'VẬN HÀNH' | 'GIẢNG DẠY';
  desc: string;
  userCount: number;
  permissions: string[];
  isDefault?: boolean;
}

// Phân hệ 2: Master Data
export interface SubjectItem {
  id: string;
  code: string;
  abbr: string;
  name: string;
  desc: string;
  status: boolean;
}

export interface LevelItem {
  id: string;
  code: string;
  abbr: string;
  name: string;
  target: string;
  objective: string;
  status: boolean;
}

export interface TimeSlotItem {
  id: string;
  code: string;
  name: string;
  timeRange: string;
  durationMinutes: number;
  status: boolean;
}

export interface PackageDurationItem {
  id: string;
  code: string;
  name: string;
  months: number;
  daysConverted: number;
  status: boolean;
}

export interface ClassModelItem {
  id: string;
  code: string;
  name: string;
  maxStudents: number;
  status: boolean;
}

export interface IncidentCategory {
  id: string;
  code: string;
  name: string;
  desc?: string;
  subIncidents: SubIncidentItem[];
}

export interface SubIncidentItem {
  id: string;
  code: string;
  name: string;
  targetParty: 'Giáo viên' | 'Học sinh' | 'Khách quan';
  desc: string;
  status: boolean;
}

// Phân hệ 3: Hồ sơ Giáo viên & Dự giờ
export interface SuccessfulSession {
  code: string;
  name: string;
  date: string;
  dateISO?: string;
  week: string;
  slot: string;
  students: string;
  status: string;
  roomLink: string;
  recordLink: string;
  checkin: string;
  gradeLevel?: string;
  model?: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  username?: string;
  passwordRaw?: string;
  subject: string; // SUB-MATH | SUB-ENG
  subjectName: string;
  levelId: string; // CAP-TH | CAP-THCS | CAP-THPT
  levelName: string;
  grades: string[]; // ['Lớp 3', 'Lớp 4']
  models?: string[]; // ['1-1', '1-n'] (e.g. 1-1, 1-3, 1-5)
  phone: string;
  email: string;
  degree: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status: 'DANG_DAY' | 'CHO_LOP' | 'TAM_NGUNG';
  statusLabel: string;
  evalStatus: 'SCORED' | 'UNSCORED';
  evalScore: string | null;
  evalComment: string;
  evalCriteriaScores?: { tc1: number; tc2: number; tc3: number };
  freeSlots: number;
  busySlots: number;
  isFull: boolean;
  evaluationReports?: EvaluationRecord[];
  successfulSessions: SuccessfulSession[];
  schedule: Record<string, ('free' | 'busy' | 'none')[]>; // slotId -> 7 days (Thứ 2 - CN)
}

// Phân hệ 4 & 5: Lớp học & Học sinh
export interface StudentRecord {
  id: string;
  name: string;
  grade: string; // 'Lớp 1' ... 'Lớp 5'
  subject: string; // 'SUB-MATH' | 'SUB-ENG'
  model: string; // '1-1' | '1-3' | '1-5'
  level: string; // 'LVL-F1' ... 'LVL-ADV'
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  scheduleSlots: string[]; // ['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)']
  status: 'Chờ xếp lớp' | 'Đang học' | 'Bảo lưu' | 'Đã thôi học';
  currentClassCode?: string;
}

export interface ClassSessionMaterial {
  month: string; // '10/2026'
  week: string; // 'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026'
  session: number; // 1 | 2
  title: string;
  slide: string;
  lms: string;
}

export interface ClassRoomSession {
  sessionNum: number;
  dateStr: string;
  title: string;
  status: 'Chưa diễn ra' | 'Đang học' | 'Đã hoàn thành' | 'Nghỉ có phép' | 'Dạy thay' | 'Khai giảng';
  checkinTime?: string;
  teacherAttendance?: 'ATTENDED' | 'LATE';
  checkinBy?: string;
  coverTeacherId?: string;
  coverTeacherName?: string;
  materialGv: string;
  materialHs: string;
  exerciseLms: string;
  attendance?: Record<string, 'present' | 'late' | 'absent'>;
  feedback?: Record<string, string>;
  feedbackCriteria?: Record<string, Record<string, string>>;
}

export interface ClassCoverAssignment {
  sessionNum: number;
  dateStr: string;
  teacherId: string;
  teacherName: string;
}

export interface ClassItem {
  categoryId?: string;
  status?: 'Chờ khai giảng' | 'Đang học' | 'Tạm dừng' | 'Đã kết thúc';
  id: string;
  code: string;
  name: string;
  grade: string;
  subject: string;
  level: string;
  model: string;
  maxStudents: number;
  studentIds: string[];
  schedule: string;
  roomLink: string;
  teacherName: string;
  teacherId?: string;
  materials: ClassSessionMaterial[];
  activeSessions?: Record<number, ClassRoomSession>;
  coverAssignments?: ClassCoverAssignment[];
}

// Phân hệ 6: Quản trị AI Studio
export interface CriterionOption {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface CriterionItem {
  id: string;
  name: string;
  options: CriterionOption[];
}

export interface CriteriaCategory {
  id: string;
  subject: string;
  name: string;
  criteria: CriterionItem[];
}

export interface SOPDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  updatedAt: string;
  content: string;
  sourceFileName?: string;
  sourceFileType?: 'PDF' | 'DOCX';
  isEnabled?: boolean;
}

export interface RAGBotConfig {
  welcomeGreeting: string;
  quickPrompts: string[];
  personaTone: string;
  strictGroundingOnly: boolean;
  fallbackResponse: string;
  systemPrompt: string;
}

// Phân hệ 7: Chốt công & Đối soát (Dành cho Giáo viên & Gia sư)
export interface SessionPayrollRecord {
  id: string;
  week: string;
  date: string;
  dateStr: string;
  dayOfWeek: string;
  time: string;
  classCode: string;
  className: string;
  studentName: string;
  studentNames?: string[];
  type: 'STANDARD' | 'COVER' | 'STUDENT_CANCELED' | 'LATE' | 'EMERGENCY' | 'APPROVED_EXPLANATION';
  statusText: string;
  checkin: string;
  checkout: string;
  hasAiReview: boolean;
  creditCoeff: number;
  hrPayNote: string;
  dispute: DisputeItem | null;
  teacherId?: string;
  teacherName?: string;
  staffRole?: 'GIAO_VIEN' | 'GIA_SU';
  staffRoleName?: string;
  model?: string;
  durationMinutes?: number;
  studentCount?: number;
  reconcileStatus?: 'CHO_DOI_SOAT' | 'DA_XAC_NHAN' | 'CO_GIAI_TRINH' | 'DA_CHOT';
}

export interface DisputeItem {
  id: string;
  teacherId?: string;
  teacherName?: string;
  staffRole?: 'GIAO_VIEN' | 'GIA_SU';
  subject?: string;
  sessionId?: string;
  sessionTime?: string;
  classCode?: string;
  status: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  incidentType: string;
  content: string;
  attachment: string;
  adminNote?: string;
}

export interface TeacherPayrollSummary {
  teacherId: string;
  teacherName: string;
  staffRole?: 'GIAO_VIEN' | 'GIA_SU';
  staffRoleName?: string;
  subject: 'TOAN' | 'ANH';
  subjectName: string;
  standardSessions: number;
  coverSessions: number;
  studentCanceledSessions: number;
  lateSessions: number;
  emergencySessions: number;
  approvedExplanations: number;
  reconcileStatus: 'CHO_GUI' | 'DA_GUI' | 'CO_GIAI_TRINH' | 'DA_XU_LY_GT' | 'DA_CHOT';
  sessions: SessionPayrollRecord[];
}

export interface MonthPayrollData {
  isLocked: boolean;
  adminSentNotice: boolean;
  teachers: TeacherPayrollSummary[];
  disputes: DisputeItem[];
}

export interface EvaluationRecord {
  teacherId?: string;
  recipientUserId?: string;
  sessionCode?: string;
  sessionDate?: string;
  sentAt?: string;
  roomLink?: string;
  recordLink?: string;
  id: string;
  reportCode: string; // Số biên bản, ví dụ: BBDG/2026/089
  evaluationDate: string; // Ngày dự giờ
  evaluatorName: string; // Người dự giờ
  evaluatorRole: string; // Chức vụ
  classCode: string; // Mã lớp
  className: string; // Tên lớp
  sessionNum: number; // Buổi số mấy
  sessionName: string; // Tiết học / Bài học
  timeSlot: string; // Ca dạy
  model: string; // 1-3, 1-1
  overallScore: number; // 9.2
  rank: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Cần bồi dưỡng';
  criteriaScores: {
    tc1: number; // Giáo án & Sư phạm (40%)
    tc2: number; // Tương tác & Khích lệ (35%)
    tc3: number; // Thao tác Bảng vẽ & Công nghệ (25%)
  };
  generalComment: string; // Nhận xét chung
  strengths: string; // Điểm mạnh
  improvements: string; // Cần khắc phục
  recommendations: string; // Khuyến nghị chuyên môn
  status: 'DA_DUYET' | 'CHO_GOP_Y';
}
