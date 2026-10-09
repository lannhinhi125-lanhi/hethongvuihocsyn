import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from '../components/FilterDrawer';
import { CategoryMultiFilter } from '../components/CategoryMultiFilter';
import { TeacherAvailabilityView } from './TeacherAvailabilityView';
import { resolveTeacherAccount, sessionDateISO, sessionsInRange } from '../lib/evaluation';
import { TeacherProfile, SuccessfulSession, EvaluationRecord } from '../types';
import {
  Contact,
  Calendar,
  ClipboardCheck,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  CheckCircle,
  PlayCircle,
  Pencil,
  Trash2,
  X,
  Send,
  Video,
  Filter,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  Maximize2,
  ExternalLink,
  BookOpen,
  Users,
  FileText,
  Award,
  Clock,
  Copy,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';

export const Module3_Teachers: React.FC = () => {
  const { teachers, setTeachers, timeSlots, addUser, showToast, users, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'evaluation'>('profile');
  const [isTeacherFilterOpen, setIsTeacherFilterOpen] = useState(false);
  const [newTeacherModels, setNewTeacherModels] = useState<string[]>(['1-1', '1-n']);
  const [revealedTeacherPass, setRevealedTeacherPass] = useState<Record<string, boolean>>({});
  const [scheduleModalTeacher, setScheduleModalTeacher] = useState<TeacherProfile | null>(null);

  // Column-level filters (Bộ lọc từng trường dữ liệu)
  const [colSearchName, setColSearchName] = useState('');
  const [colFilterSubject, setColFilterSubject] = useState('ALL');
  const [colFilterLevel, setColFilterLevel] = useState('ALL');
  const [colFilterGrade, setColFilterGrade] = useState('ALL');
  const [colFilterModel, setColFilterModel] = useState('ALL');
  const [colFilterStatus, setColFilterStatus] = useState('ALL');

  // Edit Teacher Modal State
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherSubject, setEditTeacherSubject] = useState('SUB-MATH');
  const [editTeacherLevel, setEditTeacherLevel] = useState('CAP-TH');
  const [editTeacherGrades, setEditTeacherGrades] = useState<string[]>([]);
  const [editTeacherModels, setEditTeacherModels] = useState<string[]>(['1-1', '1-n']);
  const [editTeacherStatus, setEditTeacherStatus] = useState<'DANG_DAY' | 'CHO_LOP' | 'TAM_NGUNG'>('DANG_DAY');
  const [editTeacherDegree, setEditTeacherDegree] = useState('');

  // Delete Teacher Modal State
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherProfile | null>(null);

  // Filters (Drawer)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Availability filters
  const [availSubject, setAvailSubject] = useState('ALL');
  const [availStatus, setAvailStatus] = useState('ALL');

  // Evaluation filters
  const [evalDateFrom, setEvalDateFrom] = useState('');
  const [evalDateTo, setEvalDateTo] = useState('');
  const [evalSubject, setEvalSubject] = useState('ALL');
  const [evalColSearchName, setEvalColSearchName] = useState('');
  const [evalColFilterSubject, setEvalColFilterSubject] = useState('ALL');
  const [evalColFilterLevel, setEvalColFilterLevel] = useState('ALL');
  const [evalColFilterStatus, setEvalColFilterStatus] = useState('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherProfile | null>(null);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<TeacherProfile | null>(null);
  const [isSelfRegisterModalOpen, setIsSelfRegisterModalOpen] = useState(false);

  // Evaluation flow state
  const [gradingTeacher, setGradingTeacher] = useState<TeacherProfile | null>(null);
  const [isSelectSessionModalOpen, setIsSelectSessionModalOpen] = useState(false);
  const [selectedSessionForGrading, setSelectedSessionForGrading] = useState<SuccessfulSession | null>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);

  // Grading form state
  const [tc1Score, setTc1Score] = useState(8.5);
  const [tc2Score, setTc2Score] = useState(8.0);
  const [tc3Score, setTc3Score] = useState(9.0);
  const [gradingComment, setGradingComment] = useState('');
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);

  // Create teacher form
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('SUB-MATH');
  const [newTeacherLevel, setNewTeacherLevel] = useState('CAP-TH');
  const [newTeacherGrades, setNewTeacherGrades] = useState<string[]>(['Lớp 3', 'Lớp 4']);
  const [newTeacherDegree, setNewTeacherDegree] = useState('');

  const gradeOptionsByLevel: Record<string, string[]> = {
    'CAP-TH': ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'],
    'CAP-THCS': ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'],
    'CAP-THPT': ['Lớp 10', 'Lớp 11', 'Lớp 12'],
    'CAT-IELTS': ['IELTS 5.0 - 5.5', 'IELTS 6.0 - 6.5', 'IELTS 6.5 - 7.5', 'IELTS 8.0+', 'Cambridge KET/PET', 'Cambridge Flyers'],
    'CAT-MATH-SPEC': ['Toán Tư duy Singapore', 'Toán Soroban', 'Luyện thi Violympic', 'Toán Nâng cao 1-3', 'Toán 1 kèm 1']
  };

  // Bộ lọc Phân cấp theo Danh mục & Cấp độ (Tiểu học, THCS, THPT, IELTS...)
  const [catFilterCategory, setCatFilterCategory] = useState<string>('ALL');
  const [catFilterSubOptions, setCatFilterSubOptions] = useState<string[]>([]);

  // Filtered teachers list (kết hợp cả thanh tìm kiếm, bộ lọc drawer, bộ lọc danh mục và bộ lọc theo từng trường)
  const filteredTeachers = teachers.filter(t => {
    // 1. Khớp theo Danh mục & Checkbox đa chọn (Tiểu học, THCS, THPT, IELTS...)
    let matchCat = true;
    if (catFilterCategory !== 'ALL') {
      if (catFilterSubOptions.length > 0) {
        matchCat = catFilterSubOptions.some(opt =>
          t.grades.includes(opt) ||
          t.grades.some(g => opt.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(opt.toLowerCase())) ||
          t.degree.toLowerCase().includes(opt.toLowerCase()) ||
          t.levelName.toLowerCase().includes(opt.toLowerCase()) ||
          t.levelId === catFilterCategory
        );
      } else {
        matchCat = t.levelId === catFilterCategory ||
                   t.levelName.toLowerCase().includes(catFilterCategory.toLowerCase());
      }
    } else if (catFilterSubOptions.length > 0) {
      matchCat = catFilterSubOptions.some(opt =>
        t.grades.includes(opt) ||
        t.grades.some(g => opt.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(opt.toLowerCase())) ||
        t.degree.toLowerCase().includes(opt.toLowerCase())
      );
    }

    const matchSearch =
      (!searchKeyword ||
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.phone.includes(searchKeyword)) &&
      (!colSearchName ||
        t.name.toLowerCase().includes(colSearchName.toLowerCase()) ||
        t.id.toLowerCase().includes(colSearchName.toLowerCase()));

    const matchSub = (filterSubject === 'ALL' || t.subject === filterSubject) &&
                     (colFilterSubject === 'ALL' || t.subject === colFilterSubject);

    const matchLvl = (filterLevel === 'ALL' || t.levelId === filterLevel) &&
                     (colFilterLevel === 'ALL' || t.levelId === colFilterLevel);

    const matchGrd = (filterGrade === 'ALL' || t.grades.includes(filterGrade)) &&
                     (colFilterGrade === 'ALL' || t.grades.includes(colFilterGrade));

    const tModels = t.models && t.models.length > 0 ? t.models : ['1-1', '1-n'];
    const matchModel = colFilterModel === 'ALL' || tModels.includes(colFilterModel);

    const matchSts = (filterStatus === 'ALL' || t.status === filterStatus) &&
                     (colFilterStatus === 'ALL' || t.status === colFilterStatus);

    return matchCat && matchSearch && matchSub && matchLvl && matchGrd && matchModel && matchSts;
  });

  // Handlers for Teacher Edit & Status
  const handleOpenEditModal = (t: TeacherProfile) => {
    setEditingTeacher(t);
    setEditTeacherName(t.name);
    setEditTeacherPhone(t.phone);
    setEditTeacherEmail(t.email);
    setEditTeacherSubject(t.subject);
    setEditTeacherLevel(t.levelId);
    setEditTeacherGrades(t.grades || []);
    setEditTeacherModels(t.models && t.models.length > 0 ? t.models : ['1-1', '1-n']);
    setEditTeacherStatus(t.status);
    setEditTeacherDegree(t.degree || '');
  };

  const handleEditGradeToggle = (grade: string) => {
    setEditTeacherGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const handleEditTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (editTeacherGrades.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 khối lớp phụ trách!', 'error');
      return;
    }
    if (editTeacherModels.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 hình thức giảng dạy (1-1 hoặc 1-n)!', 'error');
      return;
    }

    const statusLabel =
      editTeacherStatus === 'DANG_DAY' ? 'Đang dạy' :
      editTeacherStatus === 'CHO_LOP' ? 'Chờ lớp' : 'Tạm ngưng';

    setTeachers(prev =>
      prev.map(t => {
        if (t.id === editingTeacher.id) {
          return {
            ...t,
            name: editTeacherName.trim(),
            phone: editTeacherPhone.trim(),
            email: editTeacherEmail.trim(),
            subject: editTeacherSubject,
            subjectName: editTeacherSubject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh',
            levelId: editTeacherLevel,
            levelName: editTeacherLevel === 'CAP-TH' ? 'Tiểu học' : editTeacherLevel === 'CAP-THCS' ? 'THCS' : 'THPT',
            grades: editTeacherGrades,
            models: editTeacherModels,
            status: editTeacherStatus,
            statusLabel,
            degree: editTeacherDegree.trim()
          };
        }
        return t;
      })
    );

    setEditingTeacher(null);
    showToast(`Đã cập nhật thông tin Giáo viên ${editTeacherName} thành công!`, 'success');
  };

  const handleQuickStatusChange = (tId: string, newStatus: 'DANG_DAY' | 'CHO_LOP' | 'TAM_NGUNG') => {
    const statusLabel =
      newStatus === 'DANG_DAY' ? 'Đang dạy' :
      newStatus === 'CHO_LOP' ? 'Chờ lớp' : 'Tạm ngưng';
    setTeachers(prev =>
      prev.map(t => (t.id === tId ? { ...t, status: newStatus, statusLabel } : t))
    );
    showToast(`Đã đổi trạng thái sang [${statusLabel}]!`, 'info');
  };

  const handleDeleteTeacherConfirm = () => {
    if (!teacherToDelete) return;
    const name = teacherToDelete.name;
    setTeachers(prev => prev.filter(t => t.id !== teacherToDelete.id));
    setTeacherToDelete(null);
    showToast(`Đã xóa Giáo viên ${name} khỏi hệ thống!`, 'success');
  };

  // Calculate weighted score
  const finalWeightedScore = ((tc1Score * 1 + tc2Score * 2 + tc3Score * 1) / 4).toFixed(2);

  const handleCreateTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    if (newTeacherGrades.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 khối lớp tiếp nhận!', 'error');
      return;
    }

    const tId = `GV-2026-${Math.floor(100 + Math.random() * 900)}`;
    const uName = `teacher.${Math.floor(1000 + Math.random() * 9000)}`;
    const pRaw = 'Vuihoc@2026';
    const initials = newTeacherName.trim().split(' ').slice(-2).map(p => p[0]).join('').toUpperCase();

    const newTeacher: TeacherProfile = {
      id: tId,
      name: newTeacherName.trim(),
      username: uName,
      passwordRaw: pRaw,
      subject: newTeacherSubject,
      subjectName: newTeacherSubject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh',
      levelId: newTeacherLevel,
      levelName: newTeacherLevel === 'CAP-TH' ? 'Tiểu học' : newTeacherLevel === 'CAP-THCS' ? 'THCS' : 'THPT',
      grades: newTeacherGrades,
      models: newTeacherModels,
      phone: newTeacherPhone.trim(),
      email: newTeacherEmail.trim(),
      degree: newTeacherDegree.trim() || 'Đại học Sư phạm',
      status: 'CHO_LOP',
      statusLabel: 'Chờ lớp',
      evalStatus: 'UNSCORED',
      evalScore: null,
      evalComment: '',
      freeSlots: 6,
      busySlots: 0,
      isFull: false,
      successfulSessions: [
        {
          code: `${newTeacherSubject === 'SUB-MATH' ? 'MAT' : 'ENG'}-01`,
          name: `${newTeacherSubject === 'SUB-MATH' ? 'Toán' : 'Tiếng Anh'} Khởi đầu bài mới`,
          date: 'Thứ Ba, 06/10',
          week: 'W1',
          slot: 'Ca Tối 1 (18:00 - 19:30)',
          students: '1/1 HS',
          status: 'Hoàn thành tốt',
          roomLink: 'https://vuihoc.zoom.us/j/demo',
          recordLink: 'https://record.vuihoc.vn/demo',
          checkin: '17:55 (Đúng giờ)'
        }
      ],
      schedule: {
        'SLOT-E1': ['free', 'free', 'none', 'free', 'none', 'free', 'free'],
        'SLOT-E2': ['none', 'free', 'none', 'free', 'none', 'free', 'none']
      }
    };

    addUser({
      name: newTeacherName.trim(),
      username: uName,
      passwordRaw: pRaw,
      email: newTeacherEmail.trim(),
      phone: newTeacherPhone.trim(),
      role: 'Giáo viên Giảng dạy',
      subject: newTeacherSubject as any,
      status: 'active',
      avatarInitials: initials || 'GV'
    });

    setTeachers(prev => [newTeacher, ...prev]);
    setIsCreateModalOpen(false);
    showToast(`Đã thêm GV ${newTeacher.name} & tự động cấp tài khoản đăng nhập (${uName} / ${pRaw})!`, 'success');
  };

  const handleGradeToggle = (grade: string) => {
    setNewTeacherGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const handleSelectAllGrades = (checkAll: boolean) => {
    const list = gradeOptionsByLevel[newTeacherLevel] || [];
    setNewTeacherGrades(checkAll ? list : []);
  };

  // Evaluation Flow
  const startGradingSession = (session: SuccessfulSession) => {
    setSelectedSessionForGrading(session);
    setIsSelectSessionModalOpen(false);
    const existing = gradingTeacher?.evaluationReports?.find(r => r.sessionCode === session.code && r.sessionDate === sessionDateISO(session));
    setTc1Score(existing?.criteriaScores.tc1 ?? 8.5);
    setTc2Score(existing?.criteriaScores.tc2 ?? 8);
    setTc3Score(existing?.criteriaScores.tc3 ?? 9);
    setGradingComment(existing?.generalComment || '');
    setIsPlayingRecording(false);
    setVideoSpeed(1);
    setIsGradingModalOpen(true);
  };

  const handleSubmitGrading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingTeacher || !selectedSessionForGrading) return;
    const recipient = resolveTeacherAccount(gradingTeacher, users);
    if (!recipient || recipient.status !== 'active') {
      showToast('Chưa có tài khoản giáo viên hoạt động được liên kết duy nhất với hồ sơ này. Vui lòng kiểm tra tài khoản trước khi gửi.', 'error');
      return;
    }
    if (![tc1Score, tc2Score, tc3Score].every(score => Number.isFinite(score) && score >= 0 && score <= 10)) {
      showToast('Điểm từng tiêu chí phải nằm trong khoảng 0–10.', 'error'); return;
    }
    if (!gradingComment.trim()) { showToast('Vui lòng nhập nhận xét trước khi gửi.', 'error'); return; }
    const session = selectedSessionForGrading;
    const existing = gradingTeacher.evaluationReports?.find(r => r.sessionCode === session.code && r.sessionDate === sessionDateISO(session));
    const score = Number(finalWeightedScore);
    const report: EvaluationRecord = {
      id: existing?.id || crypto.randomUUID(), reportCode: existing?.reportCode || `BBDG/${new Date().getFullYear()}/${Date.now()}`,
      teacherId: gradingTeacher.id, recipientUserId: recipient.id, sessionCode: session.code,
      sessionDate: sessionDateISO(session), sentAt: new Date().toISOString(),
      evaluationDate: new Date().toLocaleDateString('vi-VN'), evaluatorName: currentUser.name, evaluatorRole: currentUser.role,
      classCode: session.code, className: session.name, sessionName: session.name, sessionNum: 1,
      timeSlot: session.slot, model: session.model || '', roomLink: session.roomLink, recordLink: session.recordLink,
      overallScore: score, rank: score >= 9 ? 'Xuất sắc' : score >= 8 ? 'Tốt' : score >= 6.5 ? 'Khá' : 'Cần bồi dưỡng',
      criteriaScores: { tc1: tc1Score, tc2: tc2Score, tc3: tc3Score }, generalComment: gradingComment.trim(),
      strengths: '', improvements: '', recommendations: '', status: 'DA_DUYET'
    };

    setTeachers(prev =>
      prev.map(t => {
        if (t.id === gradingTeacher.id) {
          return {
            ...t,
            evalStatus: 'SCORED',
            evalScore: finalWeightedScore,
            evalComment: gradingComment.trim() || 'Giảng dạy chuẩn mực, tương tác tốt với học sinh.',
            evalCriteriaScores: { tc1: tc1Score, tc2: tc2Score, tc3: tc3Score },
            evaluationReports: [report, ...(t.evaluationReports || []).filter(r => r.id !== report.id)]
          };
        }
        return t;
      })
    );

    setIsGradingModalOpen(false);
    showToast(`Đã gửi phiếu chấm (${finalWeightedScore}/10) tới tài khoản ${recipient.username}!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Điều hướng 3 Tab nghiệp vụ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#FF5C00] font-bold text-xs uppercase tracking-wide">
              ĐIỀU HÀNH GIẢNG DẠY
            </span>
            <h2 className="text-xl font-bold text-slate-800">Quản lý Giáo viên &amp; Đánh giá Dự giờ</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu liên kết trực tiếp với Danh mục môn học, Khung giờ chuẩn và Giám sát ca dạy.
          </p>
        </div>

        {/* 3 Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/80 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Contact className="w-4 h-4" />
            <span>Hồ sơ Giáo viên</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'availability' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lịch rảnh &amp; Thời khóa biểu</span>
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'evaluation' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Đánh giá Dự giờ</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: HỒ SƠ GIÁO VIÊN ================= */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          {/* 4 Thống kê nhanh đội ngũ giáo viên */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Tổng giáo viên</span>
              <div className="text-2xl font-black text-slate-800 mt-1">{teachers.length}</div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5" /> Đang hoạt động: {teachers.filter(t => t.status === 'DANG_DAY').length}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Giáo viên Toán</span>
              <div className="text-2xl font-black text-[#FF5C00] mt-1">
                {teachers.filter(t => t.subject === 'SUB-MATH').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5">Mã môn: SUB-MATH</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Giáo viên Tiếng Anh</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {teachers.filter(t => t.subject === 'SUB-ENG').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5">Mã môn: SUB-ENG</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Tạm ngưng nhận lớp</span>
              <div className="text-2xl font-black text-amber-500 mt-1">
                {teachers.filter(t => t.status === 'TAM_NGUNG').length}
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">Khóa ghép lớp mới</span>
            </div>
          </div>

          {/* Bộ lọc đa tiêu chí + Nút mở Drawer bên phải */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsTeacherFilterOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Mở bộ lọc nâng cao từ cột bên phải"
                >
                  <Filter className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>Bộ lọc nâng cao</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-white text-[#FF5C00] text-[10px] font-bold border border-orange-200">
                    {filteredTeachers.length} GV
                  </span>
                </button>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    placeholder="Tìm nhanh tên, mã GV, SĐT..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 font-bold" />
                  <span>Thêm Giáo viên</span>
                </button>
              </div>
            </div>

            {/* BỘ LỌC PHÂN CẤP THEO DANH MỤC (Tiểu học, THCS, THPT, IELTS & Chứng chỉ...) */}
            <div className="pt-2.5 border-t border-slate-100">
              <CategoryMultiFilter
                selectedCategory={catFilterCategory}
                onSelectCategory={catId => {
                  setCatFilterCategory(catId);
                  if (catId === 'ALL') setCatFilterSubOptions([]);
                }}
                selectedSubOptions={catFilterSubOptions}
                onToggleSubOption={optId => {
                  setCatFilterSubOptions(prev =>
                    prev.includes(optId) ? prev.filter(o => o !== optId) : [...prev, optId]
                  );
                }}
                onSelectAllSubOptions={allIds => {
                  setCatFilterSubOptions(prev => Array.from(new Set([...prev, ...allIds])));
                }}
                onClearSubOptions={() => setCatFilterSubOptions([])}
                mode="inline"
              />
            </div>
          </div>

          {/* Bảng hồ sơ giáo viên */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã / Họ và tên</th>
                    <th className="py-3 px-3">Môn chuyên trách</th>
                    <th className="py-3 px-3">Cấp học</th>
                    <th className="py-3 px-3">Khối lớp phụ trách</th>
                    <th className="py-3 px-3 text-center">Hình thức dạy</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                  {/* HÀNG BỘ LỌC THEO TỪNG TRƯỜNG DỮ LIỆU */}
                  <tr className="bg-slate-100/80 border-b border-slate-200 font-normal normal-case">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colSearchName}
                        onChange={e => setColSearchName(e.target.value)}
                        placeholder="Lọc tên / mã GV..."
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-2">
                      <select
                        value={colFilterSubject}
                        onChange={e => setColFilterSubject(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả môn</option>
                        <option value="SUB-MATH">Toán</option>
                        <option value="SUB-ENG">Tiếng Anh</option>
                      </select>
                    </th>
                    <th className="py-2 px-2">
                      <select
                        value={colFilterLevel}
                        onChange={e => setColFilterLevel(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả cấp</option>
                        <option value="CAP-TH">Tiểu học</option>
                        <option value="CAP-THCS">THCS</option>
                        <option value="CAP-THPT">THPT</option>
                      </select>
                    </th>
                    <th className="py-2 px-2">
                      <select
                        value={colFilterGrade}
                        onChange={e => setColFilterGrade(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả khối</option>
                        {['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </th>
                    <th className="py-2 px-2 text-center">
                      <select
                        value={colFilterModel}
                        onChange={e => setColFilterModel(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="1-1">1 - 1</option>
                        <option value="1-n">1 - n</option>
                      </select>
                    </th>
                    <th className="py-2 px-2 text-center">
                      <select
                        value={colFilterStatus}
                        onChange={e => setColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="DANG_DAY">Đang dạy</option>
                        <option value="CHO_LOP">Chờ lớp</option>
                        <option value="TAM_NGUNG">Tạm ngưng</option>
                      </select>
                    </th>
                    <th className="py-2 px-2 text-center">
                      {(colSearchName || colFilterSubject !== 'ALL' || colFilterLevel !== 'ALL' || colFilterGrade !== 'ALL' || colFilterModel !== 'ALL' || colFilterStatus !== 'ALL') ? (
                        <button
                          onClick={() => {
                            setColSearchName('');
                            setColFilterSubject('ALL');
                            setColFilterLevel('ALL');
                            setColFilterGrade('ALL');
                            setColFilterModel('ALL');
                            setColFilterStatus('ALL');
                          }}
                          className="text-[10px] text-orange-600 hover:text-orange-800 font-bold underline cursor-pointer"
                        >
                          Xóa lọc
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Bộ lọc</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeachers.map(t => {
                    const isMath = t.subject === 'SUB-MATH';
                    const badgeColor = isMath
                      ? 'bg-orange-50 text-[#FF5C00] border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200';
                    const tModels = t.models && t.models.length > 0 ? t.models : ['1-1', '1-n'];

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${
                                isMath ? 'bg-orange-100 text-[#FF5C00]' : 'bg-blue-100 text-blue-600'
                              } font-black flex items-center justify-center text-xs`}
                            >
                              {t.name.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{t.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badgeColor} border font-bold text-[11px]`}>
                            {t.subjectName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700 text-xs">{t.levelName}</td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{t.grades.join(', ')}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                            {tModels.includes('1-1') && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                                1 - 1
                              </span>
                            )}
                            {tModels.includes('1-n') && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                                1 - n
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <select
                            value={t.status}
                            onChange={e => handleQuickStatusChange(t.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer focus:outline-none transition-colors ${
                              t.status === 'DANG_DAY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.status === 'CHO_LOP'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                            title="Click để đổi nhanh trạng thái giáo viên"
                          >
                            <option value="DANG_DAY">● Đang dạy</option>
                            <option value="CHO_LOP">● Chờ lớp</option>
                            <option value="TAM_NGUNG">● Tạm ngưng</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedTeacherForDetail(t)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Xem lý lịch chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setScheduleModalTeacher(t)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                              title="Xem lịch rảnh & thời khóa biểu (giao diện đăng ký lịch dạy)"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin giáo viên"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTeacherToDelete(t)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Xóa giáo viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LỊCH RẢNH & THỜI KHÓA BIỂU ================= */}
      {activeTab === 'availability' && (
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                  DANH SÁCH THEO DÕI LỊCH RẢNH GIÁO VIÊN
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  Tuần hiện tại (Thứ 2 &rarr; Chủ Nhật)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dữ liệu khung giờ học được đồng bộ tự động từ danh mục ca chuẩn Time Slot. Vận hành tra cứu tình trạng rảnh hoặc kín lịch để ghép lớp.
              </p>
            </div>

            <button
              onClick={() => setIsSelfRegisterModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#FF5C00]" />
              <span>Giáo viên tự đăng ký lịch rảnh</span>
            </button>
          </div>

          {/* Bộ lọc */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={availSubject}
                onChange={e => setAvailSubject(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
              >
                <option value="ALL">Môn học: Tất cả</option>
                <option value="SUB-MATH">Môn Toán</option>
                <option value="SUB-ENG">Môn Tiếng Anh</option>
              </select>

              <select
                value={availStatus}
                onChange={e => setAvailStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
              >
                <option value="ALL">Tình trạng: Tất cả</option>
                <option value="FREE">Vẫn còn ca rảnh</option>
                <option value="FULL">Đã kín lịch dạy</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Bấm vào nút <strong className="text-slate-700">Xem lịch chi tiết</strong> để mở popup ma trận thời khóa biểu theo ca
            </div>
          </div>

          {/* Bảng danh sách */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Giáo viên</th>
                    <th className="py-3 px-4">Môn chuyên trách</th>
                    <th className="py-3 px-4">Cấp học</th>
                    <th className="py-3 px-4">Khối lớp</th>
                    <th className="py-3 px-4 text-center">Số ca đăng ký rảnh</th>
                    <th className="py-3 px-4 text-center">Số ca đã xếp lớp</th>
                    <th className="py-3 px-4 text-center">Tình trạng tuần</th>
                    <th className="py-3 px-4 text-center">Thời khóa biểu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(evalDateFrom || evalDateTo) && !teachers.some(t => sessionsInRange(t, evalDateFrom, evalDateTo).length) && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có ca dạy thành công trong khoảng thời gian đã chọn.</td></tr>}
                  {teachers
                    .filter(t => (availSubject === 'ALL' || t.subject === availSubject) && (availStatus === 'ALL' || (availStatus === 'FULL' ? t.isFull : !t.isFull)))
                    .map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {t.name}
                          <div className="text-[11px] text-slate-400 font-normal font-mono">{t.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${t.subject === 'SUB-MATH' ? 'text-[#FF5C00]' : 'text-blue-600'}`}>
                            {t.subjectName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700 text-xs">{t.levelName}</td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">{t.grades.join(', ')}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">{t.freeSlots} ca</td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-blue-700">{t.busySlots} ca</td>
                        <td className="py-3 px-4 text-center">
                          {t.isFull ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                              Đã kín lịch
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                              Còn {t.freeSlots} ca rảnh
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTeacherForSchedule(t)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#FF5C00] hover:text-white text-slate-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Xem lịch chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ĐÁNH GIÁ DỰ GIỜ ================= */}
      {activeTab === 'evaluation' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 p-4 rounded-xl border border-orange-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5C00] text-white flex items-center justify-center text-lg flex-shrink-0 font-bold shadow-md shadow-orange-500/20">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  QUY TRÌNH ĐÁNH GIÁ DỰ GIỜ SƯ PHẠM (CHUẨN HÓA 3 BƯỚC)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  <strong>Bước 1:</strong> Lọc danh sách giáo viên &bull;{' '}
                  <strong>Bước 2:</strong> Chọn xem ca dạy và nghe lại video bản ghi recording &bull;{' '}
                  <strong>Bước 3:</strong> Chấm điểm và gửi phiếu chấm cho tài khoản giáo viên.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-white border border-orange-200 text-[#FF5C00] font-bold text-xs shadow-xs">
              Thang 10 Trọng số: (TC1*1 + TC2*2 + TC3*1)/4
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
            <label className="text-xs font-semibold text-slate-700">Từ ngày (ca dạy)
              <input aria-label="Từ ngày ca dạy" type="date" value={evalDateFrom} onChange={e => setEvalDateFrom(e.target.value)} className="block mt-1 border border-slate-200 rounded-lg px-3 py-2" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Đến ngày (ca dạy)
              <input aria-label="Đến ngày ca dạy" type="date" min={evalDateFrom || undefined} value={evalDateTo} onChange={e => setEvalDateTo(e.target.value)} className="block mt-1 border border-slate-200 rounded-lg px-3 py-2" />
            </label>
            <button onClick={() => { setEvalDateFrom(''); setEvalDateTo(''); }} className="text-xs text-orange-600 py-2">Xóa lọc thời gian</button>
            {evalDateFrom && evalDateTo && evalDateFrom > evalDateTo && <span role="alert" className="text-xs text-rose-600">Ngày kết thúc phải từ ngày bắt đầu trở đi.</span>}
          </div>

          {/* Bảng danh sách giáo viên chuyên môn */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Giáo viên</th>
                    <th className="py-3 px-4">Môn chuyên trách</th>
                    <th className="py-3 px-4">Cấp &amp; Khối lớp</th>
                    <th className="py-3 px-4 text-center">Số ca hoàn thành</th>
                    <th className="py-3 px-4 text-center">Trạng thái dự giờ</th>
                    <th className="py-3 px-4 text-center">Điểm dự giờ</th>
                    <th className="py-3 px-4 text-center">Tác vụ</th>
                  </tr>
                  {/* HÀNG BỘ LỌC THEO TỪNG TRƯỜNG DỮ LIỆU BẢNG DỰ GIỜ */}
                  <tr className="bg-slate-100/80 border-b border-slate-200 font-normal normal-case">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={evalColSearchName}
                        onChange={e => setEvalColSearchName(e.target.value)}
                        placeholder="Lọc tên / mã GV..."
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-2">
                      <select
                        value={evalColFilterSubject}
                        onChange={e => setEvalColFilterSubject(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả môn</option>
                        <option value="SUB-MATH">Toán</option>
                        <option value="SUB-ENG">Tiếng Anh</option>
                      </select>
                    </th>
                    <th className="py-2 px-2">
                      <select
                        value={evalColFilterLevel}
                        onChange={e => setEvalColFilterLevel(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả cấp</option>
                        <option value="CAP-TH">Tiểu học</option>
                        <option value="CAP-THCS">THCS</option>
                        <option value="CAP-THPT">THPT</option>
                      </select>
                    </th>
                    <th className="py-2 px-2 text-center">
                      <span className="text-[10px] text-slate-400">Số ca</span>
                    </th>
                    <th className="py-2 px-2 text-center">
                      <select
                        value={evalColFilterStatus}
                        onChange={e => setEvalColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="UNSCORED">Chưa chấm</option>
                        <option value="SCORED">Đã chấm</option>
                      </select>
                    </th>
                    <th className="py-2 px-2 text-center">
                      <span className="text-[10px] text-slate-400">Điểm</span>
                    </th>
                    <th className="py-2 px-2 text-center">
                      {(evalColSearchName || evalColFilterSubject !== 'ALL' || evalColFilterLevel !== 'ALL' || evalColFilterStatus !== 'ALL') ? (
                        <button
                          onClick={() => {
                            setEvalColSearchName('');
                            setEvalColFilterSubject('ALL');
                            setEvalColFilterLevel('ALL');
                            setEvalColFilterStatus('ALL');
                          }}
                          className="text-[10px] text-orange-600 hover:text-orange-800 font-bold underline cursor-pointer"
                        >
                          Xóa lọc
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Bộ lọc</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {teachers
                    .filter(t => {
                      const matchBaseFilter = (evalSubject === 'ALL' || t.subject === evalSubject);
                      if (!matchBaseFilter) return false;
                      if (evalColSearchName && !(t.name.toLowerCase().includes(evalColSearchName.toLowerCase()) || t.id.toLowerCase().includes(evalColSearchName.toLowerCase()))) return false;
                      if (evalColFilterSubject !== 'ALL' && t.subject !== evalColFilterSubject) return false;
                      if (evalColFilterLevel !== 'ALL' && t.levelId !== evalColFilterLevel) return false;
                      if (evalColFilterStatus !== 'ALL' && t.evalStatus !== evalColFilterStatus) return false;
                      return (!evalDateFrom && !evalDateTo) || sessionsInRange(t, evalDateFrom, evalDateTo).length > 0;
                    })
                    .map(t => {
                      const isScored = t.evalStatus === 'SCORED';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{t.name}</div>
                            <div className="text-[11px] text-slate-400">{t.id} &bull; {t.degree}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${t.subject === 'SUB-MATH' ? 'bg-orange-50 text-[#FF5C00]' : 'bg-blue-50 text-blue-700'}`}>
                              {t.subjectName}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-700 text-xs">{t.levelName}</span>
                            <div className="text-slate-500 text-[11px]">{t.grades.join(', ')}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700 font-mono">
                            {sessionsInRange(t, evalDateFrom, evalDateTo).length} ca hợp lệ
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isScored ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đã chấm điểm
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px] inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Chưa chấm điểm
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isScored ? (
                              <span className="font-black font-mono text-emerald-600 text-sm">
                                {t.evalScore} / 10
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-- / 10</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => { setGradingTeacher(t); setIsSelectSessionModalOpen(true); }}
                              className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" /> Chọn ca dự giờ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM HỒ SƠ GIÁO VIÊN ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Thêm mới Hồ sơ Giáo viên</h3>
                <p className="text-xs text-slate-400">Thông tin liên kết trực tiếp với bảng tài khoản NGUOI_DUNG và danh mục MON_HOC</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên Giáo viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Thu Hằng"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newTeacherEmail}
                    onChange={e => setNewTeacherEmail(e.target.value)}
                    placeholder="thuhang@vuihoc.vn"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newTeacherPhone}
                    onChange={e => setNewTeacherPhone(e.target.value)}
                    placeholder="0912.xxx.xxx"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              {/* Môn chuyên trách cố định */}
              <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200">
                <label className="block font-bold text-[#FF5C00] mb-1.5">
                  Môn chuyên trách cố định (1 giáo viên chỉ dạy 1 môn - Ràng buộc CSDL) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700 hover:border-[#FF5C00]">
                    <input
                      type="radio"
                      name="m3_subject"
                      value="SUB-MATH"
                      checked={newTeacherSubject === 'SUB-MATH'}
                      onChange={() => setNewTeacherSubject('SUB-MATH')}
                      className="accent-[#FF5C00] w-4 h-4"
                    />
                    <span>Môn Toán (SUB-MATH)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700 hover:border-[#FF5C00]">
                    <input
                      type="radio"
                      name="m3_subject"
                      value="SUB-ENG"
                      checked={newTeacherSubject === 'SUB-ENG'}
                      onChange={() => setNewTeacherSubject('SUB-ENG')}
                      className="accent-[#FF5C00] w-4 h-4"
                    />
                    <span>Môn Tiếng Anh (SUB-ENG)</span>
                  </label>
                </div>
              </div>

              {/* Cấp học & Khối lớp */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Cấp học phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newTeacherLevel}
                    onChange={e => {
                      setNewTeacherLevel(e.target.value);
                      setNewTeacherGrades(['Lớp 1', 'Lớp 2']);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="CAP-TH">Tiểu học (Cấp 1: Lớp 1 &rarr; Lớp 5)</option>
                    <option value="CAP-THCS">Trung học cơ sở (Cấp 2: Lớp 6 &rarr; Lớp 9)</option>
                    <option value="CAP-THPT">Trung học phổ thông (Cấp 3: Lớp 10 &rarr; Lớp 12)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-800">
                    Các khối lớp có thể tiếp nhận giảng dạy <span className="text-rose-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllGrades(true)}
                    className="text-xs font-bold text-[#FF5C00] hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {(gradeOptionsByLevel[newTeacherLevel] || []).map(g => (
                    <label
                      key={g}
                      className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-[#FF5C00] text-center"
                    >
                      <input
                        type="checkbox"
                        checked={newTeacherGrades.includes(g)}
                        onChange={() => handleGradeToggle(g)}
                        className="accent-[#FF5C00] w-4 h-4 mb-1"
                      />
                      <span className="font-semibold text-slate-700 text-xs">{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mô hình nhận lớp (1-1 và 1-n) */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                <label className="block font-bold text-indigo-900 mb-1">
                  Mô hình nhận lớp (Có thể tick chọn cả 2) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700 hover:border-indigo-600">
                    <input
                      type="checkbox"
                      checked={newTeacherModels.includes('1-1')}
                      onChange={() => {
                        setNewTeacherModels(prev =>
                          prev.includes('1-1') ? prev.filter(m => m !== '1-1') : [...prev, '1-1']
                        );
                      }}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Lớp 1 - 1 (1 Kèm 1 cá nhân)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700 hover:border-indigo-600">
                    <input
                      type="checkbox"
                      checked={newTeacherModels.includes('1-n')}
                      onChange={() => {
                        setNewTeacherModels(prev =>
                          prev.includes('1-n') ? prev.filter(m => m !== '1-n') : [...prev, '1-n']
                        );
                      }}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Lớp 1 - n (Nhóm 1-3, 1-5, 1-10)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trình độ học vấn &amp; Bằng cấp</label>
                <input
                  type="text"
                  value={newTeacherDegree}
                  onChange={e => setNewTeacherDegree(e.target.value)}
                  placeholder="Đại học Sư phạm Hà Nội..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu hồ sơ Giáo viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHI TIẾT HỒ SƠ GIÁO VIÊN ================= */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF5C00] text-white font-black flex items-center justify-center text-sm">
                  {selectedTeacherForDetail.name.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{selectedTeacherForDetail.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedTeacherForDetail.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTeacherForDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">Môn chuyên trách</span>
                  <strong className="text-[#FF5C00] font-bold text-xs">{selectedTeacherForDetail.subjectName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Cấp học</span>
                  <strong className="text-slate-800 font-semibold text-xs">{selectedTeacherForDetail.levelName}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Khối lớp phụ trách</span>
                  <strong className="text-slate-800 font-semibold text-xs">{selectedTeacherForDetail.grades.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Điện thoại</span>
                  <strong className="text-slate-800 font-semibold text-xs">{selectedTeacherForDetail.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email liên hệ</span>
                  <strong className="text-slate-800 font-semibold text-xs">{selectedTeacherForDetail.email}</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1">
                <span className="text-blue-800 font-bold block text-[11px]">Trình độ &amp; Bằng cấp sư phạm:</span>
                <p className="text-slate-600 text-xs">{selectedTeacherForDetail.degree}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: THỜI KHÓA BIỂU MA TRẬN CA ================= */}
      {selectedTeacherForSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Thời khóa biểu Lịch rảnh: {selectedTeacherForSchedule.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Môn: <strong className="text-[#FF5C00]">{selectedTeacherForSchedule.subjectName}</strong> &bull;{' '}
                  Cấp: <strong className="text-slate-700">{selectedTeacherForSchedule.levelName}</strong> &bull;{' '}
                  Khối: {selectedTeacherForSchedule.grades.join(', ')}
                </p>
              </div>
              <button onClick={() => setSelectedTeacherForSchedule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-left w-44">Khung giờ chuẩn (Time Slot)</th>
                      <th className="p-2.5">Thứ 2</th>
                      <th className="p-2.5">Thứ 3</th>
                      <th className="p-2.5">Thứ 4</th>
                      <th className="p-2.5">Thứ 5</th>
                      <th className="p-2.5">Thứ 6</th>
                      <th className="p-2.5 bg-amber-50">Thứ 7</th>
                      <th className="p-2.5 bg-amber-50">Chủ Nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {timeSlots.map(slot => {
                      const days = selectedTeacherForSchedule.schedule[slot.code] || [
                        'free',
                        'busy',
                        'none',
                        'free',
                        'busy',
                        'none',
                        'none'
                      ];

                      return (
                        <tr key={slot.id}>
                          <td className="p-2.5 text-left font-semibold text-slate-700 border-r border-slate-200 bg-slate-50/60">
                            {slot.name}
                          </td>
                          {days.map((st, idx) => (
                            <td key={idx} className="p-2">
                              {st === 'free' ? (
                                <div className="py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                  Ca rảnh
                                </div>
                              ) : st === 'busy' ? (
                                <div className="py-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200 text-[11px]">
                                  Có lớp
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold">--</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Ca rảnh nhận lớp
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Đã xếp lớp
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Không đăng ký
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTeacherForSchedule(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỌN CA DỰ GIỜ & RECORDING (BƯỚC 2) ================= */}
      {isSelectSessionModalOpen && gradingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-800">Chọn Ca Dự Giờ Chuyên Môn</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Chỉ ca dạy thành công</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giáo viên: <strong className="text-[#FF5C00]">{gradingTeacher.name}</strong> &bull; Môn: {gradingTeacher.subjectName}
                </p>
              </div>
              <button onClick={() => setIsSelectSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex flex-wrap gap-3 items-center bg-slate-50 rounded-xl p-3">
                <label>Từ ngày <input type="date" value={evalDateFrom} onChange={e => setEvalDateFrom(e.target.value)} className="border rounded-lg p-2 ml-2" /></label>
                <label>Đến ngày <input type="date" value={evalDateTo} min={evalDateFrom || undefined} onChange={e => setEvalDateTo(e.target.value)} className="border rounded-lg p-2 ml-2" /></label>
                <span>{sessionsInRange(gradingTeacher, evalDateFrom, evalDateTo).length} ca thành công</span>
              </div>
              <div className="space-y-2.5">
                {sessionsInRange(gradingTeacher, evalDateFrom, evalDateTo).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    Chưa có ca dạy thành công nào của giáo viên trong kỳ này.
                  </div>
                ) : (
                  sessionsInRange(gradingTeacher, evalDateFrom, evalDateTo).map((ss, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-[#FF5C00] bg-white hover:bg-orange-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs">{ss.name}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {ss.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Đạt chuẩn
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>{ss.date}</span>
                          <span>{ss.slot}</span>
                          <span>Sĩ số: {ss.students}</span>
                          <span className="text-emerald-700 font-medium">{ss.checkin}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <a
                            href={ss.recordLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-blue-600" /> Xem lại video bài giảng
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={() => startGradingSession(ss)}
                        className="px-3.5 py-1.5 bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer self-start md:self-auto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{gradingTeacher.evaluationReports?.some(r => r.sessionCode === ss.code && r.sessionDate === sessionDateISO(ss)) ? 'Xem / sửa phiếu chấm' : 'Chấm ca này'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsSelectSessionModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 2 CỘT CHI TIẾT CA DẠY (TRÁI) & PHIẾU CHẤM DỰ GIỜ (PHẢI) ================= */}
      {isGradingModalOpen && selectedSessionForGrading && gradingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header chung của Modal */}
            <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF5C00] font-black flex items-center justify-center text-sm">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base">
                      Dự Giờ Sư Phạm &amp; Đánh Giá Ca Dạy
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 text-[#FF5C00] border border-orange-200 text-xs font-bold font-mono">
                      {selectedSessionForGrading.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ca hoàn thành đạt chuẩn
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giáo viên đứng lớp: <strong className="text-slate-800 font-semibold">{gradingTeacher.name}</strong> ({gradingTeacher.id}) &bull; Môn: <strong className="text-slate-800 font-semibold">{gradingTeacher.subjectName}</strong> &bull; Học vị: <span className="text-slate-600">{gradingTeacher.degree}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Nếu giáo viên có nhiều ca thành công, cho phép đổi ca trực tiếp */}
                {gradingTeacher.successfulSessions && gradingTeacher.successfulSessions.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium">Đổi ca:</span>
                    <select
                      value={selectedSessionForGrading.code}
                      onChange={e => {
                        const target = gradingTeacher.successfulSessions.find(s => s.code === e.target.value);
                        if (target) setSelectedSessionForGrading(target);
                      }}
                      className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      {gradingTeacher.successfulSessions.map(s => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name.slice(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsGradingModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nội dung 2 CỘT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* ================= CỘT TRÁI (7/12 CỘT): CHI TIẾT CA DẠY CỦA GIA SƯ ================= */}
              <div className="lg:col-span-7 p-5 space-y-4 overflow-y-auto bg-slate-50/60">
                {/* Thanh tiêu đề nhỏ cột trái */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-[#FF5C00]" />
                    <span>Chi tiết Ca Dạy &amp; Phòng Học của Gia Sư</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedSessionForGrading.roomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 flex items-center gap-1 transition-colors"
                      title="Mở phòng học Zoom/ClassIn trực tiếp"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Vào phòng học</span>
                    </a>
                    <a
                      href={selectedSessionForGrading.recordLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF5C00] text-[11px] font-bold border border-orange-200 flex items-center gap-1 transition-colors"
                      title="Mở link video gốc"
                    >
                      <PlayCircle className="w-3 h-3" />
                      <span>Video gốc</span>
                    </a>
                  </div>
                </div>

                <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
                  <Video className="w-8 h-8 text-orange-400" />
                  <h4 className="font-bold">Bản ghi của ca đã chọn</h4>
                  <p className="text-xs text-slate-300">{selectedSessionForGrading.name} · {selectedSessionForGrading.date}</p>
                  {selectedSessionForGrading.recordLink ? <a href={selectedSessionForGrading.recordLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-900 rounded-lg px-4 py-2 text-xs font-bold"><ExternalLink className="w-4 h-4" />Mở bản ghi bài giảng</a> : <p className="text-xs">Ca này chưa có bản ghi.</p>}
                </div>

                {/* Thẻ Thông tin Ca học chi tiết */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Thông tin Buổi học &amp; Điểm danh Gia sư</span>
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Thời gian ca dạy</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedSessionForGrading.date}</span>
                      <span className="text-[10px] text-indigo-600 font-semibold">{selectedSessionForGrading.slot}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Mô hình &amp; Khối lớp</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedSessionForGrading.gradeLevel || gradingTeacher.grades[0]}</span>
                      <span className="text-[10px] text-orange-600 font-semibold">Mô hình: {selectedSessionForGrading.model || '1 - n'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Sĩ số ca học</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedSessionForGrading.students}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">100% chuyên cần</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Check-in Gia sư</span>
                      <span className="font-bold text-emerald-700 text-xs mt-0.5 block">{selectedSessionForGrading.checkin}</span>
                      <span className="text-[10px] text-slate-400">Đúng giờ quy định</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">Sĩ số ghi nhận: {selectedSessionForGrading.students}</p>
                </div>
              </div>

              {/* ================= CỘT PHẢI (5/12 CỘT): PHIẾU CHẤM ĐÁNH GIÁ DỰ GIỜ SƯ PHẠM ================= */}
              <div className="lg:col-span-5 p-5 bg-white overflow-y-auto space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Pencil className="w-4 h-4 text-[#FF5C00]" />
                      <span>Phiếu Đánh Giá Dự Giờ Sư Phạm</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      Thang 10 Chuẩn
                    </span>
                  </div>

                  <div className="p-3 mb-3 bg-orange-50 rounded-xl text-xs">
                    <span className="font-semibold">Tài khoản nhận: </span>
                    {resolveTeacherAccount(gradingTeacher, users)?.username || 'Chưa có tài khoản giáo viên liên kết'}
                    <p className="mt-1 text-slate-500">Phiếu chấm sẽ xuất hiện trong mục Đánh giá dự giờ của giáo viên.</p>
                  </div>
                  <form onSubmit={handleSubmitGrading} id="gradingForm" className="space-y-3.5 text-xs">
                    {/* Tiêu chí 1: Hệ số 1 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">1. Kiến thức chuyên môn &amp; Chuẩn bị giáo án</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Hệ số 1</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">Đúng trọng tâm bài học, chuẩn xác kiến thức sư phạm.</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={tc1Score}
                          onChange={e => setTc1Score(Number(e.target.value))}
                          className="w-full accent-[#FF5C00]"
                        />
                        <span className="font-mono font-bold text-sm text-[#FF5C00] w-10 text-right">{tc1Score.toFixed(1)}</span>
                      </div>
                      {/* Nút chọn nhanh điểm */}
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 mr-1">Chọn nhanh:</span>
                        {[7.0, 8.0, 8.5, 9.0, 9.5, 10.0].map(pt => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setTc1Score(pt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                              tc1Score === pt ? 'bg-[#FF5C00] text-white shadow-2xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tiêu chí 2: Hệ số 2 */}
                    <div className="p-3 bg-orange-50/70 rounded-xl border-2 border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#FF5C00]">2. Phương pháp tương tác &amp; Thu hút học sinh</span>
                        <span className="px-2 py-0.5 rounded bg-orange-200 text-orange-800 font-bold text-[10px]">Hệ số 2 (Trọng yếu)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-2">Gợi mở, tích cực gọi học sinh phát biểu, sử dụng công cụ tương tác.</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={tc2Score}
                          onChange={e => setTc2Score(Number(e.target.value))}
                          className="w-full accent-[#FF5C00]"
                        />
                        <span className="font-mono font-bold text-sm text-[#FF5C00] w-10 text-right">{tc2Score.toFixed(1)}</span>
                      </div>
                      {/* Nút chọn nhanh điểm */}
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-orange-200/60">
                        <span className="text-[10px] text-slate-500 mr-1">Chọn nhanh:</span>
                        {[7.0, 8.0, 8.5, 9.0, 9.5, 10.0].map(pt => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setTc2Score(pt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                              tc2Score === pt ? 'bg-[#FF5C00] text-white shadow-2xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tiêu chí 3: Hệ số 1 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">3. Quản lý thời gian, Kỷ luật ca dạy &amp; Tác phong</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Hệ số 1</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">Check-in đúng giờ, camera sáng rõ, âm thanh rõ ràng, trang phục lịch sự.</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={tc3Score}
                          onChange={e => setTc3Score(Number(e.target.value))}
                          className="w-full accent-[#FF5C00]"
                        />
                        <span className="font-mono font-bold text-sm text-[#FF5C00] w-10 text-right">{tc3Score.toFixed(1)}</span>
                      </div>
                      {/* Nút chọn nhanh điểm */}
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 mr-1">Chọn nhanh:</span>
                        {[7.0, 8.0, 8.5, 9.0, 9.5, 10.0].map(pt => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setTc3Score(pt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                              tc3Score === pt ? 'bg-[#FF5C00] text-white shadow-2xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hộp Điểm tổng kết & Phân loại sư phạm */}
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>ĐIỂM TRUNG BÌNH CÓ TRỌNG SỐ</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Công thức: (TC1*1 + TC2*2 + TC3*1) / 4
                          </div>
                        </div>
                        <div className="text-2xl font-black font-mono text-[#FF5C00]">
                          {finalWeightedScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
                        </div>
                      </div>

                      {/* Xếp loại sư phạm */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">Xếp loại đánh giá:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            Number(finalWeightedScore) >= 9.0
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : Number(finalWeightedScore) >= 8.0
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : Number(finalWeightedScore) >= 7.0
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {Number(finalWeightedScore) >= 9.0
                            ? '★ Hạng A: Xuất sắc'
                            : Number(finalWeightedScore) >= 8.0
                            ? '● Hạng B: Đạt chuẩn tốt'
                            : Number(finalWeightedScore) >= 7.0
                            ? '▲ Hạng C: Đạt yêu cầu'
                            : '✕ Hạng D: Cần bồi dưỡng'}
                        </span>
                      </div>
                    </div>

                    {/* Nhận xét chuyên môn */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">
                          Nhận xét chi tiết của Ban Chuyên môn <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={gradingComment}
                        onChange={e => setGradingComment(e.target.value)}
                        placeholder="Ghi nhận điểm mạnh và những điểm cần cải thiện trong phương pháp dạy..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#FF5C00] text-xs bg-slate-50 focus:bg-white"
                      />

                      {/* Gợi ý nhận xét mẫu */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Gợi ý nhanh:</span>
                        {[
                          'Phương pháp sư phạm chuẩn mực, phát âm rõ ràng, bài giảng đúng trọng tâm.',
                          'Tương tác rất tích cực, khéo léo gợi mở và khen ngợi học sinh đúng lúc.',
                          'Bao quát lớp tốt, kiểm soát đúng thời lượng, tác phong sư phạm chuẩn mực.',
                          'Cần tăng tương tác với học sinh trầm tính và bao quát thời gian bài tập.'
                        ].map((sugg, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setGradingComment(sugg)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 hover:text-[#FF5C00] text-slate-600 transition-colors border border-slate-200/80 cursor-pointer text-left"
                          >
                            + {sugg.slice(0, 28)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsGradingModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer text-xs"
                  >
                    Hủy
                  </button>
                  <button type="button" onClick={() => { setIsGradingModalOpen(false); setIsSelectSessionModalOpen(true); }} className="px-3 py-2 text-xs font-semibold text-slate-600 border rounded-xl">Chọn ca khác</button>
                  <button
                    type="submit"
                    form="gradingForm"
                    className="px-5 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi phiếu chấm cho giáo viên</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Giáo viên tự đăng ký lịch rảnh */}
      {isSelfRegisterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Giáo viên Đăng ký Lịch rảnh Tuần</h3>
              <button onClick={() => setIsSelfRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Tích chọn các ca bạn sẵn sàng nhận lớp trong tuần tới. Hệ thống điều phối PH5 sẽ tự động quét ca rảnh để ghép lớp!
              </p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                {timeSlots.map(slot => (
                  <label key={slot.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input type="checkbox" defaultChecked className="accent-[#FF5C00] w-4 h-4" />
                    <span>{slot.name} ({slot.timeRange})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSelfRegisterModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setIsSelfRegisterModalOpen(false);
                  showToast('Đã lưu đăng ký lịch rảnh tuần thành công!', 'success');
                }}
                className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
              >
                Lưu lịch rảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LỊCH DẠY & CA RẢNH GIÁO VIÊN ================= */}
      {scheduleModalTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 px-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF5C00] font-bold flex items-center justify-center text-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">
                    Lịch Dạy &amp; Khung Giờ Rảnh: {scheduleModalTeacher.name} ({scheduleModalTeacher.id})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Môn {scheduleModalTeacher.subjectName} • {scheduleModalTeacher.levelName} • Vận hành tra cứu và cấu hình ca rảnh để ghép lớp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalTeacher(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <TeacherAvailabilityView initialTeacherId={scheduleModalTeacher.id} />
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA THÔNG TIN GIÁO VIÊN ================= */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">
                    Chỉnh sửa Giáo viên / Gia sư
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mã: <span className="font-mono font-bold text-slate-600">{editingTeacher.id}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTeacherSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTeacherName}
                    onChange={e => setEditTeacherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái hoạt động <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editTeacherStatus}
                    onChange={e => setEditTeacherStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="DANG_DAY">● Đang dạy</option>
                    <option value="CHO_LOP">● Chờ lớp</option>
                    <option value="TAM_NGUNG">● Tạm ngưng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={editTeacherPhone}
                    onChange={e => setEditTeacherPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editTeacherEmail}
                    onChange={e => setEditTeacherEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Môn chuyên trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editTeacherSubject}
                    onChange={e => setEditTeacherSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="SUB-MATH">Môn Toán</option>
                    <option value="SUB-ENG">Môn Tiếng Anh</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cấp học phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editTeacherLevel}
                    onChange={e => {
                      setEditTeacherLevel(e.target.value);
                      const defaults = gradeOptionsByLevel[e.target.value] || [];
                      setEditTeacherGrades(defaults.slice(0, 2));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="CAP-TH">Tiểu học (Cấp 1)</option>
                    <option value="CAP-THCS">Trung học cơ sở (Cấp 2)</option>
                    <option value="CAP-THPT">Trung học phổ thông (Cấp 3)</option>
                  </select>
                </div>
              </div>

              {/* Khối lớp */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Khối lớp phụ trách:</span>
                  <button
                    type="button"
                    onClick={() => setEditTeacherGrades(gradeOptionsByLevel[editTeacherLevel] || [])}
                    className="text-[11px] font-bold text-[#FF5C00] hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(gradeOptionsByLevel[editTeacherLevel] || []).map(g => (
                    <label
                      key={g}
                      className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer text-center"
                    >
                      <input
                        type="checkbox"
                        checked={editTeacherGrades.includes(g)}
                        onChange={() => handleEditGradeToggle(g)}
                        className="accent-[#FF5C00] w-4 h-4"
                      />
                      <span className="font-semibold text-slate-700 text-xs">{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hình thức giảng dạy (1-1 hoặc 1-n, có thể tick cả 2) */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                <label className="block font-bold text-indigo-900">
                  Hình thức giảng dạy nhận lớp (Có thể tick cả 2) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editTeacherModels.includes('1-1')}
                      onChange={() => {
                        setEditTeacherModels(prev =>
                          prev.includes('1-1') ? prev.filter(m => m !== '1-1') : [...prev, '1-1']
                        );
                      }}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Lớp 1 - 1 (Kèm 1-1)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editTeacherModels.includes('1-n')}
                      onChange={() => {
                        setEditTeacherModels(prev =>
                          prev.includes('1-n') ? prev.filter(m => m !== '1-n') : [...prev, '1-n']
                        );
                      }}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>Lớp 1 - n (Nhóm 1-5, 1-10)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bằng cấp &amp; Trình độ</label>
                <input
                  type="text"
                  value={editTeacherDegree}
                  onChange={e => setEditTeacherDegree(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Cập nhật thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XÁC NHẬN XÓA GIÁO VIÊN ================= */}
      {teacherToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800">
                Xác nhận xóa Giáo viên / Gia sư?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bạn có chắc chắn muốn xóa giáo viên <strong className="text-slate-800">{teacherToDelete.name}</strong> ({teacherToDelete.id}) khỏi danh sách vận hành?
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              ⚠️ Lưu ý: Hành động này sẽ gỡ hồ sơ giáo viên khỏi hệ thống phân công và lịch rảnh.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacherConfirm}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer text-xs shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LỊCH RẢNH & THỜI KHÓA BIỂU CỦA GIÁO VIÊN ================= */}
      {scheduleModalTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF5C00] font-black flex items-center justify-center text-sm">
                  {scheduleModalTeacher.name.split(' ').slice(-1)[0].substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">
                      Lịch rảnh &amp; Thời khóa biểu: {scheduleModalTeacher.name}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {scheduleModalTeacher.id}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {scheduleModalTeacher.status === 'DANG_DAY'
                        ? '● Đang dạy'
                        : scheduleModalTeacher.status === 'CHO_LOP'
                        ? '● Chờ lớp'
                        : '● Tạm ngưng'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Môn: <strong className="text-slate-700">{scheduleModalTeacher.subjectName}</strong> • Cấp:{' '}
                    <strong className="text-slate-700">{scheduleModalTeacher.levelName}</strong> • Khối:{' '}
                    <strong className="text-slate-700">{scheduleModalTeacher.grades.join(', ')}</strong> • Hình thức:{' '}
                    <strong className="text-slate-700">
                      {(scheduleModalTeacher.models || ['1-1', '1-n']).join(', ')}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalTeacher(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <TeacherAvailabilityView initialTeacherId={scheduleModalTeacher.id} />
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc nâng cao trượt từ phải sang cho Giáo viên */}
      <FilterDrawer
        isOpen={isTeacherFilterOpen}
        onClose={() => setIsTeacherFilterOpen(false)}
        title="Bộ lọc nâng cao Giáo viên"
        subtitle="Lọc theo môn chuyên trách, cấp học, khối và trạng thái"
        activeCount={[
          filterSubject !== 'ALL' ? 1 : 0,
          filterLevel !== 'ALL' ? 1 : 0,
          filterGrade !== 'ALL' ? 1 : 0,
          filterStatus !== 'ALL' ? 1 : 0,
          catFilterCategory !== 'ALL' ? 1 : 0,
          catFilterSubOptions.length > 0 ? 1 : 0
        ].reduce((a, b) => a + b, 0)}
        onReset={() => {
          setFilterSubject('ALL');
          setFilterLevel('ALL');
          setFilterGrade('ALL');
          setFilterStatus('ALL');
          setCatFilterCategory('ALL');
          setCatFilterSubOptions([]);
          setSearchKeyword('');
        }}
      >
        <div className="space-y-4 text-xs">
          {/* Lọc theo Danh mục & Cấp độ đa chọn */}
          <CategoryMultiFilter
            selectedCategory={catFilterCategory}
            onSelectCategory={catId => {
              setCatFilterCategory(catId);
              if (catId === 'ALL') setCatFilterSubOptions([]);
            }}
            selectedSubOptions={catFilterSubOptions}
            onToggleSubOption={optId => {
              setCatFilterSubOptions(prev =>
                prev.includes(optId) ? prev.filter(o => o !== optId) : [...prev, optId]
              );
            }}
            onSelectAllSubOptions={allIds => {
              setCatFilterSubOptions(prev => Array.from(new Set([...prev, ...allIds])));
            }}
            onClearSubOptions={() => setCatFilterSubOptions([])}
            mode="drawer"
          />

          <div>
            <label className="block font-bold text-slate-700 mb-1">Môn chuyên trách</label>
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả môn học</option>
              <option value="SUB-MATH">Môn Toán</option>
              <option value="SUB-ENG">Môn Tiếng Anh</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cấp học</label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả cấp học</option>
              <option value="CAP-TH">Tiểu học</option>
              <option value="CAP-THCS">THCS</option>
              <option value="CAP-THPT">THPT</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Khối lớp</label>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả khối lớp</option>
              <option value="Lớp 1">Lớp 1</option>
              <option value="Lớp 2">Lớp 2</option>
              <option value="Lớp 3">Lớp 3</option>
              <option value="Lớp 4">Lớp 4</option>
              <option value="Lớp 5">Lớp 5</option>
              <option value="Lớp 6">Lớp 6</option>
              <option value="Lớp 7">Lớp 7</option>
              <option value="Lớp 8">Lớp 8</option>
              <option value="Lớp 9">Lớp 9</option>
              <option value="Lớp 10">Lớp 10</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 12">Lớp 12</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hình thức nhận lớp</label>
            <select
              value={colFilterModel}
              onChange={e => setColFilterModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="1-1">Lớp 1 - 1 (Kèm 1-1)</option>
              <option value="1-n">Lớp 1 - n (Nhóm 1-5, 1-10)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Trạng thái giáo viên</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DANG_DAY">Đang dạy</option>
              <option value="CHO_LOP">Chờ lớp</option>
              <option value="TAM_NGUNG">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </FilterDrawer>
    </div>
  );
};
