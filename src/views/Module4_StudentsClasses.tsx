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

const WEEK_DAYS = [
  { key: 'T2', shortName: 'Thứ 2', fullName: 'Thứ Hai', eng: 'Mon' },
  { key: 'T3', shortName: 'Thứ 3', fullName: 'Thứ Ba', eng: 'Tue' },
  { key: 'T4', shortName: 'Thứ 4', fullName: 'Thứ Tư', eng: 'Wed' },
  { key: 'T5', shortName: 'Thứ 5', fullName: 'Thứ Năm', eng: 'Thu' },
  { key: 'T6', shortName: 'Thứ 6', fullName: 'Thứ Sáu', eng: 'Fri' },
  { key: 'T7', shortName: 'Thứ 7', fullName: 'Thứ Bảy', eng: 'Sat' },
  { key: 'CN', shortName: 'Chủ Nhật', fullName: 'Chủ Nhật', eng: 'Sun' }
];

export const Module4_StudentsClasses: React.FC = () => {
  const {
    students,
    classes,
    teachers,
    timeSlots,
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
      return matchSearch && matchGrade && matchSubject && matchLevel && matchStatus;
    });
  }, [students, stdSearch, stdGradeFilter, stdSubjectFilter, stdLevelFilter, stdStatusFilter]);

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
  const [selectedDaysInPicker, setSelectedDaysInPicker] = useState<string[]>(['T3', 'T5']);
  const [selectedTimeRangesInPicker, setSelectedTimeRangesInPicker] = useState<string[]>(['18:00 - 19:30']);

  // Đồng bộ Danh mục Ca học Master Data
  const activeTimeSlots = (timeSlots && timeSlots.length > 0)
    ? timeSlots.filter(s => s.status !== false)
    : [
        { id: 'SLOT-1', code: 'SLOT-E1', name: 'Ca Tối 1 (Giờ vàng)', timeRange: '18:00 - 19:30', durationMinutes: 90, status: true },
        { id: 'SLOT-2', code: 'SLOT-E2', name: 'Ca Tối 2', timeRange: '19:45 - 21:15', durationMinutes: 90, status: true },
        { id: 'SLOT-3', code: 'SLOT-A1', name: 'Ca Chiều', timeRange: '16:15 - 17:45', durationMinutes: 90, status: true }
      ];

  // Slot helper functions
  const isSlotSelected = (dayKey: string, timeRange: string) => {
    return stdSlots.includes(`${dayKey} (${timeRange})`);
  };

  const handleToggleDay = (dayKey: string) => {
    const isSelected = selectedDaysInPicker.includes(dayKey);
    const newDays = isSelected
      ? selectedDaysInPicker.filter(d => d !== dayKey)
      : [...selectedDaysInPicker, dayKey];
    setSelectedDaysInPicker(newDays);

    if (isSelected) {
      setStdSlots(prev => prev.filter(s => !s.startsWith(`${dayKey} `)));
    } else {
      const rangesToApply = selectedTimeRangesInPicker.length > 0
        ? selectedTimeRangesInPicker
        : (activeTimeSlots[0] ? [activeTimeSlots[0].timeRange] : ['18:00 - 19:30']);
      
      if (selectedTimeRangesInPicker.length === 0) {
        setSelectedTimeRangesInPicker(rangesToApply);
      }

      const newSlotsToAdd = rangesToApply
        .map(tr => `${dayKey} (${tr})`)
        .filter(slot => !stdSlots.includes(slot));
      setStdSlots(prev => [...prev, ...newSlotsToAdd]);
    }
  };

  const handleSelectDayPreset = (preset: '246' | '357' | 'weekend' | 'all' | 'none') => {
    let targetDays: string[] = [];
    if (preset === '246') targetDays = ['T2', 'T4', 'T6'];
    else if (preset === '357') targetDays = ['T3', 'T5', 'T7'];
    else if (preset === 'weekend') targetDays = ['T7', 'CN'];
    else if (preset === 'all') targetDays = WEEK_DAYS.map(d => d.key);
    else if (preset === 'none') targetDays = [];

    setSelectedDaysInPicker(targetDays);

    const rangesToApply = selectedTimeRangesInPicker.length > 0
      ? selectedTimeRangesInPicker
      : (activeTimeSlots[0] ? [activeTimeSlots[0].timeRange] : ['18:00 - 19:30']);
    
    if (targetDays.length > 0 && selectedTimeRangesInPicker.length === 0) {
      setSelectedTimeRangesInPicker(rangesToApply);
    }

    const newSlots: string[] = [];
    targetDays.forEach(day => {
      rangesToApply.forEach(tr => {
        newSlots.push(`${day} (${tr})`);
      });
    });
    setStdSlots(newSlots);
  };

  const handleToggleTimeSlot = (timeRange: string) => {
    const isSelected = selectedTimeRangesInPicker.includes(timeRange);
    const newRanges = isSelected
      ? selectedTimeRangesInPicker.filter(r => r !== timeRange)
      : [...selectedTimeRangesInPicker, timeRange];
    setSelectedTimeRangesInPicker(newRanges);

    if (isSelected) {
      setStdSlots(prev => prev.filter(s => !s.includes(`(${timeRange})`)));
    } else {
      const daysToApply = selectedDaysInPicker.length > 0 ? selectedDaysInPicker : ['T3', 'T5'];
      if (selectedDaysInPicker.length === 0) {
        setSelectedDaysInPicker(daysToApply);
      }
      const newSlotsToAdd = daysToApply
        .map(day => `${day} (${timeRange})`)
        .filter(slot => !stdSlots.includes(slot));
      setStdSlots(prev => [...prev, ...newSlotsToAdd]);
    }
  };

  const handleToggleSingleSlot = (dayKey: string, timeRange: string) => {
    const slotKey = `${dayKey} (${timeRange})`;
    if (stdSlots.includes(slotKey)) {
      setStdSlots(prev => prev.filter(s => s !== slotKey));
    } else {
      setStdSlots(prev => [...prev, slotKey]);
      if (!selectedDaysInPicker.includes(dayKey)) {
        setSelectedDaysInPicker(prev => [...prev, dayKey]);
      }
      if (!selectedTimeRangesInPicker.includes(timeRange)) {
        setSelectedTimeRangesInPicker(prev => [...prev, timeRange]);
      }
    }
  };

  const handleRemoveSlotChip = (slotToRemove: string) => {
    setStdSlots(prev => prev.filter(s => s !== slotToRemove));
  };

  const handleClearAllSlots = () => {
    setStdSlots([]);
    setSelectedDaysInPicker([]);
    setSelectedTimeRangesInPicker([]);
  };

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
  const generateClassCode = (subj: string, grd: string, lvl: string, mdl: string) => {
    const subAbbr = subj === 'SUB-MATH' ? 'TOAN' : 'ENG';
    const gradeMap: Record<string, string> = { 'Lớp 1': 'K01', 'Lớp 2': 'K02', 'Lớp 3': 'K03', 'Lớp 4': 'K04', 'Lớp 5': 'K05' };
    const levelMap: Record<string, string> = { 'LVL-F1': 'NT1', 'LVL-F2': 'NT2', 'LVL-STD': 'TC', 'LVL-ADV': 'NC' };
    const modelMap: Record<string, string> = { '1-1': '11', '1-3': '13', '1-5': '15' };

    const count = classes.filter(c => c.subject === subj && c.grade === grd).length + 1;
    const seq = String(count).padStart(2, '0');
    return `${subAbbr}_${gradeMap[grd] || 'K03'}_${levelMap[lvl] || 'TC'}_${modelMap[mdl] || '13'}_${seq}`;
  };

  // Student CRUD
  const openCreateStudent = () => {
    setEditingStudentId(null);
    setStdName('');
    setStdGrade('Lớp 3');
    setStdSubject('SUB-MATH');
    setStdFatherName('');
    setStdFatherPhone('');
    setStdMotherName('');
    setStdMotherPhone('');
    setStdModel('1-3');
    setStdLevel('LVL-F2');
    setStdStatus('Chờ xếp lớp');
    setStdSlots(['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)']);
    setSelectedDaysInPicker(['T3', 'T5']);
    setSelectedTimeRangesInPicker(['18:00 - 19:30']);
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
    const parsedDays = WEEK_DAYS.filter(d => existingSlots.some(slot => slot.startsWith(`${d.key} `))).map(d => d.key);
    const parsedRanges = activeTimeSlots.filter(ts => existingSlots.some(slot => slot.includes(`(${ts.timeRange})`))).map(ts => ts.timeRange);
    setSelectedDaysInPicker(parsedDays.length > 0 ? parsedDays : ['T3', 'T5']);
    setSelectedTimeRangesInPicker(parsedRanges.length > 0 ? parsedRanges : (activeTimeSlots[0] ? [activeTimeSlots[0].timeRange] : ['18:00 - 19:30']));
    setIsStudentModalOpen(true);
  };

  const handleSaveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdName.trim()) return;

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
        id: `HS-2026-${String(students.length + 1).padStart(3, '0')}`,
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

    const studentIdToUse: string = editingStudentId || `HS-2026-${String(students.length + 1).padStart(3, '0')}`;
    if (editingStudentId) {
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
      `Đã ghép thành công học sinh ${stdName.trim()} vào lớp ${targetClass.name} (${targetClass.code})! Sĩ số: ${targetClass.studentIds.length + 1}/${targetClass.maxStudents} HS`,
      'success'
    );
  };

  // Lưu hồ sơ và mở ngay luồng Tạo lớp mới (1-1 hoặc 1-n khi chưa có lớp ghép)
  const handleSaveAndCreateClass = () => {
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
        id: `HS-2026-${String(students.length + 1).padStart(3, '0')}`,
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

  // Ghép trực tiếp từ danh sách học sinh (Tab 1 hoặc Chi tiết học sinh)
  const handleDirectAssignFromList = (student: StudentRecord, targetClass: ClassItem) => {
    if (targetClass.studentIds.length >= targetClass.maxStudents) {
      showToast(`Lớp ${targetClass.code} đã đủ sĩ số tối đa (${targetClass.maxStudents} HS)!`, 'error');
      return;
    }

    updateClass(targetClass.id, {
      studentIds: [...targetClass.studentIds, student.id]
    });

    updateStudent(student.id, {
      status: 'Đang học',
      currentClassCode: targetClass.code
    });

    if (viewingDetailStudent?.id === student.id) {
      setViewingDetailStudent(null);
    }

    showToast(
      `Đã ghép học sinh ${student.name} vào lớp ${targetClass.code} thành công (Sĩ số: ${targetClass.studentIds.length + 1}/${targetClass.maxStudents} HS)!`,
      'success'
    );
  };

  // Class CRUD
  const openCreateClass = (preStudent?: StudentRecord) => {
    setEditingClassId(null);
    const targetGrade = preStudent ? preStudent.grade : 'Lớp 3';
    const targetSub = preStudent ? preStudent.subject : 'SUB-MATH';
    const targetLvl = preStudent ? preStudent.level : 'LVL-STD';
    const targetMdl = preStudent ? preStudent.model : '1-3';

    setClsGrade(targetGrade);
    setClsSubject(targetSub);
    setClsLevel(targetLvl);
    setClsModel(targetMdl);
    setClsName(`${targetSub === 'SUB-MATH' ? 'Toán' : 'Tiếng Anh'} ${targetGrade} (${targetMdl})`);
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

    const max = clsModel === '1-1' ? 1 : clsModel === '1-3' ? 3 : 5;

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
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Mã &amp; Học sinh</th>
                    <th className="py-3.5 px-4">Khối lớp (1-5)</th>
                    <th className="py-3.5 px-4">Môn &amp; Trình độ</th>
                    <th className="py-3.5 px-4">Liên hệ Phụ huynh</th>
                    <th className="py-3.5 px-4">Khung ca học mong muốn</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {students
                    .filter(s => {
                      const matchSearch =
                        s.name.toLowerCase().includes(stdSearch.toLowerCase()) ||
                        s.id.toLowerCase().includes(stdSearch.toLowerCase()) ||
                        (s.fatherPhone && s.fatherPhone.includes(stdSearch)) ||
                        (s.motherPhone && s.motherPhone.includes(stdSearch));
                      const matchGrade = !stdGradeFilter || s.grade === stdGradeFilter;
                      const matchSub = !stdSubjectFilter || s.subject === stdSubjectFilter;
                      const matchSts = !stdStatusFilter || s.status === stdStatusFilter;
                      return matchSearch && matchGrade && matchSub && matchSts;
                    })
                    .map(s => {
                      const primaryContact = s.fatherPhone
                        ? { role: 'Bố', name: s.fatherName || 'Bố', phone: s.fatherPhone }
                        : s.motherPhone
                        ? { role: 'Mẹ', name: s.motherName || 'Mẹ', phone: s.motherPhone }
                        : null;
                      const hasBoth = Boolean(s.fatherPhone && s.motherPhone);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingDetailStudent(s)}
                              className="font-bold text-slate-800 hover:text-indigo-600 text-left cursor-pointer transition-colors"
                              title="Bấm để xem chi tiết đầy đủ hồ sơ học sinh"
                            >
                              {s.name}
                            </button>
                            <div className="font-mono text-[11px] text-slate-400">{s.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs">
                              {s.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#FF5C00]">
                              {s.subject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh'}
                            </div>
                            <div className="text-[11px] text-slate-500">Mô hình: {s.model} &bull; {s.level}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {primaryContact ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-800 text-[11px]">
                                  {primaryContact.phone}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ({primaryContact.name})
                                </span>
                                {hasBoth && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingDetailStudent(s)}
                                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                                    title="Xem thêm số phụ huynh thứ 2"
                                  >
                                    +1 người
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa có liên hệ</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                            {s.scheduleSlots?.join(', ')}
                          </td>
                          <td className="py-3 px-4">
                            {s.status === 'Đang học' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang học
                              </span>
                            ) : s.status === 'Chờ xếp lớp' ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Chờ xếp lớp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {s.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingDetailStudent(s)}
                                className="text-slate-600 hover:text-indigo-600 p-1 rounded hover:bg-slate-100"
                                title="Xem chi tiết hồ sơ & phụ huynh"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditStudent(s)}
                                className="text-slate-600 hover:text-[#FF5C00] p-1 rounded hover:bg-slate-100"
                                title="Sửa học sinh"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {s.status === 'Chờ xếp lớp' && (
                                s.model === '1-1' ? (
                                  <button
                                    onClick={() => openCreateClass(s)}
                                    className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Tạo lớp 1-1 mới với lịch rảnh của học sinh"
                                  >
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    <span>Tạo lớp 1-1</span>
                                  </button>
                                ) : (
                                  (() => {
                                    const matching = findMatchingClassesForStudent(s.subject, s.grade, s.level, s.model);
                                    if (matching.length > 0) {
                                      return (
                                        <button
                                          onClick={() => handleDirectAssignFromList(s, matching[0])}
                                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                                          title={`Ghép ngay vào lớp ${matching[0].code} (${matching[0].studentIds.length}/${matching[0].maxStudents} HS - Còn ${matching[0].maxStudents - matching[0].studentIds.length} chỗ)`}
                                        >
                                          <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                                          <span>Ghép lớp ({matching[0].code.slice(-5)})</span>
                                        </button>
                                      );
                                    }
                                    return (
                                      <button
                                        onClick={() => openCreateClass(s)}
                                        className="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-[11px] border border-orange-200 flex items-center gap-1 cursor-pointer transition-colors"
                                        title={`Tạo lớp ${s.model} mới cho học sinh`}
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        <span>Tạo lớp {s.model}</span>
                                      </button>
                                    );
                                  })()
                                )
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa học sinh ${s.name}?`)) {
                                    deleteStudent(s.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                            {c.subject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                            {c.level}
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
                                if (window.confirm(`Xóa lớp học ${c.name}?`)) {
                                  deleteClass(c.id);
                                }
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
                            {c.subject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh'}
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

            <form onSubmit={handleSaveStudentSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Họ và tên học sinh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={stdName}
                    onChange={e => setStdName(e.target.value)}
                    placeholder="Ví dụ: Hoàng Minh Trí"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khối lớp (Lớp 1 - 5) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={stdGrade}
                    onChange={e => setStdGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="Lớp 1">Lớp 1</option>
                    <option value="Lớp 2">Lớp 2</option>
                    <option value="Lớp 3">Lớp 3</option>
                    <option value="Lớp 4">Lớp 4</option>
                    <option value="Lớp 5">Lớp 5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={stdSubject}
                    onChange={e => setStdSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="SUB-MATH">Môn Toán</option>
                    <option value="SUB-ENG">Môn Tiếng Anh</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mô hình lớp</label>
                  <select
                    value={stdModel}
                    onChange={e => setStdModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="1-1">1 Kèm 1</option>
                    <option value="1-3">Nhóm 1-3</option>
                    <option value="1-5">Nhóm 1-5</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trình độ</label>
                  <select
                    value={stdLevel}
                    onChange={e => setStdLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                  >
                    <option value="LVL-F1">Nền tảng 1</option>
                    <option value="LVL-F2">Nền tảng 2</option>
                    <option value="LVL-STD">Tiêu chuẩn</option>
                    <option value="LVL-ADV">Nâng cao</option>
                  </select>
                </div>
              </div>

              {/* Thông tin phụ huynh bắt buộc Bố hoặc Mẹ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-[#FF5C00]" /> Thông tin Phụ huynh
                  </span>
                  <span className="text-[11px] text-[#FF5C00] font-medium">* Bắt buộc nhập SĐT của Bố hoặc Mẹ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Họ tên Bố</label>
                    <input
                      type="text"
                      value={stdFatherName}
                      onChange={e => setStdFatherName(e.target.value)}
                      placeholder="Trần Mạnh Hùng"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Số điện thoại Bố</label>
                    <input
                      type="tel"
                      value={stdFatherPhone}
                      onChange={e => setStdFatherPhone(e.target.value)}
                      placeholder="0912.888.999"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Họ tên Mẹ</label>
                    <input
                      type="text"
                      value={stdMotherName}
                      onChange={e => setStdMotherName(e.target.value)}
                      placeholder="Nguyễn Thị Thùy"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Số điện thoại Mẹ</label>
                    <input
                      type="tel"
                      value={stdMotherPhone}
                      onChange={e => setStdMotherPhone(e.target.value)}
                      placeholder="0912.777.666"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                </div>
              </div>

              {/* ================= KHUNG CA HỌC RẢNH MONG MUỐN ================= */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#FF5C00]" />
                        Khung ca học rảnh mong muốn
                      </label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#FF5C00]">
                        Đồng bộ Danh mục Master Data
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Chọn thời gian thứ mấy trong tuần &rarr; Chọn ca học tương ứng lấy trực tiếp từ Danh mục Master Data.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Đã chọn: <strong className="text-[#FF5C00] font-bold font-mono">{stdSlots.length}</strong> ca rảnh
                    </span>
                    {stdSlots.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllSlots}
                        className="text-[11px] text-slate-400 hover:text-rose-600 underline cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>
                </div>

                {/* PHẦN 1: CHỌN THỜI GIAN THỨ MẤY */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FF5C00]" />
                      1. Chọn thời gian học (Thứ mấy trong tuần):
                    </span>
                    {/* Nút chọn nhanh ngày */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Chọn nhanh:</span>
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset('246')}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF5C00] text-slate-600 transition-colors cursor-pointer border border-slate-200"
                      >
                        Thứ 2-4-6
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset('357')}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF5C00] text-slate-600 transition-colors cursor-pointer border border-slate-200"
                      >
                        Thứ 3-5-7
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset('weekend')}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF5C00] text-slate-600 transition-colors cursor-pointer border border-slate-200"
                      >
                        Thứ 7 &amp; CN
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset('all')}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF5C00] text-slate-600 transition-colors cursor-pointer border border-slate-200"
                      >
                        Cả tuần
                      </button>
                    </div>
                  </div>

                  {/* Danh sách 7 ngày trong tuần */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {WEEK_DAYS.map(day => {
                      const isDaySelected = selectedDaysInPicker.includes(day.key);
                      const daySlotsCount = stdSlots.filter(s => s.startsWith(`${day.key} `)).length;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleToggleDay(day.key)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isDaySelected
                              ? 'bg-orange-50 border-[#FF5C00] text-[#FF5C00] shadow-2xs font-bold ring-1 ring-[#FF5C00]/30'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{day.shortName}</span>
                            {isDaySelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-normal">{day.eng}</span>
                            {daySlotsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#FF5C00] text-white">
                                {daySlotsCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PHẦN 2: CHỌN CA HỌC (LẤY TỪ PHẦN DANH MỤC MASTER DATA) */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FF5C00]" />
                      2. Chọn ca học (Lấy từ Danh mục Ca học Master Data):
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {activeTimeSlots.length} ca khả dụng trong Danh mục
                    </span>
                  </div>

                  {/* Danh sách các Ca học động từ Master Data */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {activeTimeSlots.map(slot => {
                      const isSlotChecked = selectedTimeRangesInPicker.includes(slot.timeRange);
                      const countInSchedule = stdSlots.filter(s => s.includes(`(${slot.timeRange})`)).length;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => handleToggleTimeSlot(slot.timeRange)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSlotChecked
                              ? 'bg-orange-50/80 border-[#FF5C00] ring-1 ring-[#FF5C00]/20 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-600">
                                {slot.code}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs mt-1.5 leading-snug">
                                {slot.name}
                              </h4>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSlotChecked}
                              onChange={() => {}} // handled by parent container
                              className="mt-0.5 accent-[#FF5C00] w-4 h-4 cursor-pointer"
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#FF5C00]">
                              {slot.timeRange}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {slot.durationMinutes} phút
                            </span>
                          </div>

                          {countInSchedule > 0 && (
                            <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center justify-between">
                              <span>Đã gán:</span>
                              <span>{countInSchedule} buổi</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tổng hợp các ca rảnh đã đăng ký */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FF5C00]" />
                      Lịch rảnh đã đăng ký của học sinh ({stdSlots.length} ca):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Dùng làm thời khóa biểu lớp học
                    </span>
                  </div>
                  {stdSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {stdSlots.map(slot => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[#FF5C00] font-mono text-[11px] font-bold shadow-2xs"
                        >
                          <span>{slot}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlotChip(slot)}
                            className="hover:bg-orange-200 rounded p-0.5 transition-colors cursor-pointer"
                            title="Xóa ca này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400 text-xs italic">
                      Chưa chọn ca rảnh nào. Vui lòng bấm chọn Thứ và Ca học ở trên!
                    </div>
                  )}
                </div>
              </div>

              {/* ================= ĐIỀU PHỐI GHÉP LỚP THÔNG MINH (1-1 VS 1-N) ================= */}
              {stdModel === '1-1' ? (
                // Chế độ 1 Kèm 1: Tự động tạo lớp mới
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border border-blue-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Mô hình 1 kèm 1 (1-1): Tự động tạo lớp mới độc quyền
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      Sĩ số trần: 1 HS
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Học sinh học 1 kèm 1 riêng biệt. Khi bấm <strong>"Lưu &amp; Khởi tạo lớp 1-1 mới"</strong>, hệ thống sẽ mở ngay form khởi tạo lớp mới với lịch học tự động lấy từ khung rảnh vừa chọn: <strong className="font-mono text-[#FF5C00]">{stdSlots.length > 0 ? stdSlots.join(', ') : 'Chưa chọn lịch'}</strong>.
                  </p>
                </div>
              ) : (
                // Chế độ 1-n (Nhóm 1-3, Nhóm 1-5): Đề xuất lớp đang thiếu người phù hợp trình độ
                (() => {
                  const matchingClasses = findMatchingClassesForStudent(stdSubject, stdGrade, stdLevel, stdModel);
                  if (matchingClasses.length > 0) {
                    return (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/70 border border-emerald-300 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                            Đề xuất ghép vào lớp đang thiếu người ({matchingClasses.length} lớp phù hợp):
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                            Mô hình {stdModel} &bull; {stdGrade} &bull; {stdSubject === 'SUB-MATH' ? 'Toán' : 'Tiếng Anh'} &bull; {stdLevel}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Tìm thấy các lớp đang thiếu người đúng môn, khối và trình độ. Bạn có thể bấm <strong>"Ghép vào lớp này ngay"</strong> để hoàn tất nhanh:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {matchingClasses.map(c => {
                            const availableSeats = c.maxStudents - c.studentIds.length;
                            const isScheduleMatch = stdSlots.some(slot => c.schedule.includes(slot));
                            return (
                              <div
                                key={c.id}
                                className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold text-[#FF5C00] text-xs">{c.code}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Còn trống {availableSeats} chỗ ({c.studentIds.length}/{c.maxStudents} HS)
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-slate-800 text-xs mt-1 truncate">{c.name}</h5>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    GV: <strong className="text-slate-700">{c.teacherName || 'Chưa phân công'}</strong>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-600 mt-1 flex items-center justify-between gap-1">
                                    <span className="truncate">Lịch: {c.schedule}</span>
                                    {isScheduleMatch && (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                                        ✓ Khớp lịch
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveAndAssignToClass(c)}
                                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-white" />
                                  <span>Ghép vào lớp này ngay</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Chưa có lớp {stdModel} nào còn chỗ trống phù hợp</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Các lớp {stdModel} hiện tại cùng môn &amp; trình độ đã đủ sĩ số trần (hoặc chưa có lớp nào). Bạn có thể bấm <strong>"Lưu &amp; Tạo lớp {stdModel} mới"</strong> bên dưới.
                      </p>
                    </div>
                  );
                })()
              )}

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
                  title="Lưu thông tin học sinh vào danh sách chờ"
                >
                  Chỉ lưu hồ sơ
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndCreateClass}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {stdModel === '1-1' ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Lưu &amp; Khởi tạo lớp 1-1 mới</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Lưu &amp; Khởi tạo lớp {stdModel} mới</span>
                    </>
                  )}
                </button>
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
                    Mã: {viewingDetailStudent.id} &bull; Lớp hiện tại: {viewingDetailStudent.currentClassCode || 'Chưa xếp lớp'}
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
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {viewingDetailStudent.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400">Khối lớp:</span>{' '}
                    <strong className="text-slate-700">{viewingDetailStudent.grade}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Môn học:</span>{' '}
                    <strong className="text-slate-700">
                      {viewingDetailStudent.subject === 'SUB-MATH' ? 'Toán' : 'Tiếng Anh'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Trình độ:</span>{' '}
                    <strong className="text-slate-700">{viewingDetailStudent.level}</strong>
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

              {/* Đề xuất xếp lớp theo mô hình (1-1 vs 1-n) */}
              {viewingDetailStudent.status === 'Chờ xếp lớp' && (
                viewingDetailStudent.model === '1-1' ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Mô hình 1 kèm 1 (1-1): Tự động tạo lớp mới
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        Lớp cá nhân hóa
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Học sinh học 1 kèm 1 riêng biệt. Hệ thống sẽ tạo lớp mới độc quyền, tự động dùng lịch rảnh của bé ({viewingDetailStudent.scheduleSlots?.join(', ') || 'Chưa có lịch'}) làm thời khóa biểu chính thức.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const matching = findMatchingClassesForStudent(
                      viewingDetailStudent.subject,
                      viewingDetailStudent.grade,
                      viewingDetailStudent.level,
                      viewingDetailStudent.model
                    );
                    if (matching.length > 0) {
                      return (
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/70 border border-emerald-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                              Đề xuất lớp đang thiếu người phù hợp ({matching.length} lớp):
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Mô hình {viewingDetailStudent.model}
                            </span>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {matching.map(c => {
                              const remaining = c.maxStudents - c.studentIds.length;
                              return (
                                <div
                                  key={c.id}
                                  className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[#FF5C00] text-xs">{c.code}</span>
                                      <span className="font-semibold text-slate-800 text-xs">{c.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      GV: <strong>{c.teacherName || 'Chưa phân công'}</strong> &bull; Lịch: {c.schedule}
                                    </div>
                                    <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                                      Sĩ số: {c.studentIds.length}/{c.maxStudents} HS (Còn trống {remaining} chỗ)
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectAssignFromList(viewingDetailStudent, c)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer shrink-0 transition-colors"
                                  >
                                    <Zap className="w-3 h-3 fill-white" />
                                    <span>Ghép ngay</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                        <span className="font-semibold text-slate-700 block">Chưa có lớp {viewingDetailStudent.model} nào còn chỗ trống phù hợp.</span>
                        <span className="text-[11px] text-slate-500">Bạn có thể bấm "Tạo lớp {viewingDetailStudent.model} mới" bên dưới.</span>
                      </div>
                    );
                  })()
                )
              )}

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
                {viewingDetailStudent.status === 'Chờ xếp lớp' && (
                  <button
                    type="button"
                    onClick={() => {
                      const st = viewingDetailStudent;
                      setViewingDetailStudent(null);
                      openCreateClass(st);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-medium shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {viewingDetailStudent.model === '1-1' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tạo lớp 1-1 mới</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Tạo lớp {viewingDetailStudent.model} mới</span>
                      </>
                    )}
                  </button>
                )}
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
                    <option value="Lớp 1">Lớp 1</option>
                    <option value="Lớp 2">Lớp 2</option>
                    <option value="Lớp 3">Lớp 3</option>
                    <option value="Lớp 4">Lớp 4</option>
                    <option value="Lớp 5">Lớp 5</option>
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
                    <option value="SUB-MATH">Môn Toán</option>
                    <option value="SUB-ENG">Môn Tiếng Anh</option>
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
                    <option value="1-1">1 Kèm 1 (Trần 1 HS)</option>
                    <option value="1-3">Nhóm 1-3 (Trần 3 HS)</option>
                    <option value="1-5">Nhóm 1-5 (Trần 5 HS)</option>
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
          (stdGradeFilter ? 1 : 0) +
          (stdSubjectFilter ? 1 : 0) +
          (stdStatusFilter ? 1 : 0) +
          (stdSearch ? 1 : 0)
        }
        onReset={() => {
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
              <option value="Lớp 1">Lớp 1</option>
              <option value="Lớp 2">Lớp 2</option>
              <option value="Lớp 3">Lớp 3</option>
              <option value="Lớp 4">Lớp 4</option>
              <option value="Lớp 5">Lớp 5</option>
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
              <option value="SUB-MATH">Môn Toán</option>
              <option value="SUB-ENG">Môn Tiếng Anh</option>
            </select>
          </div>

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
              <option value="Lớp 1">Lớp 1</option>
              <option value="Lớp 2">Lớp 2</option>
              <option value="Lớp 3">Lớp 3</option>
              <option value="Lớp 4">Lớp 4</option>
              <option value="Lớp 5">Lớp 5</option>
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
              <option value="SUB-MATH">Môn Toán</option>
              <option value="SUB-ENG">Môn Tiếng Anh</option>
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
              <option value="1-1">1 Kèm 1</option>
              <option value="1-3">Nhóm 1-3</option>
              <option value="1-5">Nhóm 1-5</option>
            </select>
          </div>
        </div>
      </FilterDrawer>
    
    </div>
  );
};
