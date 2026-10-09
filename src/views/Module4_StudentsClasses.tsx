import { StudentSchedulePicker } from '../components/StudentSchedulePicker';
import { ClassSuggestions } from '../components/ClassSuggestions';
import { ColumnFilter } from '../components/ColumnFilter';
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from '../components/FilterDrawer';
import { StudentRecord, ClassItem } from '../types';
import {
  Users,
  Presentation,
  BookOpen,
  UserPlus,
  PlusCircle,
  FolderKanban,
  FileSpreadsheet,
  Download,
  Pencil,
  Trash2,
  Video,
  X,
  CheckCircle,
  PhoneCall,
  Phone,
  Eye,
  Clock,
  ArrowRight,
  Search,
  Calendar,
  Check,
  Sparkles,
  Zap,
  AlertTriangle,
  Filter
} from 'lucide-react';

export const Module4_StudentsClasses: React.FC = () => {
  const {
    students,
    classes,
    teachers,
    timeSlots,
    subjects, levels, models, teachingCategories,
    addStudent,
    updateStudent,
    deleteStudent,
    addClass,
    updateClass,
    deleteClass,
    batchAssignMaterials,
    batchImportRoomLinks,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'materials'>('students');
  const [isStudentFilterOpen, setIsStudentFilterOpen] = useState(false);
  const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'student' | 'class'; id: string; name: string } | null>(null);

  const activeSubjects = subjects.filter(item => item.status);
  const activeLevels = levels.filter(item => item.status);
  const activeModels = models.filter(item => item.status);
  const gradeOptions = Array.from(new Map(teachingCategories.filter(item => item.status !== false).flatMap(item => item.options).map(option => [option.id, option])).values());
  const subjectName = (code: string) => subjects.find(item => item.code === code)?.name || code;
  const levelName = (code: string) => levels.find(item => item.code === code)?.name || code;
  const gradeName = (id: string) => teachingCategories.flatMap(item => item.options).find(item => item.id === id)?.label || id;
  const assignedClass = (student?: StudentRecord | null) => student ? classes.find(item => item.code === student.currentClassCode && item.studentIds.includes(student.id)) || classes.find(item => item.studentIds.includes(student.id)) || classes.find(item => item.code === student.currentClassCode) : undefined;
  const statusColor = (status: StudentRecord['status']) => status === 'Đang học' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === 'Chờ xếp lớp' ? 'bg-amber-50 text-amber-700 border-amber-200' : status === 'Bảo lưu' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200';
  const studentClassInfo = (student?: StudentRecord | null, compact = false) => {
    const item = assignedClass(student);
    if (!item) return <span className="text-slate-400">Chưa xếp lớp</span>;
    return <div className={compact ? 'space-y-1' : 'rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2'}>
      {!compact && <h4 className="font-semibold text-[#FF5C00]">Thông tin lớp học</h4>}
      <div><span className="block font-mono text-[10px] font-semibold text-[#FF5C00]">{item.code}</span><span className="font-semibold text-slate-800">{item.name}</span></div>
      <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-[#FF5C00]">{item.model}</span>
      {!compact && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600"><p>Giáo viên: <strong>{item.teacherName || 'Chưa phân công'}</strong></p><p>Sĩ số: <strong>{item.studentIds.length}/{item.maxStudents}</strong></p><p className="sm:col-span-2">Lịch học: <strong>{item.schedule || 'Chưa có lịch'}</strong></p></div>}
    </div>;
  };
  const [stdCodeFilter, setStdCodeFilter] = useState('');
  const [stdNameFilter, setStdNameFilter] = useState('');
  const [stdClassFilter, setStdClassFilter] = useState('');
  const [stdSlotFilter, setStdSlotFilter] = useState('');
  const [stdModelFilter, setStdModelFilter] = useState('');
  // Student Filter state
  const [stdSearch, setStdSearch] = useState('');
  const [stdGradeFilter, setStdGradeFilter] = useState('');
  const [stdSubjectFilter, setStdSubjectFilter] = useState('');
  const [stdLevelFilter, setStdLevelFilter] = useState('');
  const [stdStatusFilter, setStdStatusFilter] = useState('');

  // Class Filter state
  const [clsSearch, setClsSearch] = useState('');
  const [clsGradeFilter, setClsGradeFilter] = useState('');
  const [clsSubjectFilter, setClsSubjectFilter] = useState('');
  const [clsModelFilter, setClsModelFilter] = useState('');

  const studentColumn = (label: string, value: string, setValue: (value: string) => void, options?: { value: string; label: string }[]) => <ColumnFilter label={label} active={Boolean(value && value !== 'ALL')} onReset={() => setValue('')}>
    {options ? <select aria-label={'Lọc ' + label} value={value} onChange={e => setValue(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2"><option value="">Tất cả</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input aria-label={'Lọc ' + label} value={value} onChange={e => setValue(e.target.value)} placeholder={'Tìm ' + label.toLowerCase()} className="w-full border border-slate-200 rounded-lg p-2" />}
  </ColumnFilter>;

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = stdSearch === '' || 
        s.name.toLowerCase().includes(stdSearch.toLowerCase()) || 
        s.id.toLowerCase().includes(stdSearch.toLowerCase()) || 
        (s.fatherPhone && s.fatherPhone.includes(stdSearch)) ||
        (s.motherPhone && s.motherPhone.includes(stdSearch));
      const matchGrade = !stdGradeFilter || stdGradeFilter === 'ALL' || s.grade === stdGradeFilter;
      const matchSubject = !stdSubjectFilter || stdSubjectFilter === 'ALL' || s.subject === stdSubjectFilter;
      const matchLevel = !stdLevelFilter || stdLevelFilter === 'ALL' || s.level === stdLevelFilter;
      const matchStatus = !stdStatusFilter || stdStatusFilter === 'ALL' || s.status === stdStatusFilter;
      return matchSearch && matchGrade && matchSubject && matchLevel && matchStatus &&
        s.id.toLowerCase().includes(stdCodeFilter.trim().toLowerCase()) && s.name.toLowerCase().includes(stdNameFilter.trim().toLowerCase()) &&
        (!stdClassFilter || (stdClassFilter === 'UNASSIGNED' ? !assignedClass(s) : assignedClass(s)?.code === stdClassFilter)) &&
        (!stdSlotFilter || s.scheduleSlots.some(slot => slot.includes('(' + stdSlotFilter + ')'))) && (!stdModelFilter || s.model === stdModelFilter);
    });
  }, [students, classes, stdSearch, stdGradeFilter, stdSubjectFilter, stdLevelFilter, stdStatusFilter, stdCodeFilter, stdNameFilter, stdClassFilter, stdSlotFilter, stdModelFilter]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchSearch = clsSearch === '' ||
        c.code.toLowerCase().includes(clsSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(clsSearch.toLowerCase()) ||
        c.teacherName.toLowerCase().includes(clsSearch.toLowerCase());
      const matchGrade = !clsGradeFilter || clsGradeFilter === 'ALL' || c.grade === clsGradeFilter;
      const matchSubject = !clsSubjectFilter || clsSubjectFilter === 'ALL' || c.subject === clsSubjectFilter;
      const matchModel = !clsModelFilter || clsModelFilter === 'ALL' || c.model === clsModelFilter;
      return matchSearch && matchGrade && matchSubject && matchModel;
    });
  }, [classes, clsSearch, clsGradeFilter, clsSubjectFilter, clsModelFilter]);

  // Student Modal state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [viewingDetailStudent, setViewingDetailStudent] = useState<StudentRecord | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [stdName, setStdName] = useState('');
  const [stdGrade, setStdGrade] = useState('Lớp 3');
  const [stdSubject, setStdSubject] = useState('SUB-MATH');
  const [stdFatherName, setStdFatherName] = useState('');
  const [stdFatherPhone, setStdFatherPhone] = useState('');
  const [stdMotherName, setStdMotherName] = useState('');
  const [stdMotherPhone, setStdMotherPhone] = useState('');
  const [stdModel, setStdModel] = useState('1-3');
  const [stdLevel, setStdLevel] = useState('LVL-F2');
  const [stdStatus, setStdStatus] = useState<StudentRecord['status']>('Chờ xếp lớp');
  const [stdSlots, setStdSlots] = useState<string[]>(['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)']);

  const activeTimeSlots = timeSlots.filter(slot => slot.status);

  const handleToggleSingleSlot = (day: string, range: string) => {
    const key = day + ' (' + range + ')';
    setStdSlots(prev => prev.includes(key) ? prev.filter(slot => slot !== key) : [...prev, key]);
  };
  const handleRemoveSlotChip = (key: string) => setStdSlots(prev => prev.filter(slot => slot !== key));
  const handleClearAllSlots = () => setStdSlots([]);

  // Class Modal state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [clsCode, setClsCode] = useState('');
  const [clsName, setClsName] = useState('');
  const [clsGrade, setClsGrade] = useState('Lớp 3');
  const [clsSubject, setClsSubject] = useState('SUB-MATH');
  const [clsLevel, setClsLevel] = useState('LVL-STD');
  const [clsModel, setClsModel] = useState('1-3');
  const [clsRoomLink, setClsRoomLink] = useState('');
  const [clsSchedule, setClsSchedule] = useState('T3 (18:00 - 19:30), T5 (18:00 - 19:30)');
  const [clsTeacher, setClsTeacher] = useState('');
  const [clsSelectedStudentIds, setClsSelectedStudentIds] = useState<string[]>([]);

  // Lọc chỉ những GIÁO VIÊN HỢP LỆ cho lớp học theo: Môn học, Khối lớp, Trạng thái và Trùng lịch
  const eligibleTeachersForClass = useMemo(() => {
    return teachers.filter(t => {
      // 1. Phải dạy đúng môn học của lớp
      if (t.subject !== clsSubject) return false;

      // 2. Phải phụ trách đúng khối lớp của lớp học
      if (!t.grades || !t.grades.includes(clsGrade)) return false;

      // 3. Trạng thái giảng dạy phải sẵn sàng (không tạm ngưng)
      if (t.status === 'TAM_NGUNG') return false;

      // 3.5. Kiểm tra mô hình lớp (1-1 hoặc 1-n)
      const targetModelGroup = clsModel === '1-1' ? '1-1' : '1-n';
      if (t.models && t.models.length > 0 && !t.models.includes(targetModelGroup)) {
        return false;
      }

      // 4. Kiểm tra xung đột lịch với các lớp khác mà giáo viên này đang dạy
      if (clsSchedule) {
        const classSlots = clsSchedule.split(',').map(s => s.trim().toLowerCase());
        const otherClasses = classes.filter(
          c => c.id !== editingClassId &&
               (c.teacherId === t.id || c.teacherName === t.name || c.teacherName.includes(t.name.replace('Thầy ', '').replace('Cô ', '')))
        );

        const hasScheduleConflict = otherClasses.some(oc => {
          if (!oc.schedule) return false;
          const ocSlots = oc.schedule.split(',').map(s => s.trim().toLowerCase());
          return classSlots.some(cs => ocSlots.includes(cs));
        });

        if (hasScheduleConflict) return false;
      }

      return true;
    });
  }, [teachers, classes, clsSubject, clsGrade, clsSchedule, editingClassId]);

  // Tự động kiểm tra tính hợp lệ của giáo viên khi thay đổi môn, khối hoặc lịch học
  useEffect(() => {
    if (!isClassModalOpen) return;
    const isCurrentValid = eligibleTeachersForClass.some(t => t.name === clsTeacher);
    if (!isCurrentValid) {
      if (eligibleTeachersForClass.length > 0) {
        setClsTeacher(eligibleTeachersForClass[0].name);
      } else {
        setClsTeacher('');
      }
    }
  }, [eligibleTeachersForClass, isClassModalOpen]);

  // Material Batch Modal state
  const [isBatchMaterialModalOpen, setIsBatchMaterialModalOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState('10/2026');
  const [batchWeek, setBatchWeek] = useState('Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026');
  const [batchSubject, setBatchSubject] = useState('SUB-MATH');
  const [batchGrade, setBatchGrade] = useState('Lớp 3');
  const [batchB1Title, setBatchB1Title] = useState('Giải bài toán bằng 3 bước tính (tiết 2)');
  const [batchB1Slide, setBatchB1Slide] = useState('https://drive.google.com/file/d/slide-b1');
  const [batchB1Lms, setBatchB1Lms] = useState('https://vuihoc.vn/lms/exercise/toan3_b1');
  const [batchB2Title, setBatchB2Title] = useState('Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt');
  const [batchB2Slide, setBatchB2Slide] = useState('https://drive.google.com/file/d/slide-b2');
  const [batchB2Lms, setBatchB2Lms] = useState('https://vuihoc.vn/lms/exercise/toan3_b2');
  const [batchSelectedClassIds, setBatchSelectedClassIds] = useState<string[]>([]);

  // Import Room Excel Modal state
  const [isImportRoomModalOpen, setIsImportRoomModalOpen] = useState(false);

  // Month week schedule options
  const monthWeeksMap: Record<string, string[]> = {
    '10/2026': [
      'Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026',
      'Tuần 2: Từ ngày 12/10/2026 đến ngày 18/10/2026',
      'Tuần 3: Từ ngày 19/10/2026 đến ngày 25/10/2026',
      'Tuần 4: Từ ngày 26/10/2026 đến ngày 01/11/2026'
    ],
    '11/2026': [
      'Tuần 1: Từ ngày 02/11/2026 đến ngày 08/11/2026',
      'Tuần 2: Từ ngày 09/11/2026 đến ngày 15/11/2026'
    ]
  };

  // Helper auto class code
  const generateClassCode = (subject: string, grade: string, level: string, model: string) => {
    const token = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]/gi, '').toUpperCase();
    const sub = token(subjects.find(item => item.code === subject)?.abbr || subject);
    const grd = /^Lớp (\d+)$/.exec(grade);
    const gradeCode = grd ? 'K' + grd[1].padStart(2, '0') : token(grade);
    const lvl = token(levels.find(item => item.code === level)?.abbr || level);
    const prefix = [sub, gradeCode, lvl, token(model)].join('_');
    const used = new Set(classes.map(item => item.code));
    let number = 1;
    while (used.has(prefix + '_' + String(number).padStart(2, '0'))) number++;
    return prefix + '_' + String(number).padStart(2, '0');
  };

  // Student CRUD
  const openCreateStudent = () => {
    setEditingStudentId(null);
    setStdName('');
    setStdGrade(gradeOptions[0]?.id || '');
    setStdSubject(activeSubjects[0]?.code || '');
    setStdFatherName('');
    setStdFatherPhone('');
    setStdMotherName('');
    setStdMotherPhone('');
    setStdModel(activeModels[0]?.code || '');
    setStdLevel(activeLevels[0]?.code || '');
    setStdStatus('Chờ xếp lớp');
    setStdSlots([]);
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (s: StudentRecord) => {
    setEditingStudentId(s.id);
    setStdName(s.name);
    setStdGrade(s.grade);
    setStdSubject(s.subject);
    setStdFatherName(s.fatherName ? s.fatherName.replace(' (Bố)', '') : '');
    setStdFatherPhone(s.fatherPhone || '');
    setStdMotherName(s.motherName ? s.motherName.replace(' (Mẹ)', '') : '');
    setStdMotherPhone(s.motherPhone || '');
    setStdModel(s.model);
    setStdLevel(s.level);
    setStdStatus(s.status);
    const existingSlots = s.scheduleSlots || [];
    setStdSlots(existingSlots);
    setIsStudentModalOpen(true);
  };

  const validateStudentForm = () => {
    const existing = students.find(item => item.id === editingStudentId);
    if (!stdName.trim() || (!stdFatherPhone.trim() && !stdMotherPhone.trim())) { showToast('Nhập họ tên học sinh và ít nhất một số điện thoại phụ huynh.', 'error'); return false; }
    const valid = (activeSubjects.some(item => item.code === stdSubject) || existing?.subject === stdSubject) &&
      (activeLevels.some(item => item.code === stdLevel) || existing?.level === stdLevel) &&
      (activeModels.some(item => item.code === stdModel) || existing?.model === stdModel) &&
      (gradeOptions.some(item => item.id === stdGrade) || existing?.grade === stdGrade);
    if (!valid) { showToast('Vui lòng chọn khối, môn, trình độ và mô hình hợp lệ từ danh mục.', 'error'); return false; }
    return true;
  };
  const nextStudentId = () => {
    const used = new Set(students.map(item => item.id));
    const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());
    let number = 1;
    while (used.has('HS-' + year + '-' + String(number).padStart(3, '0'))) number++;
    return 'HS-' + year + '-' + String(number).padStart(3, '0');
  };

  const handleSaveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStudentForm()) return;

    if (!stdFatherPhone.trim() && !stdMotherPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại của ít nhất Bố hoặc Mẹ để liên hệ!', 'error');
      return;
    }

    const fatherFormatted = stdFatherPhone.trim() ? (stdFatherName ? `${stdFatherName.trim()} (Bố)` : 'Bố') : '';
    const motherFormatted = stdMotherPhone.trim() ? (stdMotherName ? `${stdMotherName.trim()} (Mẹ)` : 'Mẹ') : '';

    if (editingStudentId) {
      updateStudent(editingStudentId, {
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        status: stdStatus,
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots
      });
    } else {
      const newStudent: StudentRecord = {
        id: nextStudentId(),
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots,
        status: stdStatus,
        currentClassCode: 'Chưa xếp lớp'
      };
      addStudent(newStudent);
    }
    setIsStudentModalOpen(false);
  };

  // Tìm danh sách lớp học phù hợp đang còn chỗ trống cho học sinh (Mô hình 1-n)
  const findMatchingClassesForStudent = (
    subject: string,
    grade: string,
    level: string,
    model: string
  ) => {
    return classes.filter(c => {
      const isSubMatch = c.subject === subject;
      const isGrdMatch = c.grade === grade;
      const isLvlMatch = c.level === level;
      const isMdlMatch = c.model === model;
      const hasAvailableSeat = c.studentIds.length < c.maxStudents;
      return isSubMatch && isGrdMatch && isLvlMatch && isMdlMatch && hasAvailableSeat;
    });
  };

  // Ghép ngay học sinh từ Form Modal vào lớp học có sẵn đang thiếu người
  const handleSaveAndAssignToClass = (targetClass: ClassItem) => {
    if (!validateStudentForm()) return;
    targetClass = classes.find(item => item.id === targetClass.id) || targetClass;
    if (editingStudentId && targetClass.studentIds.includes(editingStudentId)) { showToast('Học sinh đã có trong lớp này.', 'warning'); return; }
    if (targetClass.studentIds.length >= targetClass.maxStudents) { showToast('Lớp đã đủ sĩ số. Vui lòng chọn lớp khác.', 'error'); return; }
    if (!stdName.trim()) {
      showToast('Vui lòng nhập họ tên học sinh!', 'error');
      return;
    }
    if (!stdFatherPhone.trim() && !stdMotherPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại của ít nhất Bố hoặc Mẹ để liên hệ!', 'error');
      return;
    }

    const fatherFormatted = stdFatherPhone.trim() ? (stdFatherName ? `${stdFatherName.trim()} (Bố)` : 'Bố') : '';
    const motherFormatted = stdMotherPhone.trim() ? (stdMotherName ? `${stdMotherName.trim()} (Mẹ)` : 'Mẹ') : '';

    const studentIdToUse: string = editingStudentId || nextStudentId();
    const previousClass = assignedClass(students.find(item => item.id === editingStudentId));
    if (editingStudentId) {
      classes.filter(item => item.id !== targetClass.id && item.studentIds.includes(editingStudentId)).forEach(item => {
        updateClass(item.id, { studentIds: item.studentIds.filter(id => id !== editingStudentId) });
      });
      updateStudent(editingStudentId, {
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        status: 'Đang học',
        currentClassCode: targetClass.code,
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots
      });
    } else {
      const newStudent: StudentRecord = {
        id: studentIdToUse,
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots,
        status: 'Đang học',
        currentClassCode: targetClass.code
      };
      addStudent(newStudent);
    }

    // Cập nhật học sinh vào lớp học
    if (!targetClass.studentIds.includes(studentIdToUse)) {
      updateClass(targetClass.id, {
        studentIds: [...targetClass.studentIds, studentIdToUse]
      });
    }

    setIsStudentModalOpen(false);
    showToast(
      `${previousClass ? "Đã chuyển" : "Đã ghép"} học sinh ${stdName.trim()} ${previousClass ? "từ lớp " + previousClass.code + " " : ""}vào lớp ${targetClass.name} (${targetClass.code})! Sĩ số: ${targetClass.studentIds.length + 1}/${targetClass.maxStudents} HS`,
      'success'
    );
  };

  // Lưu hồ sơ và mở ngay luồng Tạo lớp mới (1-1 hoặc 1-n khi chưa có lớp ghép)
  const handleSaveAndCreateClass = () => {
    if (!validateStudentForm()) return;
    if (!stdName.trim()) {
      showToast('Vui lòng nhập họ tên học sinh!', 'error');
      return;
    }
    if (!stdFatherPhone.trim() && !stdMotherPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại của ít nhất Bố hoặc Mẹ để liên hệ!', 'error');
      return;
    }

    const fatherFormatted = stdFatherPhone.trim() ? (stdFatherName ? `${stdFatherName.trim()} (Bố)` : 'Bố') : '';
    const motherFormatted = stdMotherPhone.trim() ? (stdMotherName ? `${stdMotherName.trim()} (Mẹ)` : 'Mẹ') : '';

    let studentObj: StudentRecord;
    if (editingStudentId) {
      studentObj = {
        id: editingStudentId,
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        status: 'Chờ xếp lớp',
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots,
        currentClassCode: 'Chưa xếp lớp'
      };
      updateStudent(editingStudentId, studentObj);
    } else {
      studentObj = {
        id: nextStudentId(),
        name: stdName.trim(),
        grade: stdGrade,
        subject: stdSubject,
        model: stdModel,
        level: stdLevel,
        fatherName: fatherFormatted,
        fatherPhone: stdFatherPhone.trim(),
        motherName: motherFormatted,
        motherPhone: stdMotherPhone.trim(),
        scheduleSlots: stdSlots,
        status: 'Chờ xếp lớp',
        currentClassCode: 'Chưa xếp lớp'
      };
      addStudent(studentObj);
    }

    setIsStudentModalOpen(false);
    showToast(
      `Đã lưu hồ sơ học sinh ${stdName.trim()}. Đang mở form tạo lớp ${stdModel === '1-1' ? '1 Kèm 1' : stdModel} mới...`,
      'success'
    );

    setTimeout(() => {
      openCreateClass(studentObj);
    }, 150);
  };

  // Class CRUD
  const openCreateClass = (preStudent?: StudentRecord) => {
    setEditingClassId(null);
    const targetGrade = preStudent ? preStudent.grade : gradeOptions[0]?.id || '';
    const targetSub = preStudent ? preStudent.subject : activeSubjects[0]?.code || '';
    const targetLvl = preStudent ? preStudent.level : activeLevels[0]?.code || '';
    const targetMdl = preStudent ? preStudent.model : activeModels[0]?.code || '';

    setClsGrade(targetGrade);
    setClsSubject(targetSub);
    setClsLevel(targetLvl);
    setClsModel(targetMdl);
    setClsName(`${subjectName(targetSub)} ${gradeName(targetGrade)} (${targetMdl})`);
    setClsCode(generateClassCode(targetSub, targetGrade, targetLvl, targetMdl));
    setClsRoomLink('');
    setClsSchedule(preStudent ? preStudent.scheduleSlots.join(', ') : 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)');
    setClsSelectedStudentIds(preStudent ? [preStudent.id] : []);

    const initialEligible = teachers.find(
      t => t.subject === targetSub && t.grades && t.grades.includes(targetGrade) && t.status !== 'TAM_NGUNG'
    );
    setClsTeacher(initialEligible ? initialEligible.name : '');

    setIsClassModalOpen(true);
  };

  const openEditClass = (c: ClassItem) => {
    setEditingClassId(c.id);
    setClsCode(c.code);
    setClsName(c.name);
    setClsGrade(c.grade);
    setClsSubject(c.subject);
    setClsLevel(c.level);
    setClsModel(c.model);
    setClsRoomLink(c.roomLink);
    setClsSchedule(c.schedule);
    setClsTeacher(c.teacherName || '');
    setClsSelectedStudentIds(c.studentIds);
    setIsClassModalOpen(true);
  };

  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim()) return;

    // Bắt buộc phải có giáo viên HỢP LỆ
    if (!clsTeacher || !eligibleTeachersForClass.some(t => t.name === clsTeacher)) {
      showToast('Không thể lưu lớp học: Không tìm thấy giáo viên phù hợp hoặc chưa chọn giáo viên hợp lệ!', 'error');
      return;
    }

    const assignedTeacher = eligibleTeachersForClass.find(t => t.name === clsTeacher);

    const max = models.find(item => item.code === clsModel)?.maxStudents || classes.find(item => item.id === editingClassId)?.maxStudents;
    if (!max) { showToast('Chọn mô hình lớp hợp lệ từ danh mục.', 'error'); return; }

    if (clsSelectedStudentIds.length > max) {
      showToast(`Vượt trần sĩ số: Mô hình ${clsModel} chỉ cho phép tối đa ${max} học sinh!`, 'error');
      return;
    }

    if (editingClassId) {
      updateClass(editingClassId, {
        code: clsCode,
        name: clsName.trim(),
        grade: clsGrade,
        subject: clsSubject,
        level: clsLevel,
        model: clsModel,
        maxStudents: max,
        roomLink: clsRoomLink.trim(),
        schedule: clsSchedule.trim(),
        teacherName: clsTeacher,
        teacherId: assignedTeacher?.id,
        studentIds: clsSelectedStudentIds
      });
    } else {
      const newClass: ClassItem = {
        id: `CLS-${String(classes.length + 1).padStart(3, '0')}`,
        code: clsCode,
        name: clsName.trim(),
        grade: clsGrade,
        subject: clsSubject,
        level: clsLevel,
        model: clsModel,
        maxStudents: max,
        studentIds: clsSelectedStudentIds,
        schedule: clsSchedule.trim(),
        roomLink: clsRoomLink.trim(),
        teacherName: clsTeacher,
        teacherId: assignedTeacher?.id,
        materials: []
      };
      addClass(newClass);
    }

    setIsClassModalOpen(false);
  };

  // Batch materials
  const openBatchMaterials = () => {
    setBatchMonth('10/2026');
    setBatchWeek(monthWeeksMap['10/2026'][0]);
    setBatchSubject('SUB-MATH');
    setBatchGrade('Lớp 3');
    const matchedIds = classes
      .filter(c => c.subject === 'SUB-MATH' && c.grade === 'Lớp 3')
      .map(c => c.id);
    setBatchSelectedClassIds(matchedIds);
    setIsBatchMaterialModalOpen(true);
  };

  const handleExecuteBatchMaterials = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchSelectedClassIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 lớp học để phân phối học liệu!', 'error');
      return;
    }

    const newMaterials: ClassItem['materials'] = [
      {
        month: batchMonth,
        week: batchWeek,
        session: 1,
        title: batchB1Title.trim(),
        slide: batchB1Slide.trim(),
        lms: batchB1Lms.trim()
      },
      {
        month: batchMonth,
        week: batchWeek,
        session: 2,
        title: batchB2Title.trim(),
        slide: batchB2Slide.trim(),
        lms: batchB2Lms.trim()
      }
    ];

    batchAssignMaterials(batchSelectedClassIds, newMaterials);
    setIsBatchMaterialModalOpen(false);
  };

  // Download template for room links
  const downloadRoomLinkTemplate = () => {
    const missing = classes.filter(c => !c.roomLink || c.roomLink.trim() === '');
    if (missing.length === 0) {
      showToast('Tất cả các lớp hiện tại đều đã có link phòng học!', 'info');
      return;
    }

    let csv = '\uFEFF';
    csv += 'STT,Mã lớp,Tên lớp,Khối lớp,Môn học,Link Phòng Học (Điền link Zoom/ClassIn vào đây)\n';
    missing.forEach((c, idx) => {
      csv += `${idx + 1},"${c.code}","${c.name}","${c.grade}","${c.subject === 'SUB-MATH' ? 'Toán' : 'Tiếng Anh'}",""\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mau_Nhap_Link_Phong_${missing.length}_Lop_Thieu.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất file mẫu gồm ${missing.length} lớp chưa có link phòng!`, 'success');
  };

  const handleImportRoomExcelDemo = () => {
    const missing = classes.filter(c => !c.roomLink || c.roomLink.trim() === '');
    if (missing.length === 0) {
      showToast('Tất cả các lớp đều đã có link phòng học trước đó!', 'info');
      setIsImportRoomModalOpen(false);
      return;
    }

    const mockUpdates = missing.map(c => ({
      classCode: c.code,
      roomLink: `https://vuihoc.zoom.us/j/998${Math.floor(1000000 + Math.random() * 9000000)}`
    }));

    const result = batchImportRoomLinks(mockUpdates);
    setIsImportRoomModalOpen(false);
    showToast(`Đã gán thành công link phòng học cho ${result.updated} lớp thiếu link!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Phân hệ 4 Quản trị chuẩn Figma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">Học sinh &amp; Ghép lớp</h1>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-[#FF5C00] text-[10px] font-bold">
              Tiểu học: Lớp 1 - 5
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận hồ sơ, khởi tạo lớp gán link phòng Zoom/ClassIn, ghép lớp chặn trần sĩ số và phân phối học liệu động theo tuần.
          </p>
        </div>

        {/* 3 Tabs Phân hệ 4 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'students' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Hồ sơ Học sinh</span>
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'classes' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>Quản lý Lớp học</span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'materials' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Phân phối Học liệu</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: HỒ SƠ HỌC SINH ================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsStudentFilterOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Mở bộ lọc học sinh từ cột bên phải"
              >
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bộ lọc Học sinh</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  {filteredStudents.length} HS
                </span>
              </button>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={stdSearch}
                  onChange={e => setStdSearch(e.target.value)}
                  placeholder="Tìm nhanh tên bé, SĐT, mã HS..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>
            </div>

            <button
              onClick={openCreateStudent}
              className="w-full sm:w-auto px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tiếp Nhận Học Sinh Mới</span>
            </button>
          </div>

          {/* Bảng danh sách học sinh */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-left">{studentColumn('Mã học sinh', stdCodeFilter, setStdCodeFilter)}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Tên học sinh', stdNameFilter, setStdNameFilter)}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Khối', stdGradeFilter, setStdGradeFilter, gradeOptions.map(item => ({value:item.id,label:item.label})))}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Lớp', stdClassFilter, setStdClassFilter, [{value:'UNASSIGNED',label:'Chưa xếp lớp'}, ...classes.map(item => ({value:item.code,label:item.code + ' · ' + item.name}))])}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Môn', stdSubjectFilter, setStdSubjectFilter, subjects.map(item => ({value:item.code,label:item.name})))}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Trình độ', stdLevelFilter, setStdLevelFilter, levels.map(item => ({value:item.code,label:item.name})))}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Mô hình', stdModelFilter, setStdModelFilter, Array.from(new Set([...models.map(item => item.code), ...students.map(item => item.model)])).map(code => ({value:code,label:models.find(item => item.code === code)?.name || code})))}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Khung giờ học', stdSlotFilter, setStdSlotFilter, timeSlots.map(item => ({value:item.timeRange,label:item.name + ' · ' + item.timeRange})))}</th>
                    <th className="py-3 px-3 text-left">{studentColumn('Trạng thái', stdStatusFilter, setStdStatusFilter, ['Chờ xếp lớp','Đang học','Bảo lưu','Đã thôi học'].map(value => ({value,label:value})))}</th>
                    <th className="py-3 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-500">Không có học sinh phù hợp với bộ lọc.</td></tr>}
                  {filteredStudents.map(student => <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{student.id}</td>
                    <td className="px-3 py-3 font-semibold text-[#FF5C00] min-w-36">{student.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{gradeName(student.grade)}</td>
                    <td className="px-3 py-3 min-w-36">{studentClassInfo(student, true)}</td>
                    <td className="px-3 py-3">{subjectName(student.subject)}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{levelName(student.level)}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="rounded bg-orange-50 px-2 py-1 font-semibold text-[#FF5C00]">{student.model}</span></td>
                    <td className="px-3 py-3 min-w-44 text-[11px] text-slate-600">{student.scheduleSlots.length ? student.scheduleSlots.map(slot => <div key={slot}>{slot}</div>) : 'Chưa đăng ký'}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className={`px-2 py-1 rounded-full border text-[10px] font-semibold ${statusColor(student.status)}`}>{student.status}</span></td>
                    <td className="px-3 py-3"><div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => setViewingDetailStudent(student)} title="Chi tiết học sinh và phụ huynh" className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => openEditStudent(student)} title="Sửa thông tin và ghép lớp" className="p-1.5 rounded hover:bg-orange-50 text-[#FF5C00]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setPendingDelete({ type: 'student', id: student.id, name: student.name })} title="Xóa học sinh" className="p-1.5 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: QUẢN LÝ LỚP HỌC ================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsClassFilterOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Mở bộ lọc lớp học từ cột bên phải"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bộ lọc Lớp học</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200">
                  {filteredClasses.length} lớp
                </span>
              </button>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={clsSearch}
                  onChange={e => setClsSearch(e.target.value)}
                  placeholder="Tìm nhanh mã lớp, tên lớp, giáo viên..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>
            </div>

            <button
              onClick={() => openCreateClass()}
              className="w-full sm:w-auto px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Khởi Tạo Lớp Học Mới</span>
            </button>
          </div>

          {/* Bảng danh sách lớp */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-mono">Mã Lớp</th>
                    <th className="py-3.5 px-4">Tên Lớp học</th>
                    <th className="py-3.5 px-4">Khối &amp; Môn</th>
                    <th className="py-3.5 px-4">Mô hình &amp; Trình độ</th>
                    <th className="py-3.5 px-4">Lịch học</th>
                    <th className="py-3.5 px-4">Link Phòng học</th>
                    <th className="py-3.5 px-4">Sĩ số</th>
                    <th className="py-3.5 px-4">Giáo viên</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classes
                    .filter(c => {
                      const matchSearch =
                        c.code.toLowerCase().includes(clsSearch.toLowerCase()) ||
                        c.name.toLowerCase().includes(clsSearch.toLowerCase()) ||
                        c.teacherName.toLowerCase().includes(clsSearch.toLowerCase());
                      const matchGrd = !clsGradeFilter || c.grade === clsGradeFilter;
                      const matchSub = !clsSubjectFilter || c.subject === clsSubjectFilter;
                      const matchMdl = !clsModelFilter || c.model === clsModelFilter;
                      return matchSearch && matchGrd && matchSub && matchMdl;
                    })
                    .map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{c.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-xs">{c.grade}</span>
                          <div className="text-[11px] text-[#FF5C00] font-bold mt-0.5">
                            {subjectName(c.subject)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                            {levelName(c.level)}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">Mô hình {c.model}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-[11px] font-mono">{c.schedule}</td>
                        <td className="py-3 px-4">
                          {c.roomLink ? (
                            <a
                              href={c.roomLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-[11px] truncate max-w-[150px]"
                            >
                              <Video className="w-3.5 h-3.5" /> Vào phòng
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa có link</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-bold ${
                              c.studentIds.length >= c.maxStudents ? 'text-amber-600' : 'text-slate-700'
                            }`}
                          >
                            {c.studentIds.length} / {c.maxStudents} HS
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{c.teacherName || 'Chưa phân công'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditClass(c)}
                              className="text-slate-600 hover:text-[#FF5C00] p-1 rounded hover:bg-slate-100"
                              title="Sửa lớp"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPendingDelete({ type: 'class', id: c.id, name: c.name });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                              title="Xóa lớp"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PHÂN PHỐI HỌC LIỆU ================= */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-orange-100 text-[#FF5C00] font-bold text-xs uppercase tracking-wider">
                  NGHIỆP VỤ LÕI
                </span>
                <h2 className="text-base font-bold text-slate-800">Phân Phối Học Liệu Cho Các Lớp Học</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Phân bổ học liệu (Buổi 1 &amp; Buổi 2) theo Tháng &amp; Tuần thực tế. Hỗ trợ gán trước theo lịch, tự động cập nhật và ghi đè dữ liệu cũ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={openBatchMaterials}
                className="px-4 py-2.5 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <FolderKanban className="w-4 h-4 font-bold" />
                <span>Phân Phối Học Liệu Cho Các Lớp</span>
              </button>
              <button
                onClick={() => setIsImportRoomModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Nhập Link Phòng (Excel)</span>
              </button>
              <button
                onClick={downloadRoomLinkTemplate}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải Mẫu Excel</span>
              </button>
            </div>
          </div>

          {/* Bảng danh sách lớp kèm học liệu */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-mono">Mã Lớp</th>
                    <th className="py-3.5 px-4">Tên Lớp</th>
                    <th className="py-3.5 px-4">Khối &amp; Môn</th>
                    <th className="py-3.5 px-4">Link Phòng Học</th>
                    <th className="py-3.5 px-4">Trạng thái Học Liệu</th>
                    <th className="py-3.5 px-4">Chi tiết Buổi đã nạp</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {classes.map(c => {
                    const hasRoom = !!c.roomLink;
                    const hasMat = (c.materials || []).length > 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{c.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs">{c.grade}</span>
                          <div className="text-[11px] text-[#FF5C00] font-bold mt-0.5">
                            {subjectName(c.subject)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {hasRoom ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              <CheckCircle className="w-3.5 h-3.5" /> Đã có link phòng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">
                              Chưa có link
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {hasMat ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                              Đã nạp {c.materials.length} buổi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium text-[10px] border border-amber-200">
                              Chưa có học liệu
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {hasMat ? (
                            c.materials.map(m => `B${m.session} (${m.week.split(':')[0]})`).join(', ')
                          ) : (
                            <span className="text-slate-400 italic">Chưa nạp</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openEditClass(c)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" /> Sửa Lớp / Link
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

      {pendingDelete && <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setPendingDelete(null)} onKeyDown={event => { if (event.key === 'Escape') setPendingDelete(null); }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={event => event.stopPropagation()}>
          <h3 id="delete-confirm-title" className="text-base font-bold text-slate-800">Xác nhận xóa {pendingDelete.type === 'student' ? 'học sinh' : 'lớp học'}</h3>
          <p id="delete-confirm-description" className="mt-3 text-sm text-slate-600">Bạn có muốn xóa {pendingDelete.type === 'student' ? 'học sinh' : 'lớp học'} <strong>{pendingDelete.name}</strong> không?</p>
          <p className="mt-2 text-xs text-slate-500">{pendingDelete.type === 'student' ? 'Hồ sơ học sinh sẽ bị xóa và được gỡ khỏi lớp đang học.' : 'Lớp học sẽ bị xóa. Học sinh trong lớp được đưa về danh sách chờ xếp lớp.'}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" autoFocus onClick={() => setPendingDelete(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="button" onClick={() => { if (pendingDelete.type === 'student') deleteStudent(pendingDelete.id); else deleteClass(pendingDelete.id); setPendingDelete(null); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Xóa</button>
          </div>
        </div>
      </div>}
      {/* ================= MODAL: TIẾP NHẬN HỌC SINH MỚI ================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingStudentId ? 'Chỉnh Sửa Hồ Sơ Học Sinh' : 'Tiếp Nhận Hồ Sơ Học Sinh Mới'}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="mt-4 space-y-4 text-xs">
              <fieldset className="space-y-3"><legend className="font-semibold text-[#FF5C00] mb-2">Thông tin học tập</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-slate-600">Họ và tên học sinh *<input type="text" required value={stdName} onChange={e => setStdName(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg" /></label>
                  <label className="block text-slate-600">Khối<select required value={stdGrade} onChange={e => setStdGrade(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"><option value="">Chọn khối</option>{gradeOptions.map(item => ({value:item.id,label:item.label})).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}{stdGrade && !gradeOptions.map(item => ({value:item.id,label:item.label})).some(item => item.value === stdGrade) && <option value={stdGrade}>{stdGrade} (đã lưu)</option>}</select></label>
                  <label className="block text-slate-600">Môn học<select required value={stdSubject} onChange={e => setStdSubject(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"><option value="">Chọn môn học</option>{activeSubjects.map(item => ({value:item.code,label:item.name})).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}{stdSubject && !activeSubjects.map(item => ({value:item.code,label:item.name})).some(item => item.value === stdSubject) && <option value={stdSubject}>{stdSubject} (đã lưu)</option>}</select></label>
                  <label className="block text-slate-600">Trình độ<select required value={stdLevel} onChange={e => setStdLevel(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"><option value="">Chọn trình độ</option>{activeLevels.map(item => ({value:item.code,label:item.name})).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}{stdLevel && !activeLevels.map(item => ({value:item.code,label:item.name})).some(item => item.value === stdLevel) && <option value={stdLevel}>{stdLevel} (đã lưu)</option>}</select></label>
                  <label className="block text-slate-600">Mô hình lớp<select required value={stdModel} onChange={e => setStdModel(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"><option value="">Chọn mô hình lớp</option>{activeModels.map(item => ({value:item.code,label:item.name})).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}{stdModel && !activeModels.map(item => ({value:item.code,label:item.name})).some(item => item.value === stdModel) && <option value={stdModel}>{stdModel} (đã lưu)</option>}</select></label>
                  <label className="block text-slate-600">Trạng thái<select value={stdStatus} onChange={e => setStdStatus(e.target.value as StudentRecord['status'])} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg">{['Chờ xếp lớp','Đang học','Bảo lưu','Đã thôi học'].map(status => <option key={status}>{status}</option>)}</select></label>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-100 pt-3 space-y-2"><legend className="font-semibold text-slate-800">Liên hệ phụ huynh</legend>
                <p className="text-[11px] text-slate-500">Nhập ít nhất một số điện thoại bố hoặc mẹ.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="block text-slate-600">Họ tên bố<input type="text"  value={stdFatherName} onChange={e => setStdFatherName(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg" /></label><label className="block text-slate-600">Số điện thoại bố<input type="tel"  value={stdFatherPhone} onChange={e => setStdFatherPhone(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg" /></label><label className="block text-slate-600">Họ tên mẹ<input type="text"  value={stdMotherName} onChange={e => setStdMotherName(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg" /></label><label className="block text-slate-600">Số điện thoại mẹ<input type="tel"  value={stdMotherPhone} onChange={e => setStdMotherPhone(e.target.value)} className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg" /></label></div>
              </fieldset>
              <StudentSchedulePicker slots={activeTimeSlots} selected={stdSlots} onToggle={handleToggleSingleSlot} onRemove={handleRemoveSlotChip} onClear={handleClearAllSlots} />
              {editingStudentId && studentClassInfo(students.find(item => item.id === editingStudentId))}
              <ClassSuggestions model={stdModel} schedule={stdSlots} isChanging={Boolean(assignedClass(students.find(item => item.id === editingStudentId)))} items={findMatchingClassesForStudent(stdSubject, stdGrade, stdLevel, stdModel).filter(item => item.id !== assignedClass(students.find(student => student.id === editingStudentId))?.id && (!editingStudentId || !item.studentIds.includes(editingStudentId)))} onAssign={handleSaveAndAssignToClass} />
              {/* Nút hành động Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                  title="Lưu thông tin hồ sơ học sinh"
                >
                  Lưu hồ sơ
                </button>
                {(!editingStudentId || !assignedClass(students.find(item => item.id === editingStudentId))) && <button
                  type="button"
                  onClick={handleSaveAndCreateClass}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {stdModel === '1-1' ? (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Lưu &amp; Tạo lớp 1-1</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Lưu &amp; Tạo lớp {stdModel}</span>
                    </>
                  )}
                </button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHI TIẾT HỒ SƠ HỌC SINH & PHỤ HUYNH ================= */}
      {viewingDetailStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">
                    Chi Tiết Hồ Sơ Học Sinh
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Mã: {viewingDetailStudent.id} &bull; Lớp hiện tại: {assignedClass(viewingDetailStudent)?.code || 'Chưa xếp lớp'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Thông tin học sinh */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {viewingDetailStudent.name}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor(viewingDetailStudent.status)}`}>
                    {viewingDetailStudent.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400">Khối lớp:</span>{' '}
                    <strong className="text-slate-700">{gradeName(viewingDetailStudent.grade)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Môn học:</span>{' '}
                    <strong className="text-slate-700">
                      {subjectName(viewingDetailStudent.subject)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Trình độ:</span>{' '}
                    <strong className="text-slate-700">{levelName(viewingDetailStudent.level)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Mô hình đào tạo:</span>{' '}
                    <strong className="text-slate-700">{viewingDetailStudent.model}</strong>
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ Phụ huynh (Đầy đủ cả Bố & Mẹ) */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700">
                  <PhoneCall className="w-4 h-4 text-indigo-600" />
                  <span>Thông tin liên hệ Phụ huynh</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Bố */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                      <span>Bố</span>
                      {viewingDetailStudent.fatherPhone && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="font-bold text-slate-800 text-xs mt-1">
                      {viewingDetailStudent.fatherName || 'Chưa cập nhật tên'}
                    </div>
                    <div className="font-mono text-xs text-indigo-600 mt-1 font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{viewingDetailStudent.fatherPhone || 'Chưa có SĐT'}</span>
                    </div>
                  </div>

                  {/* Mẹ */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                      <span>Mẹ</span>
                      {viewingDetailStudent.motherPhone && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="font-bold text-slate-800 text-xs mt-1">
                      {viewingDetailStudent.motherName || 'Chưa cập nhật tên'}
                    </div>
                    <div className="font-mono text-xs text-indigo-600 mt-1 font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{viewingDetailStudent.motherPhone || 'Chưa có SĐT'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Khung ca học rảnh mong muốn */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khung ca học mong muốn của học sinh:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {viewingDetailStudent.scheduleSlots && viewingDetailStudent.scheduleSlots.length > 0 ? (
                    viewingDetailStudent.scheduleSlots.map(slot => (
                      <span
                        key={slot}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-medium"
                      >
                        {slot}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Chưa đăng ký ca rảnh</span>
                  )}
                </div>
              </div>

              {studentClassInfo(viewingDetailStudent)}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const st = viewingDetailStudent;
                    setViewingDetailStudent(null);
                    openEditStudent(st);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Sửa thông tin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDetailStudent(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: KHỞI TẠO LỚP HỌC MỚI ================= */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingClassId ? 'Hiệu chỉnh Lớp học' : 'Khởi Tạo Lớp Học Mới'}
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã lớp học (Tự sinh chuẩn Master Data)</label>
                  <input
                    type="text"
                    readOnly
                    value={clsCode}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono text-[#FF5C00] font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên lớp học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clsName}
                    onChange={e => setClsName(e.target.value)}
                    placeholder="Ví dụ: Toán Nền Tảng 2 - Lớp 3 (T3/T5)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={clsGrade}
                    onChange={e => {
                      setClsGrade(e.target.value);
                      setClsCode(generateClassCode(clsSubject, e.target.value, clsLevel, clsModel));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    {gradeOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={clsSubject}
                    onChange={e => {
                      setClsSubject(e.target.value);
                      setClsCode(generateClassCode(e.target.value, clsGrade, clsLevel, clsModel));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    {subjects.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mô hình lớp</label>
                  <select
                    value={clsModel}
                    onChange={e => {
                      setClsModel(e.target.value);
                      setClsCode(generateClassCode(clsSubject, clsGrade, clsLevel, e.target.value));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    {models.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Link phòng học */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                <span className="font-bold text-blue-700 text-xs flex items-center gap-1.5">
                  <Video className="w-4 h-4" /> Đường dẫn phòng học trực tuyến cố định (Zoom/ClassIn)
                </span>
                <input
                  type="url"
                  value={clsRoomLink}
                  onChange={e => setClsRoomLink(e.target.value)}
                  placeholder="https://vuihoc.zoom.us/j/988776655 (Có thể để trống để nạp Excel sau)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FF5C00] font-mono text-xs"
                />
              </div>

              {/* Chọn học sinh chờ xếp lớp */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Chọn học sinh trong danh sách "Chờ xếp lớp":</span>
                  <span className="text-[11px] text-slate-500">
                    Đã chọn: {clsSelectedStudentIds.length} / {clsModel === '1-1' ? 1 : clsModel === '1-3' ? 3 : 5} HS
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {students
                    .filter(s => (s.status === 'Chờ xếp lớp' || clsSelectedStudentIds.includes(s.id)) && s.grade === clsGrade && s.subject === clsSubject)
                    .map(s => (
                      <label key={s.id} className="p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={clsSelectedStudentIds.includes(s.id)}
                            onChange={e => {
                              const max = clsModel === '1-1' ? 1 : clsModel === '1-3' ? 3 : 5;
                              if (e.target.checked) {
                                if (clsSelectedStudentIds.length >= max) {
                                  showToast(`Mô hình ${clsModel} chỉ cho phép tối đa ${max} học sinh!`, 'error');
                                  return;
                                }
                                setClsSelectedStudentIds(prev => [...prev, s.id]);
                                if (s.scheduleSlots && s.scheduleSlots.length > 0) {
                                  setClsSchedule(s.scheduleSlots.join(', '));
                                }
                              } else {
                                setClsSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                            className="accent-[#FF5C00]"
                          />
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <span className="text-slate-400">({s.id})</span>
                        </div>
                        <span className="text-[11px] text-[#FF5C00] font-mono">{s.scheduleSlots?.join(', ')}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Lịch học & Giáo viên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời gian học của lớp</label>
                  <input
                    type="text"
                    required
                    value={clsSchedule}
                    onChange={e => setClsSchedule(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Giáo viên phụ trách</label>
                    {eligibleTeachersForClass.length > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Có {eligibleTeachersForClass.length} GV hợp lệ
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ✕ Không có GV phù hợp
                      </span>
                    )}
                  </div>

                  <select
                    value={clsTeacher}
                    onChange={e => setClsTeacher(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border font-medium text-xs focus:outline-none transition-all ${
                      eligibleTeachersForClass.length === 0
                        ? 'border-amber-300 bg-amber-50 text-amber-900 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-indigo-600'
                    }`}
                  >
                    {eligibleTeachersForClass.length === 0 ? (
                      <option value="" disabled>
                        -- Không tìm thấy giáo viên phù hợp --
                      </option>
                    ) : (
                      <>
                        <option value="" disabled>
                          -- Chọn giáo viên hợp lệ ({eligibleTeachersForClass.length}) --
                        </option>
                        {eligibleTeachersForClass.map(t => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.grades.join(', ')}) - Còn {t.freeSlots} ca rảnh
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {/* THÔNG BÁO RÕ RÀNG KHI KHÔNG TÌM THẤY GIÁO VIÊN PHÙ HỢP */}
                  {eligibleTeachersForClass.length === 0 && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Không tìm thấy giáo viên phù hợp</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Hệ thống đã rà soát và không có giáo viên nào thỏa mãn đồng thời:
                        <br />• Dạy môn: <strong>{clsSubject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh'}</strong>
                        <br />• Phụ trách khối: <strong>{clsGrade}</strong>
                        <br />• Trống lịch theo ca: <strong>{clsSchedule || 'Chưa thiết lập'}</strong>
                      </p>
                      <div className="pt-0.5 text-[10px] text-slate-500 italic">
                        Vui lòng điều chỉnh môn, khối lớp hoặc phân công thêm giáo viên ở mục Hồ sơ Giáo viên.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer"
                >
                  Lưu lớp học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PHÂN PHỐI HỌC LIỆU HÀNG LOẠT ================= */}
      {isBatchMaterialModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Phân Phối Học Liệu Cho Các Lớp Học</h3>
                <p className="text-xs text-slate-400">Chọn Tháng &amp; Tuần thực tế, nạp nội dung Buổi 1 &amp; 2</p>
              </div>
              <button onClick={() => setIsBatchMaterialModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBatchMaterials} className="mt-4 space-y-4 text-xs">
              <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">1. Chọn Tháng học</label>
                  <select
                    value={batchMonth}
                    onChange={e => {
                      setBatchMonth(e.target.value);
                      setBatchWeek(monthWeeksMap[e.target.value]?.[0] || '');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  >
                    <option value="10/2026">Tháng 10/2026 (Hiện tại)</option>
                    <option value="11/2026">Tháng 11/2026 (Gán trước lịch)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">2. Chọn Tuần học</label>
                  <select
                    value={batchWeek}
                    onChange={e => setBatchWeek(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                  >
                    {(monthWeeksMap[batchMonth] || []).map(w => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buổi 1 & 2 */}
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800">Buổi 1 trong tuần:</span>
                  <input
                    type="text"
                    required
                    value={batchB1Title}
                    onChange={e => setBatchB1Title(e.target.value)}
                    placeholder="Tên bài học buổi 1..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="url"
                      required
                      value={batchB1Slide}
                      onChange={e => setBatchB1Slide(e.target.value)}
                      placeholder="Link Slide Drive..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                    />
                    <input
                      type="url"
                      value={batchB1Lms}
                      onChange={e => setBatchB1Lms(e.target.value)}
                      placeholder="Link bài tập LMS..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800">Buổi 2 trong tuần:</span>
                  <input
                    type="text"
                    required
                    value={batchB2Title}
                    onChange={e => setBatchB2Title(e.target.value)}
                    placeholder="Tên bài học buổi 2..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="url"
                      required
                      value={batchB2Slide}
                      onChange={e => setBatchB2Slide(e.target.value)}
                      placeholder="Link Slide Drive..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                    />
                    <input
                      type="url"
                      value={batchB2Lms}
                      onChange={e => setBatchB2Lms(e.target.value)}
                      placeholder="Link bài tập LMS..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Chọn lớp áp dụng */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">
                    Chọn các lớp áp dụng ({batchSelectedClassIds.length} lớp):
                  </span>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedClassIds(classes.map(c => c.id))}
                    className="text-[#FF5C00] font-bold text-xs hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {classes.map(c => (
                    <label key={c.id} className="p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchSelectedClassIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) setBatchSelectedClassIds(prev => [...prev, c.id]);
                            else setBatchSelectedClassIds(prev => prev.filter(id => id !== c.id));
                          }}
                          className="accent-[#FF5C00]"
                        />
                        <span className="font-mono font-bold text-[#FF5C00]">{c.code}</span>
                        <span className="text-slate-800 font-medium">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{c.grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchMaterialModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer"
                >
                  Xác nhận phân phối học liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NHẬP LINK PHÒNG HÀNG LOẠT ================= */}
      {isImportRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Nhập Link Phòng Học (Excel/CSV)</h3>
                <p className="text-xs text-slate-400">Chỉ gán link vào những lớp hiện chưa có link phòng</p>
              </div>
              <button onClick={() => setIsImportRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900">Mẫu Excel Lớp Chưa Có Link</div>
                  <div className="text-[11px] text-emerald-700">
                    Hiện có {classes.filter(c => !c.roomLink).length} lớp đang thiếu link phòng
                  </div>
                </div>
                <button
                  onClick={downloadRoomLinkTemplate}
                  className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 font-bold hover:bg-emerald-100 text-[11px] cursor-pointer"
                >
                  Tải file mẫu
                </button>
              </div>

              <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-slate-700">Tải lên file Excel/CSV đã điền link phòng</p>
                <input type="file" accept=".csv, .xlsx" className="block w-full text-xs text-slate-500" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportRoomModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleImportRoomExcelDemo}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Bắt đầu nạp link phòng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. DRAWER BỘ LỌC HỌC SINH (TAB 1) */}
      <FilterDrawer
        isOpen={isStudentFilterOpen}
        onClose={() => setIsStudentFilterOpen(false)}
        title="Bộ lọc Hồ sơ Học sinh"
        subtitle="Lọc theo khối lớp, môn học, mô hình ghép và trạng thái học tập"
        activeCount={
          [stdCodeFilter, stdNameFilter, stdClassFilter, stdSlotFilter, stdModelFilter, stdLevelFilter].filter(Boolean).length +
          (stdGradeFilter ? 1 : 0) +
          (stdSubjectFilter ? 1 : 0) +
          (stdStatusFilter ? 1 : 0) +
          (stdSearch ? 1 : 0)
        }
        onReset={() => {
          setStdCodeFilter(''); setStdNameFilter(''); setStdClassFilter(''); setStdSlotFilter(''); setStdModelFilter(''); setStdLevelFilter('');
          setStdGradeFilter('');
          setStdSubjectFilter('');
          setStdStatusFilter('');
          setStdSearch('');
          showToast('Đã đặt lại bộ lọc học sinh!', 'info');
        }}
        onApply={() => showToast('Đã áp dụng bộ lọc học sinh!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Tìm kiếm từ khóa:</label>
            <input
              type="text"
              value={stdSearch}
              onChange={e => setStdSearch(e.target.value)}
              placeholder="Tìm tên bé, SĐT bố/mẹ, mã HS..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khối lớp:</label>
            <select
              value={stdGradeFilter}
              onChange={e => setStdGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Tất cả Khối lớp</option>
              {gradeOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Môn học:</label>
            <select
              value={stdSubjectFilter}
              onChange={e => setStdSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}
            </select>
          </div>

          <label className="block font-bold text-slate-700">Trình độ<select value={stdLevelFilter} onChange={e => setStdLevelFilter(e.target.value)} className="block w-full mt-1 p-2 border border-slate-200 rounded-xl"><option value="">Tất cả trình độ</option>{levels.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}</select></label>
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Trạng thái học tập:</label>
            <select
              value={stdStatusFilter}
              onChange={e => setStdStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xếp lớp">Chờ xếp lớp</option>
              <option value="Đang học">Đang học</option>
              <option value="Bảo lưu">Đang bảo lưu</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 2. DRAWER BỘ LỌC LỚP HỌC (TAB 2) */}
      <FilterDrawer
        isOpen={isClassFilterOpen}
        onClose={() => setIsClassFilterOpen(false)}
        title="Bộ lọc Quản lý Lớp học"
        subtitle="Lọc theo khối lớp, môn học, mô hình lớp và từ khóa"
        activeCount={
          (clsGradeFilter ? 1 : 0) +
          (clsSubjectFilter ? 1 : 0) +
          (clsModelFilter ? 1 : 0) +
          (clsSearch ? 1 : 0)
        }
        onReset={() => {
          setClsGradeFilter('');
          setClsSubjectFilter('');
          setClsModelFilter('');
          setClsSearch('');
          showToast('Đã đặt lại bộ lọc lớp học!', 'info');
        }}
        onApply={() => showToast('Đã áp dụng bộ lọc lớp học!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Tìm kiếm từ khóa:</label>
            <input
              type="text"
              value={clsSearch}
              onChange={e => setClsSearch(e.target.value)}
              placeholder="Tìm mã lớp, tên lớp, giáo viên..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khối lớp:</label>
            <select
              value={clsGradeFilter}
              onChange={e => setClsGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="">Tất cả Khối lớp</option>
              {gradeOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Môn học:</label>
            <select
              value={clsSubjectFilter}
              onChange={e => setClsSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Mô hình lớp:</label>
            <select
              value={clsModelFilter}
              onChange={e => setClsModelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="">Tất cả mô hình</option>
              {models.map(item => <option key={item.id} value={item.code}>{item.name}</option>)}
            </select>
          </div>
        </div>
      </FilterDrawer>
    
    </div>
  );
};
