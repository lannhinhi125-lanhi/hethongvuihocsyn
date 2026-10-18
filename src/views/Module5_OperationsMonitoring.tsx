import { canTeachClassModel } from '../lib/teachingModelGroups';
import {MonitoringPeriodToolbar} from '../components/MonitoringPeriodToolbar';
import {workbenchRange} from '../lib/workbenchTime';
import {reportToday} from '../lib/customReports';
import { monitoringSubjectCode, selectedMonitoringSubject } from '../lib/monitoringSubjects';
import { TeachingSessionDetails } from '../components/TeachingSessionDetails';
import { teachingScheduleEntries } from '../lib/teachingSessionDetails';
import { EmptyState } from '../components/EmptyState';
import { useBusinessValue, useBusinessStatus, waitForBusinessSave, refreshBusinessData } from '../lib/businessPersistence';
import { storedMonitoringSession, persistMonitoringChanges } from '../lib/monitoringPersistence';
import { monitoringSessionStatus, monitoringSessionPriority, isEarlyCheckout, minutesEndedEarly, type MonitoringSessionState } from '../lib/sessionAlerts';
import { PaginatedList } from '../components/Pagination';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from '../components/FilterDrawer';
import {
  CalendarDays,
  Filter,
  TriangleAlert,
} from 'lucide-react';

// Types cho Phân hệ 5
export interface MonitoringSessionStudent {
  name: string;
  code: string;
  gradeText: string;
  attendance: string;
  aiComment: string;
  criteria: string[];
}

export interface MonitoringSession {
  displayCode?: string;
  sessionCode: string;
  sessionDate: string; // 'YYYY-MM-DD'
  classCode: string;
  className: string;
  levelText: string;
  modelText: string;
  subject: string;
  grade: number;
  timeSlot: string;
  room: string;
  roomUrl: string;
  recordingUrl: string | null;
  primaryTeacher: string;
  primaryTeacherId?: string;
  coverTeacher: string | null;
  coverTeacherId?: string | null;
  attendance: 'ATTENDED' | 'LATE' | 'ABSENT';
  checkinTime: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  hasPersistedStatus?: boolean;
  feedbackProgress?: {total:number;completed:number;state:string;studentIds:string[]};
  status: MonitoringSessionState;
  hasIncident: boolean;
  incidentParent: 'GRP-TCH' | 'GRP-STU' | 'GRP-SYS' | null;
  incidentChild: string | null;
  incidentUrgency: 'EMERGENCY' | 'ADVANCED' | null;
  incidentStatus: 'DA_GIAI_QUYET' | 'DANG_XU_LY' | 'HUY_CA' | null;
  incidentNote: string;
  handledByOpsId: string | null;
  handledByName: string | null;
  handledAt: string | null;
  lessonDiary: string;
  students: MonitoringSessionStudent[];
  isJustUpdated?: boolean;
}

export const Module5_OperationsMonitoring: React.FC = () => {
  const displaySessionCode=(session:Pick<MonitoringSession,'displayCode'>)=>session.displayCode||'Chưa cấp mã';
  const { can, requirePermission } = usePermissions();
  const { showToast, currentUser, classes, setClasses, teachers, timeSlots, students, levels, subjects, teachingCategories, incidents, users } = useApp();
  const INCIDENT_MASTER_DATA: Record<string, { code: string; name: string }[]> = Object.fromEntries(incidents.map(group => [group.code, group.subIncidents.filter(item => item.status).map(item => ({ code: item.code, name: item.name }))]));

  const businessStatus = useBusinessStatus();
  const [savingIncident, setSavingIncident] = useState(false);
  const currentOps = { id: currentUser.id, name: currentUser.name };
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);

  // Phạm vi thời gian đang xem
  const [monitoringPeriod,setMonitoringPeriod]=useState<'day'|'week'|'month'>('day');
  const [monitoringRange,setMonitoringRange]=useState(()=>workbenchRange(reportToday(),'day'));
  const dateFrom=monitoringRange.start,dateTo=monitoringRange.end;
  // Tab chính
  const [activeTab, setActiveTab] = useState<'diary' | 'incidents'>('diary');

  // Danh sách ca dạy toàn hệ thống
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [persistedLessons] = useBusinessValue<Record<string,any>[]>('dated_lessons');
  const [persistedIncidents] = useBusinessValue<Record<string,any>[]>('lesson_incidents');
  const saveSessions = (action: React.SetStateAction<MonitoringSession[]>) => {
    const next=typeof action==='function'?action(sessions):action;
    try {persistMonitoringChanges(sessions,next,persistedLessons,persistedIncidents,classes,teachers,timeSlots,incidents,currentUser.id);return true;}
    catch(error){showToast((error as Error).message,'error');return false;}
  };

  useEffect(() => {
    const startDate=dateFrom,endDate=dateTo;
    const generated: MonitoringSession[] = [];
    persistedLessons.filter(lesson => lesson.date >= startDate && lesson.date <= endDate).forEach(lesson => {
      const cls = classes.find(item => item.id === lesson.classId);
      const slot = timeSlots.find(item => item.id === lesson.timeSlotId);
      if (!cls || !slot) return;
      generated.push(storedMonitoringSession({
        sessionCode: lesson.id, sessionDate: lesson.date, classCode: cls.code,
        room: '', roomUrl: '', recordingUrl: null, coverTeacher: null,
        attendance: 'ABSENT', checkinTime: null, status: 'CHUA_DIEN_RA',
        hasIncident: false, incidentParent: null, incidentChild: null, incidentUrgency: null,
        incidentStatus: null, incidentNote: '', handledByOpsId: null, handledByName: null,
        handledAt: null, lessonDiary: '',
        className: cls.name, levelText: levels.find(level => level.code === cls.level)?.name || cls.level,
        modelText: cls.model, subject: cls.subject, grade: Number(cls.grade.match(/\d+/)?.[0] || 0),
        timeSlot: slot.timeRange, primaryTeacher: cls.teacherName,
        students: (lesson.inspectionData?.studentIds ?? lesson.feedbackProgress?.studentIds ?? cls.studentIds).map((id: string) => ({name: students.find(student => student.id === id)?.name || id,
          code: id, gradeText: cls.grade, attendance: lesson.inspectionData?.attendance?.[id] || 'Chưa điểm danh',
          aiComment: lesson.inspectionData?.feedback?.[id] || '', criteria: []}))
      } as MonitoringSession, persistedLessons, persistedIncidents, classes, teachers, timeSlots, incidents, users));
    });
    setSessions(generated);
  }, [classes, students, levels, dateFrom, dateTo, persistedLessons, persistedIncidents, users, teachers, timeSlots, incidents]);

  const [colFilterCode, setColFilterCode] = useState('');
  const [colFilterClass, setColFilterClass] = useState('');
  const [colFilterTeacher, setColFilterTeacher] = useState('');
  const [colFilterTime, setColFilterTime] = useState('ALL');
  const [colFilterAttendance, setColFilterAttendance] = useState('ALL');
  const [colFilterStatus, setColFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const subjectTabs = subjects.filter(subject=>subject.status !== false);
  const selectedSubjectCode = selectedMonitoringSubject(subjects,filterSubject);
  const selectedSubjectName = subjects.find(subject=>subject.code===selectedSubjectCode)?.name || 'Chưa có môn học';
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');

  // Bộ lọc cột cho Tab 2 (Thông tin Sự cố & Điều phối Dạy thay)
  const [incColFilterCode, setIncColFilterCode] = useState('');
  const [incColFilterClass, setIncColFilterClass] = useState('');
  const [incColFilterTarget, setIncColFilterTarget] = useState('ALL');
  const [incColFilterType, setIncColFilterType] = useState('');
  const [incColFilterUrgency, setIncColFilterUrgency] = useState('ALL');
  const [incColFilterCover, setIncColFilterCover] = useState('');
  const [incColFilterStatus, setIncColFilterStatus] = useState('ALL');
  const [incColFilterOps, setIncColFilterOps] = useState('');

  // Modals state
  const [selectedClassViewSession, setSelectedClassViewSession] = useState<MonitoringSession | null>(null);
  const [selectedIncidentSession, setSelectedIncidentSession] = useState<MonitoringSession | null>(null);
  const [coverScheduleTeacherName, setCoverScheduleTeacherName] = useState<string | null>(null);
  const [isCheckinSimOpen, setIsCheckinSimOpen] = useState(false);
  const [simSessionCode, setSimSessionCode] = useState('BD001');

  // Incident Modal internal form state
  const [incParent, setIncParent] = useState<'GRP-TCH' | 'GRP-STU' | 'GRP-SYS'>('GRP-TCH');
  const [incChild, setIncChild] = useState<string>('INC-TCH-02');
  const [incUrgency, setIncUrgency] = useState<'EMERGENCY' | 'ADVANCED'>('EMERGENCY');
  const [incStatus, setIncStatus] = useState<'DA_GIAI_QUYET' | 'DANG_XU_LY' | 'HUY_CA'>('DANG_XU_LY');
  const [incNote, setIncNote] = useState<string>('');
  const [incHasCover, setIncHasCover] = useState<boolean>(false);
  const [incCoverTeacher, setIncCoverTeacher] = useState<string>('');

  const coverCandidatesForSession = (session: MonitoringSession) => {
    const normalizeTeacherName = (name: string) => name.replace(/^(Thầy|Cô)\s+/i, '').trim().toLocaleLowerCase('vi');
    const weekday = (new Date(`${session.sessionDate}T00:00:00`).getDay() + 6) % 7;
    const targetClass = classes.find(cls => cls.code === session.classCode);
    const slot = timeSlots.find(item => item.status !== false && item.timeRange === session.timeSlot);
    if (!targetClass || !slot) return [];

    const targetSchedule = Array.from(
      targetClass.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
      match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
    ).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).slice(0, 2);
    const targetSessionNum = targetSchedule.findIndex(entry => entry.dayIndex === weekday && entry.time === session.timeSlot) + 1;
    if (targetSessionNum < 1) return [];
    const [startHour, startMinute] = session.timeSlot.split(' - ')[0].split(':').map(Number);
    const [endHour, endMinute] = session.timeSlot.split(' - ')[1]?.split(':').map(Number) || [];
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const overlapsTarget = (timeRange: string) => {
      const [from, to] = timeRange.split(' - ').map(value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
      });
      return Number.isFinite(from) && Number.isFinite(to) && start < to && from < end;
    };

    const primaryTeacherHasConflict = (teacherId: string, teacherName: string) => classes.some(cls => {
      if (cls.id === targetClass.id) return false;
      const isPrimaryTeacher = cls.teacherId === teacherId ||
        normalizeTeacherName(cls.teacherName) === normalizeTeacherName(teacherName);
      if (!isPrimaryTeacher) return false;
      return Array.from(
        cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
        match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
      ).some(entry => entry.dayIndex === weekday && overlapsTarget(entry.time));
    });

    const coverTeacherHasConflict = (teacherId: string) => classes.some(cls => {
      const assignedCoverConflicts = (cls.coverAssignments || []).some(assignment => {
        if (assignment.teacherId !== teacherId || assignment.dateStr !== session.sessionDate ||
          (cls.id === targetClass.id && assignment.sessionNum === targetSessionNum)) return false;
        return true;
      });
      return assignedCoverConflicts || Object.values(cls.activeSessions || {}).some(activeSession => {
        const activeDate = activeSession.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        const activeTime = activeSession.dateStr.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/)?.[0];
        const isCurrentAssignment = cls.id === targetClass.id && activeSession.sessionNum === targetSessionNum;
        return !isCurrentAssignment && activeDate === session.sessionDate &&
          activeSession.coverTeacherId === teacherId && overlapsTarget(activeTime || '');
      });
    });

    return teachers.filter(teacher => {
      const subjectMatches = teacher.subject === monitoringSubjectCode(session,classes);
      const availability = teacher.schedule?.[slot.code] || teacher.schedule?.[slot.id];
      return subjectMatches && canTeachClassModel(teacher.models,targetClass.model) && availability?.[weekday] === 'free' &&
        teacher.id !== targetClass.teacherId &&
        normalizeTeacherName(teacher.name) !== normalizeTeacherName(targetClass.teacherName) &&
        normalizeTeacherName(teacher.name) !== normalizeTeacherName(session.primaryTeacher) &&
        teacher.status !== 'TAM_NGUNG' &&
        !primaryTeacherHasConflict(teacher.id, teacher.name) && !coverTeacherHasConflict(teacher.id);
    });
  };

  // Điều hướng chuyển ngày nhanh
  const [testTimeMode, setTestTimeMode] = useState<'12:50' | '12:45' | '13:05' | 'REALTIME'>('REALTIME');
  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refreshBusinessData(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  // Lấy mốc thời gian hiện thời để đối chiếu
  const getCurrentEffectiveTime = () => {
    if (testTimeMode === '12:45') return '12:45';
    if (testTimeMode === '12:50') return '12:50';
    if (testTimeMode === '13:05') return '13:05';
    return `${String(clockNow.getHours()).padStart(2, '0')}:${String(clockNow.getMinutes()).padStart(2, '0')}`;
  };

  // Hàm kiểm tra ca học đã đến giờ nhưng giáo viên chưa vào phòng -> CHUYỂN TRẠNG THÁI ĐỎ LẬP TỨC
  const studyStatus = (session: MonitoringSession) => testTimeMode === 'REALTIME' && session.hasPersistedStatus
    ? session.status : monitoringSessionStatus(session, clockNow, getCurrentEffectiveTime());
  const warningRowClass = (session: MonitoringSession) => {
    const status = studyStatus(session);
    if (status === 'CHUA_HOC') return 'bg-rose-100/80 border-l-4 border-l-rose-600 border-b border-rose-200 text-rose-950 hover:bg-rose-100 ring-1 ring-inset ring-rose-300 font-medium';
    if (status === 'CHUA_HOAN_TAT' || (status === 'DA_HOC' && isEarlyCheckout(session.sessionDate,session.timeSlot,session.checkoutAt))) return 'bg-orange-100/80 border-l-4 border-l-orange-500 border-b border-orange-200 text-orange-950 hover:bg-orange-100 ring-1 ring-inset ring-orange-300 font-medium';
    return 'hover:bg-slate-50/80 border-b border-slate-100';
  };

  const dateFilteredSessions=sessions.filter(session=>session.sessionDate>=dateFrom&&session.sessionDate<=dateTo);
  const viewingToday=dateFrom===reportToday()&&dateTo===reportToday();

  const classForSession = (session: MonitoringSession) => classes.find(item => item.code === session.classCode);
  const classCategoryForSession = (session: MonitoringSession) => {
    const cls = classForSession(session);
    return cls ? teachingCategories.find(category => category.options.some(option => option.id === cls.grade))?.id || 'ALL' : 'ALL';
  };
  const subjectCodeForSession = (session: MonitoringSession) => monitoringSubjectCode(session,classes);
  const matchesCatalogFilters = (session: MonitoringSession) => {
    const cls = classForSession(session);
    return (filterCategory === 'ALL' || classCategoryForSession(session) === filterCategory) &&
      Boolean(selectedSubjectCode) && subjectCodeForSession(session) === selectedSubjectCode &&
      (filterGrade === 'ALL' || cls?.grade === filterGrade) &&
      (filterLevel === 'ALL' || cls?.level === filterLevel || session.levelText === levels.find(level => level.code === filterLevel)?.name);
  };
  const subjectFilteredSessions = dateFilteredSessions.filter(matchesCatalogFilters);

  // Lọc Tab 1
  const diaryFilteredSessions = dateFilteredSessions.filter(s => {
    if (!matchesCatalogFilters(s)) return false;
    if (colFilterCode && !`${s.sessionCode} ${s.displayCode||''}`.toLowerCase().includes(colFilterCode.toLowerCase())) return false;
    if (colFilterClass && !(s.className.toLowerCase().includes(colFilterClass.toLowerCase()) || s.classCode.toLowerCase().includes(colFilterClass.toLowerCase()))) return false;
    if (colFilterTeacher) {
      const q = colFilterTeacher.toLowerCase();
      const matchPrimary = s.primaryTeacher && s.primaryTeacher.toLowerCase().includes(q);
      const matchCover = s.coverTeacher && s.coverTeacher.toLowerCase().includes(q);
      if (!matchPrimary && !matchCover) return false;
    }
    if (colFilterTime !== 'ALL' && s.timeSlot !== colFilterTime) return false;
    if (colFilterAttendance !== 'ALL' && s.attendance !== colFilterAttendance) return false;
    if (colFilterStatus !== 'ALL' && studyStatus(s) !== colFilterStatus) return false;
    return true;
  }).sort((a,b)=>(viewingToday?monitoringSessionPriority(studyStatus(a))-monitoringSessionPriority(studyStatus(b)):0)||
    a.sessionDate.localeCompare(b.sessionDate)||a.timeSlot.localeCompare(b.timeSlot)||a.classCode.localeCompare(b.classCode));

  // Lọc Tab 2
  const incidentFilteredSessions = dateFilteredSessions.filter(s => {
    if (!matchesCatalogFilters(s)) return false;
    if (!s.hasIncident) return false;
    if (incColFilterCode && !`${s.sessionCode} ${s.displayCode||''}`.toLowerCase().includes(incColFilterCode.toLowerCase())) return false;
    if (incColFilterClass && !(s.className.toLowerCase().includes(incColFilterClass.toLowerCase()) || s.classCode.toLowerCase().includes(incColFilterClass.toLowerCase()))) return false;
    if (incColFilterTarget !== 'ALL' && s.incidentParent !== incColFilterTarget) return false;
    if (incColFilterType) {
      const q = incColFilterType.toLowerCase();
      const parentItems = INCIDENT_MASTER_DATA[s.incidentParent || ''] || [];
      const childObj = parentItems.find(c => c.code === s.incidentChild);
      const childName = (childObj ? childObj.name : (s.incidentChild || '')).toLowerCase();
      const note = (s.incidentNote || '').toLowerCase();
      if (!childName.includes(q) && !note.includes(q)) return false;
    }
    if (incColFilterUrgency !== 'ALL' && s.incidentUrgency !== incColFilterUrgency) return false;
    if (incColFilterCover) {
      if (!s.coverTeacher || !s.coverTeacher.toLowerCase().includes(incColFilterCover.toLowerCase())) return false;
    }
    if (incColFilterStatus !== 'ALL' && s.incidentStatus !== incColFilterStatus) return false;
    if (incColFilterOps) {
      const q = incColFilterOps.toLowerCase();
      const matchName = s.handledByName && s.handledByName.toLowerCase().includes(q);
      const matchId = s.handledByOpsId && s.handledByOpsId.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  // Thống kê KPI Tab 1
  const kpiTotal = subjectFilteredSessions.length;
  const kpiCompleted = subjectFilteredSessions.filter(s => studyStatus(s) === 'DA_HOC').length;
  const kpiIncidents = subjectFilteredSessions.filter(s => s.hasIncident || s.status === 'NGHI_HOC').length;
  const kpiCover = subjectFilteredSessions.filter(s => s.coverTeacherId).length;

  // Thống kê KPI Tab 2
  const kpiIncTotal = subjectFilteredSessions.filter(s => s.hasIncident).length;
  const kpiIncEmergency = subjectFilteredSessions.filter(s => s.incidentUrgency === 'EMERGENCY').length;
  const kpiIncTeacher = subjectFilteredSessions.filter(s => s.incidentParent === 'GRP-TCH').length;
  const kpiIncStudent = subjectFilteredSessions.filter(s => s.incidentParent === 'GRP-STU').length;

  // Reset bộ lọc Tab 1
  const resetColFilters = () => {
    setColFilterCode('');
    setColFilterClass('');
    setColFilterTeacher('');
    setColFilterTime('ALL');
    setColFilterAttendance('ALL');
    setColFilterStatus('ALL');
  };

  // Reset bộ lọc Tab 2
  const resetIncColFilters = () => {
    setIncColFilterCode('');
    setIncColFilterClass('');
    setIncColFilterTarget('ALL');
    setIncColFilterType('');
    setIncColFilterUrgency('ALL');
    setIncColFilterCover('');
    setIncColFilterStatus('ALL');
    setIncColFilterOps('');
  };

  const selectMonitoringSubject = (code: string) => {
    setFilterSubject(code);
    resetColFilters();
    resetIncColFilters();
  };

  // Mở Modal Sự cố
  const openIncidentModal = (session: MonitoringSession) => {
    if (!requirePermission("Ghi nhận và xử lý sự cố ca dạy")) return;
    setSelectedIncidentSession(session);
    const parent = session.incidentParent || 'GRP-TCH';
    setIncParent(parent);
    const childList = INCIDENT_MASTER_DATA[parent] || [];
    setIncChild(session.incidentChild || childList[0]?.code || 'INC-TCH-01');
    setIncUrgency(session.incidentUrgency || 'EMERGENCY');
    setIncStatus(session.incidentStatus || 'DANG_XU_LY');
    setIncNote(session.incidentNote || '');

    if (session.coverTeacher) {
      setIncHasCover(true);
      setIncCoverTeacher(session.coverTeacherId || '');
    } else {
      setIncHasCover(false);
      setIncCoverTeacher('');
    }
  };

  // Đổi Cây Cha trong modal sự cố
  const handleIncParentChange = (val: 'GRP-TCH' | 'GRP-STU' | 'GRP-SYS') => {
    setIncParent(val);
    const list = INCIDENT_MASTER_DATA[val] || [];
    setIncChild(list[0]?.code || '');
    if (val !== 'GRP-TCH') {
      setIncHasCover(false);
      setIncCoverTeacher('');
    }
  };

  // Lưu biên bản sự cố và điều phối cover
  const handleSaveIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirePermission("Ghi nhận và xử lý sự cố ca dạy")) return;
    if (savingIncident || businessStatus.saving || !selectedIncidentSession) return;
    const isCompletedIncidentSession = selectedIncidentSession.status === 'DA_HOC' || studyStatus(selectedIncidentSession) === 'DA_HOC';
    const selectedIncident = incidents.find(group => group.code === incParent)?.subIncidents.find(item => item.code === incChild);
    if (selectedIncident?.creditCoeff === undefined) {
      showToast('Loại sự cố này chưa được cấu hình hệ số công.', 'error');
      return;
    }
    if (!isCompletedIncidentSession && incHasCover && !requirePermission('Tìm và phân công giáo viên dạy thay')) return;
    if (isCompletedIncidentSession && incStatus === 'HUY_CA') {
      showToast('Ca đã học không thể chuyển thành hủy ca. Bạn vẫn có thể cập nhật biên bản sự cố.', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const resolvedIncidentStatus = incStatus === 'HUY_CA' ? 'DA_GIAI_QUYET' : incStatus;
    const coverTeacher = teachers.find(teacher => teacher.id === incCoverTeacher);
    const coverCandidates = coverCandidatesForSession(selectedIncidentSession);
    const targetClass = classes.find(cls => cls.code === selectedIncidentSession.classCode);
    const weekday = (new Date(`${selectedIncidentSession.sessionDate}T00:00:00`).getDay() + 6) % 7;
    const targetSchedule = targetClass ? Array.from(
      targetClass.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
      match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
    ).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).slice(0, 2) : [];
    const sessionNum = targetSchedule.findIndex(entry =>
      entry.dayIndex === weekday && entry.time === selectedIncidentSession.timeSlot
    ) + 1;

    if (!isCompletedIncidentSession && incParent === 'GRP-TCH' && incHasCover && !incCoverTeacher) {
      showToast('Vui lòng chọn giáo viên dạy thay đang rảnh đúng ngày và khung giờ của ca này.', 'error');
      return;
    }
    if (!isCompletedIncidentSession && incParent === 'GRP-TCH' && incHasCover &&
      (!targetClass || sessionNum < 1 || !coverTeacher || !coverCandidates.some(candidate => candidate.id === coverTeacher.id))) {
      showToast('Không thể gán cover: giáo viên không còn rảnh đúng ca này hoặc ca chưa được nối với lịch lớp.', 'error');
      return;
    }

    if (!saveSessions(prev => {
      const updated = prev.map(s => {
        if (s.sessionCode === selectedIncidentSession.sessionCode) {
          let nextCover = s.coverTeacher;
          let nextCoverId = s.coverTeacherId || null;
          let nextStatus = s.status;

          if (!isCompletedIncidentSession) {
            if (incParent === 'GRP-TCH') {
              if (incHasCover && incCoverTeacher) {
                nextCover = coverTeacher?.name || null;
                nextCoverId = coverTeacher?.id || null;

              } else {
                nextCover = null;
                nextCoverId = null;
                nextStatus = incStatus === 'HUY_CA' ? 'NGHI_HOC' : s.status;
              }
            } else {
              nextCover = null;
              nextCoverId = null;
              if (incStatus === 'HUY_CA' || incChild === 'INC-STU-01') nextStatus = 'NGHI_HOC';

            }
          }

          return {
            ...s,
            hasIncident: true,
            incidentParent: incParent,
            incidentChild: incChild,
            incidentUrgency: incUrgency,
            incidentStatus: resolvedIncidentStatus,
            incidentNote: incNote,
            coverTeacher: nextCover,
            coverTeacherId: nextCoverId,
            status: nextStatus,
            handledByOpsId: currentOps.id,
            handledByName: currentOps.name,
            handledAt: timeStr,
            isJustUpdated: true
          };
        }
        return { ...s, isJustUpdated: false };
      });
      return updated;
    })) return;

    setSavingIncident(true);
    try {
      await waitForBusinessSave();
      showToast(`Đã lưu biên bản ca ${displaySessionCode(selectedIncidentSession)} và cập nhật bảng công. Người xử lý: ${currentOps.name}.`, 'success');
      setSelectedIncidentSession(null);
    } catch (error) {
      showToast((error as Error).message, 'error');
    } finally {
      setSavingIncident(false);
    }
  };

  // Chế độ mô phỏng thời gian phục vụ kiểm thử theo yêu cầu:
  // "ở trong danh mục tạo 1 cca cchotoi từ 12:50 - 13:50 đi, rồi cho 1 giáo viên đđăngkis lịch rảnh đó, rồi tý đến 12:50 giáo viên chưa vào thì màn hình vận hành hiện màu đỏ ô đó đố. để thử nghiệm áy"
  const isShiftOverdueAndMissing = (s: MonitoringSession) => {
    return studyStatus(s) === 'CHUA_HOC';
  };

  // Xác nhận nhanh giáo viên vào lớp cho 1 ca học cụ thể (Gỡ bỏ màu đỏ)
  const handleQuickCheckin = (sessionCode: string) => {
    if (!requirePermission("Ghi nhận và xử lý sự cố ca dạy")) return;
    const curTime = getCurrentEffectiveTime();
    saveSessions(prev =>
      prev.map(s =>
        s.sessionCode === sessionCode
          ? {
              ...s,
              attendance: 'ATTENDED',
              checkinTime: `${curTime}:15`,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );
    showToast(`Đã xác nhận Giáo viên vào lớp ca [${sessions.find(s=>s.sessionCode===sessionCode)?.displayCode||'Chưa cấp mã'}] lúc ${curTime}:15. Trạng thái cảnh báo đỏ đã được gỡ bỏ!`, 'success');
  };

  // Đặt lại trạng thái chưa vào lớp để kiểm thử lại
  const handleResetCheckin = (sessionCode: string) => {
    if (!requirePermission("Ghi nhận và xử lý sự cố ca dạy")) return;
    saveSessions(prev =>
      prev.map(s =>
        s.sessionCode === sessionCode
          ? {
              ...s,
              attendance: 'ABSENT',
              checkinTime: null,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );
    showToast(`Đã đặt lại ca [${sessions.find(s=>s.sessionCode===sessionCode)?.displayCode||'Chưa cấp mã'}] về trạng thái CHƯA VÀO LỚP để thử nghiệm báo động đỏ!`, 'warning');
  };

  // Kích hoạt mô phỏng Check-in
  const triggerSimulateCheckin = (type: 'ON_TIME' | 'LATE') => {
    if (!requirePermission("Ghi nhận và xử lý sự cố ca dạy")) return;
    const targetSession = sessions.find(s => s.sessionCode === simSessionCode);
    if (!targetSession) return;

    const checkinTimeStr = type === 'ON_TIME' ? '17:55:00' : '18:08:30';
    const attendanceVal = type === 'ON_TIME' ? 'ATTENDED' : 'LATE';

    saveSessions(prev =>
      prev.map(s =>
        s.sessionCode === simSessionCode
          ? {
              ...s,
              attendance: attendanceVal,
              checkinTime: checkinTimeStr,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );

    setIsCheckinSimOpen(false);
    showToast(
      type === 'ON_TIME'
        ? `Giáo viên ấn Vào lớp lúc ${checkinTimeStr}. Chuyên cần ca ${simSessionCode}: Có mặt đúng giờ`
        : `Giáo viên ấn Vào lớp lúc ${checkinTimeStr}. Chuyên cần ca ${simSessionCode}: Đi muộn`,
      type === 'ON_TIME' ? 'success' : 'warning'
    );
  };

  // Danh sách các ca học bị quá giờ chưa vào
  const overdueSessionsList = diaryFilteredSessions.filter(isShiftOverdueAndMissing);

  return (
    <div className="space-y-6 text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-800">Giám sát ca &amp; sự cố · {selectedSubjectName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi ca dạy, chuyên cần và điều phối giáo viên dạy thay.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('diary')}
              aria-pressed={activeTab === 'diary'}
              className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'diary' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Nhật ký giám sát</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('incidents')}
              aria-pressed={activeTab === 'incidents'}
              className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'incidents' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TriangleAlert className="w-4 h-4" />
              <span>Sự cố &amp; điều phối dạy thay</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsTimeFilterOpen(true)}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FF5C00] flex items-center gap-1.5 cursor-pointer"
            title="Mở bộ lọc nâng cao"
          >
            <Filter className="w-4 h-4 text-[#FF5C00]" />
            <span>Lọc</span>
          </button>
        </div>
      </div>
      <MonitoringPeriodToolbar range={monitoringRange} period={monitoringPeriod} onChange={(range,period)=>{setMonitoringRange(range);setMonitoringPeriod(period);}}/>
      <div role="tablist" aria-label="Môn học giám sát" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {subjectTabs.map(subject=><button key={subject.code} id={'monitoring-subject-'+subject.code} type="button" role="tab" aria-selected={selectedSubjectCode===subject.code} aria-controls="monitoring-subject-content" onClick={()=>selectMonitoringSubject(subject.code)} className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selectedSubjectCode===subject.code?'bg-orange-50 text-[#FF5C00] ring-1 ring-orange-200':'text-slate-600 hover:bg-slate-50'}`}>
          {subject.name}<span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] leading-none">{dateFilteredSessions.filter(session=>subjectCodeForSession(session)===subject.code).length}</span>
        </button>)}
        {!subjectTabs.length && <p className="px-3 py-2 text-sm text-slate-500">Chưa có môn học đang hoạt động trong danh mục.</p>}
      </div>
      <div id="monitoring-subject-content" role="tabpanel" aria-labelledby={'monitoring-subject-'+selectedSubjectCode} className="space-y-6">
      {/* ========================================================================= */}
      {/* ================= TAB 1: NHẬT KÝ & GIÁM SÁT BUỔI HỌC ==================== */}
      {/* ========================================================================= */}
      {activeTab === 'diary' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tab 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">{viewingToday ? 'Tổng ca dạy hôm nay' : 'Tổng ca dạy'}</div>
              <div className="text-2xl font-black text-slate-800 font-mono">{kpiTotal}</div>
              <div className="text-[11px] text-slate-400 mt-1">{selectedSubjectName}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đã học</div>
              <div className="text-2xl font-black text-slate-700 font-mono">{kpiCompleted}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Hoàn thành ca dạy</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Ca có sự cố phát sinh</div>
              <div className="text-2xl font-black text-rose-600 font-mono">{kpiIncidents}</div>
              <div className="text-[11px] text-rose-500 font-medium mt-1">Cần điều phối sang Tab 2</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Dạy thay</div>
              <div className="text-2xl font-black text-purple-700 font-mono">{kpiCover}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">Đã nạp lịch GV dạy thay</div>
            </div>
          </div>

          {/* BẢNG GIÁM SÁT BUỔI HỌC VỚI BỘ LỌC TẠI CỘT */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="workspace-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng dữ liệu có thể cuộn">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {/* Hàng 1: Tiêu đề các cột */}
                  <tr>
                    <th className="py-3 px-3 w-24">MÃ BUỔI</th>
                    <th className="py-3 px-3 min-w-[210px]">LỚP HỌC</th>
                    <th className="py-3 px-3 min-w-[180px]">GIÁO VIÊN</th>
                    <th className="py-3 px-3 min-w-[150px]">THỜI GIAN &amp; NGÀY</th>
                    <th className="py-3 px-3 text-center min-w-[140px]">CHUYÊN CẦN GV</th>
                    <th className="py-3 px-3 text-center min-w-[145px]">TRẠNG THÁI CA</th>
                    <th className="py-3 px-3 text-center">HÌNH THỨC DẠY</th>
                    <th className="py-3 px-3 text-center">NHẬN XÉT</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">HÀNH ĐỘNG</th>
                  </tr>
                  {/* Hàng 2: Bộ lọc trực tiếp tại từng cột */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterCode}
                        onChange={e => setColFilterCode(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterClass}
                        onChange={e => setColFilterClass(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterTeacher}
                        onChange={e => setColFilterTeacher(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterTime}
                        onChange={e => setColFilterTime(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả khung giờ</option>
                        <option value="12:50 - 13:50">Ca Trưa: 12:50 - 13:50</option>
                        <option value="18:00 - 19:30">Ca 1: 18:00 - 19:30</option>
                        <option value="19:45 - 21:15">Ca 2: 19:45 - 21:15</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterAttendance}
                        onChange={e => setColFilterAttendance(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="ATTENDED">Có mặt</option>
                        <option value="LATE">Đi muộn</option>
                        <option value="ABSENT">Chưa vào</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterStatus}
                        onChange={e => setColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="CHUA_HOC">Chưa học</option>
                        <option value="CHUA_DIEN_RA">Chưa diễn ra</option>
                        <option value="DANG_HOC">Đang học</option>
                        <option value="CHUA_HOAN_TAT">Chưa hoàn tất</option>
                        <option value="DA_HOC">Đã học</option>
                        <option value="NGHI_HOC">Nghỉ học</option>
                      </select>
                    </th>
                    <th /><th />
                    <th className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={resetColFilters}
                        className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Reset
                      </button>
                    </th>
                  </tr>
                </thead>

                <PaginatedTableBody key={selectedSubjectCode+'-diary'} className="divide-y divide-slate-100 font-medium">
                  {diaryFilteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-center">
                        <EmptyState title="Không có buổi học nào phù hợp với bộ lọc." />
                      </td>
                    </tr>
                  ) : (
                    diaryFilteredSessions.map(s => {
                      const isCompleted = studyStatus(s) === 'DA_HOC';
                      const isOverdue = isShiftOverdueAndMissing(s);
                      const highlightClass = warningRowClass(s);

                      return (
                        <tr key={s.sessionCode} className={`transition-colors ${highlightClass}`}>
                          {/* Mã buổi */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              {isOverdue && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              )}
                              <span>{displaySessionCode(s)}</span>
                            </div>
                          </td>

                          {/* Lớp học */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800 text-xs">{s.className}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{s.classCode}</div>
                          </td>

                          {/* Giáo viên */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <div className={`font-semibold ${isOverdue ? 'text-rose-900' : 'text-slate-800'}`}>{s.primaryTeacher}</div>
                              {s.coverTeacher && (
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-medium text-slate-500">Cover:</span>
                                  <span className="font-semibold text-purple-700">{s.coverTeacher}</span>
                                  <button
                                    type="button"
                                    onClick={() => setCoverScheduleTeacherName(s.coverTeacher)}
                                    className="text-[10px] text-purple-600 underline font-semibold ml-0.5 cursor-pointer"
                                  >
                                    Lịch
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Thời gian & Ngày */}
                          <td className="py-3.5 px-3 text-xs">
                            {isOverdue ? (
                              <div className="space-y-1">
                                <div className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold font-mono text-xs border border-rose-200">
                                  {s.timeSlot}
                                </div>
                                <div className="text-[10px] text-rose-600 font-medium">
                                  Đến ca chưa vào lớp
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {s.sessionDate}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-bold text-slate-800 font-mono">
                                  {s.timeSlot}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {s.sessionDate}
                                </div>
                              </>
                            )}
                          </td>

                          {/* Chuyên cần */}
                          <td className="py-3.5 px-3 text-center">
                            {isOverdue ? (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold text-[11px] border border-rose-200"
                                title="Đã đến giờ ca dạy nhưng Giáo viên chưa vào lớp"
                              >
                                Chưa vào lớp
                              </span>
                            ) : s.attendance === 'ATTENDED' ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200"
                                title={`Check-in lúc: ${s.checkinTime}`}
                              >
                                Có mặt lúc {s.checkinTime ? s.checkinTime.slice(0, 5) : 'Đúng giờ'}
                              </span>
                            ) : s.attendance === 'LATE' ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200"
                                title={`Check-in trễ: ${s.checkinTime}`}
                              >
                                Muộn lúc {s.checkinTime ? s.checkinTime.slice(0, 5) : 'Muộn'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                Chưa vào lớp
                              </span>
                            )}
                          </td>

                          {/* Trạng thái ca */}
                          <td className="py-3.5 px-3 text-center">
                            {studyStatus(s) === 'CHUA_DIEN_RA' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">Chưa diễn ra</span>
                            ) : studyStatus(s) === 'CHUA_HOAN_TAT' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[11px] border border-orange-200">Chưa hoàn tất{isEarlyCheckout(s.sessionDate,s.timeSlot,s.checkoutAt) && <span> · Kết thúc sớm {Math.ceil(minutesEndedEarly(s.sessionDate,s.timeSlot,s.checkoutAt))} phút</span>}</span>
                            ) : studyStatus(s) === 'DANG_HOC' ? (
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200"><span className="w-2 h-2 rounded-full bg-blue-500" /> Đang học</span>
) : studyStatus(s) === 'DA_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400" /> Đã học
                                {isEarlyCheckout(s.sessionDate,s.timeSlot,s.checkoutAt) && <span className="text-orange-800"> · Kết thúc sớm {Math.ceil(minutesEndedEarly(s.sessionDate,s.timeSlot,s.checkoutAt))} phút</span>}
                              </span>
                            ) : studyStatus(s) === 'CHUA_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Chưa học
                              </span>
                            ) : s.status === 'NGHI_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Nghỉ học
                              </span>
                            ) : null}
                          </td>

                          <td className="py-3.5 px-3 text-center text-xs font-semibold">{s.coverTeacher ? 'Dạy thay' : 'Chính'}</td>
                          <td className="py-3.5 px-3 text-center text-xs">{(() => {
                            const total=s.feedbackProgress?.total ?? s.students.length;
                            const completed=s.feedbackProgress?.completed ?? s.students.filter(student=>student.aiComment?.trim()).length;
                            return completed===0 ? 'Chưa nhận xét' : completed===total ? 'Đã đủ '+completed+'/'+total : 'Chưa đủ '+completed+'/'+total;
                          })()}</td>
                          {/* Hành động */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isOverdue && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickCheckin(s.sessionCode)}
                                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                                  title="Xác nhận Giáo viên vào lớp (Gỡ cảnh báo đỏ)"
                                >
                                  GV Vào Lớp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedClassViewSession(s)}
                                className="px-2.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title="Mở Sổ ca dạy"
                              >
                                Sổ Ca Dạy
                              </button>

                              {can('Ghi nhận và xử lý sự cố ca dạy') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('incidents');
                                      openIncidentModal(s);
                                    }}
                                    className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-all cursor-pointer"
                                    title={isCompleted ? 'Cập nhật biên bản sự cố của ca đã học' : 'Lập biên bản sự cố và điều phối dạy thay'}
                                  >
                                    {s.hasIncident ? 'Biên bản' : 'Sự cố'}
                                  </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </PaginatedTableBody>
              </table>
            </div>

            {/* Chú thích chân bảng Tab 1 */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>
                  Chuyên cần giáo viên ghi nhận tự động 100% từ mốc giờ ấn nút <strong>"Vào lớp"</strong> đối chiếu với giờ bắt đầu ca học.
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Trực ban: <span className="font-bold text-slate-700">{currentOps.name} - {currentOps.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= TAB 2: THÔNG TIN SỰ CỐ & ĐIỀU PHỐI COVER ============== */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tab 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Tổng sự cố phát sinh</div>
              <div className="text-2xl font-black text-rose-600 font-mono">{kpiIncTotal}</div>
              <div className="text-[11px] text-slate-400 mt-1">Toàn bộ biên bản sự cố</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Sự cố đột xuất sát giờ</div>
              <div className="text-2xl font-black text-amber-600 font-mono">{kpiIncEmergency}</div>
              <div className="text-[11px] text-amber-600 font-medium mt-1">Chưa báo trước dưới 2 tiếng</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đối tượng: Giáo viên</div>
              <div className="text-2xl font-black text-purple-700 font-mono">{kpiIncTeacher}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">Nghỉ ốm / Đi muộn / Lỗi mic</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đối tượng: Học sinh</div>
              <div className="text-2xl font-black text-blue-600 font-mono">{kpiIncStudent}</div>
              <div className="text-[11px] text-blue-600 font-medium mt-1">Xin dời ca / Nghỉ có phép</div>
            </div>
          </div>

          {/* BẢNG QUẢN LÝ SỰ CỐ VỚI BỘ LỌC TẠI CỘT */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="workspace-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng dữ liệu có thể cuộn">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  {/* Hàng 1: Tiêu đề cột Tab 2 */}
                  <tr>
                    <th className="py-3.5 px-3 w-20">MÃ BUỔI</th>
                    <th className="py-3.5 px-3 min-w-[200px]">LỚP HỌC</th>
                    <th className="py-3.5 px-3 min-w-[130px]">ĐỐI TƯỢNG</th>
                    <th className="py-3.5 px-3 min-w-[210px]">LOẠI SỰ CỐ CHI TIẾT</th>
                    <th className="py-3.5 px-3 min-w-[110px]">TÍNH CHẤT</th>
                    <th className="py-3.5 px-3 min-w-[160px]">GIÁO VIÊN DẠY THAY</th>
                    <th className="py-3.5 px-3 text-center min-w-[120px]">TIẾN ĐỘ XỬ LÝ</th>
                    <th className="py-3.5 px-3 min-w-[160px] bg-orange-50/40 border-l border-orange-100">
                      <div className="text-[#FF5C00] font-bold">VẬN HÀNH XỬ LÝ</div>
                    </th>
                    <th className="py-3.5 px-3 text-center min-w-[120px]">THAO TÁC</th>
                  </tr>
                  {/* Hàng 2: Bộ lọc trực tiếp từng cột */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterCode}
                        onChange={e => setIncColFilterCode(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterClass}
                        onChange={e => setIncColFilterClass(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterTarget}
                        onChange={e => setIncColFilterTarget(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="GRP-TCH">Giáo viên</option>
                        <option value="GRP-STU">Học sinh</option>
                        <option value="GRP-SYS">Kỹ thuật</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterType}
                        onChange={e => setIncColFilterType(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterUrgency}
                        onChange={e => setIncColFilterUrgency(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="EMERGENCY">Đột xuất</option>
                        <option value="ADVANCED">Báo trước</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterCover}
                        onChange={e => setIncColFilterCover(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterStatus}
                        onChange={e => setIncColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="DA_GIAI_QUYET">Đã giải quyết</option>
                        <option value="DANG_XU_LY">Đang xử lý</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterOps}
                        onChange={e => setIncColFilterOps(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={resetIncColFilters}
                        className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Reset
                      </button>
                    </th>
                  </tr>
                </thead>

                <PaginatedTableBody key={selectedSubjectCode+'-incidents'} className="divide-y divide-slate-100 font-medium">
                  {incidentFilteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-center">
                        <EmptyState title="Không có ca sự cố nào phù hợp với bộ lọc." />
                      </td>
                    </tr>
                  ) : (
                    incidentFilteredSessions.map(s => {
                      const isCompleted = studyStatus(s) === 'DA_HOC';
                      const highlightClass = warningRowClass(s);

                      const parentItems = INCIDENT_MASTER_DATA[s.incidentParent || ''] || [];
                      const childObj = parentItems.find(c => c.code === s.incidentChild);
                      const childName = childObj ? childObj.name : (s.incidentChild || 'Sự cố đang trực ban');

                      return (
                        <tr key={s.sessionCode} className={`transition-colors ${highlightClass}`}>
                          {/* Mã buổi */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 font-mono">
                            {displaySessionCode(s)}
                          </td>

                          {/* Lớp học & Ngày */}
                          <td className="py-3.5 px-3">
                            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 font-mono">
                              {s.classCode}
                            </span>
                            <div className="font-bold text-slate-800 text-xs mt-0.5">{s.className}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {s.sessionDate} &bull; {s.timeSlot}
                            </div>
                          </td>

                          {/* Đối tượng */}
                          <td className="py-3.5 px-3">
                            {s.incidentParent === 'GRP-STU' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                Học sinh
                              </span>
                            ) : s.incidentParent === 'GRP-SYS' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                Kỹ thuật LMS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                                Giáo viên
                              </span>
                            )}
                          </td>

                          {/* Loại sự cố chi tiết */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800">{childName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{s.incidentNote || ''}</div>
                          </td>

                          {/* Tính chất */}
                          <td className="py-3.5 px-3">
                            {s.incidentUrgency === 'EMERGENCY' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                Đột xuất
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-600">
                                Báo trước
                              </span>
                            )}
                          </td>

                          {/* Giáo viên dạy thay */}
                          <td className="py-3.5 px-3">
                            {s.coverTeacher ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-purple-600 text-white">
                                  DẠY THAY
                                </span>
                                <span className="font-bold text-purple-700">{s.coverTeacher}</span>
                                <button
                                  type="button"
                                  onClick={() => setCoverScheduleTeacherName(s.coverTeacher)}
                                  className="text-[10px] text-purple-600 underline font-semibold ml-0.5 cursor-pointer"
                                >
                                  Lịch
                                </button>
                              </div>
                            ) : s.incidentParent !== 'GRP-TCH' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                Không gán Cover
                              </span>
                            ) : isCompleted ? (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60 flex items-center gap-1 w-fit"
                                title="Ca học đã hoàn thành - Khóa điều phối Dạy thay"
                              >
                                <span className="line-through">Chưa gán dạy thay</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Chưa gán Cover
                              </span>
                            )}
                          </td>

                          {/* Tiến độ xử lý */}
                          <td className="py-3.5 px-3 text-center">
                            {s.incidentStatus === 'DA_GIAI_QUYET' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đã giải quyết
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                                Đang xử lý
                              </span>
                            )}
                          </td>

                          {/* Vận hành xử lý */}
                          <td className="py-3.5 px-3 bg-orange-50/20 border-l border-orange-100/60">
                            {s.handledByName || s.handledByOpsId ? (
                              <div>
                                <div className="font-bold text-slate-800 text-[11px]">{s.handledByName || s.handledByOpsId}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {s.handledByOpsId} &bull; {s.handledAt ? /^\d{4}-/.test(s.handledAt) ? new Date(s.handledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : s.handledAt : 'Đã ghi nhận'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa ghi nhận</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3.5 px-3 text-center">
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => openIncidentModal(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] border border-slate-200 transition-all cursor-pointer"
                                title="Ca học đã hoàn thành - Chỉ xem và cập nhật biên bản"
                              >
                                Biên bản
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openIncidentModal(s)}
                                className="px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                              >
                                Xử lý ca
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </PaginatedTableBody>
              </table>
            </div>

            {/* Chú thích chân bảng Tab 2 */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                <span>
                  Khi gán Giáo viên dạy thay, ca học sẽ <strong>tự động nạp vào lịch cá nhân</strong> của Giáo viên đó và cập nhật trạng thái ca.
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Trực ban: <span className="font-bold text-slate-700">{currentOps.name} - {currentOps.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
      {/* ================= MODAL 1: SỔ CA DẠY (READ-ONLY) ================= */}
      {selectedClassViewSession && (() => {
        const cls = classes.find(item => item.code === selectedClassViewSession.classCode);
        const entry = cls && teachingScheduleEntries(cls).find(item => item.time.replace(/\s/g, '') === selectedClassViewSession.timeSlot.replace(/\s/g, '') && item.dayIndex === (new Date(selectedClassViewSession.sessionDate + 'T00:00:00').getDay() + 6) % 7);
        return <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div role="dialog" aria-modal="true" aria-label="Sổ ca dạy và Nhật ký giảng dạy" className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-800">Sổ ca dạy &amp; Nhật ký giảng dạy</h2>
              <button type="button" aria-label="Đóng" onClick={() => setSelectedClassViewSession(null)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            {cls ? <TeachingSessionDetails cls={cls} session={entry?.session || 1} date={selectedClassViewSession.sessionDate} time={selectedClassViewSession.timeSlot} readOnly
              lessonId={selectedClassViewSession.sessionCode} hideWeekNavigation
              onSelect={() => {}}
            /> : <div className="p-6 text-sm text-slate-500">Không còn thông tin lớp học.</div>}
          </div>
        </div>;
      })()}

      {/* ================= MODAL 2: XỬ LÝ SỰ CỐ & ĐIỀU PHỐI COVER (TAB 2) ================= */}
      {selectedIncidentSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-xs font-mono">
                    {displaySessionCode(selectedIncidentSession)}
                  </span>
                  <h3 className="font-bold text-base text-slate-800">
                    Biên bản sự cố ca học
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {selectedIncidentSession.classCode} &bull; {selectedIncidentSession.timeSlot} &bull; {selectedIncidentSession.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncidentSession(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIncidentSubmit} className="mt-4 space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 font-bold text-slate-800">Ca học cần xử lý</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-600">
                  <div>Lớp: <strong className="text-slate-800">{selectedIncidentSession.className} ({selectedIncidentSession.classCode})</strong></div>
                  <div>Ngày: <strong className="text-slate-800">{new Date(`${selectedIncidentSession.sessionDate}T00:00:00`).toLocaleDateString('vi-VN')}</strong></div>
                  <div>Giờ học: <strong className="text-slate-800">{selectedIncidentSession.timeSlot}</strong></div>
                  <div>Giáo viên chính: <strong className="text-slate-800">{selectedIncidentSession.primaryTeacher}</strong></div>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                  Người ghi nhận: <strong className="text-slate-800">{currentOps.name}</strong> ({currentOps.id})
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="font-bold text-slate-800">1. Phân loại sự cố</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Sự cố liên quan đến <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incParent}
                      onChange={e => handleIncParentChange(e.target.value as 'GRP-TCH' | 'GRP-STU' | 'GRP-SYS')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="GRP-TCH">Giáo viên</option>
                      <option value="GRP-STU">Học sinh</option>
                      <option value="GRP-SYS">Kỹ thuật / Hệ thống</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loại sự cố <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incChild}
                      onChange={e => setIncChild(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      {(INCIDENT_MASTER_DATA[incParent] || []).map(item => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-orange-700">
                      Hệ số công áp dụng: {incidents.find(group => group.code === incParent)?.subIncidents.find(item => item.code === incChild)?.creditCoeff ?? 'Chưa thiết lập'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="font-bold text-slate-800">2. Tình trạng và diễn biến xử lý</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời điểm thông báo <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incUrgency}
                      onChange={e => setIncUrgency(e.target.value as 'EMERGENCY' | 'ADVANCED')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="EMERGENCY">Đột xuất, báo trước dưới 2 giờ</option>
                      <option value="ADVANCED">Có báo trước từ 2 giờ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kết quả xử lý <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incStatus}
                      onChange={e => {
                        const nextStatus = e.target.value as 'DA_GIAI_QUYET' | 'DANG_XU_LY' | 'HUY_CA';
                        setIncStatus(nextStatus);
                        if (nextStatus === 'HUY_CA') {
                          setIncHasCover(false);
                          setIncCoverTeacher('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="DANG_XU_LY">Đang xử lý / Chờ đối soát</option>
                      <option value="DA_GIAI_QUYET">Đã giải quyết</option>
                      <option value="HUY_CA">Hủy ca do sự cố (đã giải quyết)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nội dung ghi nhận</label>
                  <textarea
                    rows={3}
                    value={incNote}
                    onChange={e => setIncNote(e.target.value)}
                    placeholder="Ghi ngắn gọn diễn biến, người đã liên hệ và hướng xử lý tiếp theo..."
                    className="w-full resize-y px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </section>

              {/* Khối Điều phối Cover (Dạy thay) - chỉ dành cho Giáo viên */}
              {incParent === 'GRP-TCH' ? (
                selectedIncidentSession.status === 'DA_HOC' || studyStatus(selectedIncidentSession) === 'DA_HOC' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 font-medium">
                    Buổi học này <strong>đã hoàn thành</strong>. Chức năng gán Cover đã được tự động khóa (chỉ cho phép xem và cập nhật biên bản sự cố).
                  </div>
                ) : (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2.5">
                    <div className="font-bold text-purple-900">3. Giáo viên dạy thay</div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={incHasCover}
                        onChange={e => setIncHasCover(e.target.checked)}
                        disabled={incStatus === 'HUY_CA'}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 accent-purple-600"
                      />
                      <span className={`font-bold text-xs ${incStatus === 'HUY_CA' ? 'text-slate-500' : 'text-purple-900'}`}>Chỉ định Giáo viên Dạy thay (Cover) cho ca này</span>
                    </label>

                    {incStatus === 'HUY_CA' ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
                        Ca đã chọn hủy nên không thể phân công giáo viên cover.
                      </div>
                    ) : incHasCover && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-bold text-purple-900 text-[11px]">
                          Chọn giáo viên cùng môn đã đăng ký rảnh đúng ngày và khung giờ:
                        </label>
                        <select
                          value={incCoverTeacher}
                          onChange={e => setIncCoverTeacher(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                        >
                          <option value="">-- Chọn Giáo viên dạy thay --</option>
                          {coverCandidatesForSession(selectedIncidentSession).map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name} - Mã {teacher.id}
                            </option>
                          ))}
                        </select>
                        {coverCandidatesForSession(selectedIncidentSession).length === 0 ? (
                          <div className="text-[10px] text-rose-700">
                            Chưa có giáo viên đủ điều kiện. Giáo viên cần đăng ký rảnh đúng ca và không bị trùng lịch.
                          </div>
                        ) : (
                          <div className="text-[10px] text-purple-700">
                            Chỉ ca ngày {new Date(`${selectedIncidentSession.sessionDate}T00:00:00`).toLocaleDateString('vi-VN')} được thêm vào lịch cover; link phòng và học liệu lấy từ lớp này.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl text-[11px] text-slate-500">
                  Sự cố do <strong>{incParent === 'GRP-STU' ? 'Học sinh' : 'Kỹ thuật'}</strong> không kích hoạt nghiệp vụ Giáo viên dạy thay (Cover).
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedIncidentSession(null)}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingIncident || businessStatus.saving}
                  aria-busy={savingIncident}
                  className="px-6 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold transition-all cursor-pointer shadow-xs"
                >
                  Lưu Biên bản &amp; Tự động gán người xử lý
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: XEM LỊCH CÁ NHÂN CỦA GV COVER ================= */}
      {coverScheduleTeacherName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Thời khóa biểu cá nhân: {coverScheduleTeacherName}
                </h3>
                <p className="text-[10px] text-slate-400">Kiểm tra ca dạy đã tự động được nạp vào lịch</p>
              </div>
              <button
                type="button"
                onClick={() => setCoverScheduleTeacherName(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <PaginatedList className="mt-3.5 space-y-2.5 max-h-72 overflow-y-auto">
              {sessions.filter(s => s.coverTeacher === coverScheduleTeacherName || s.primaryTeacher === coverScheduleTeacherName).length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 text-center rounded-xl">Chưa có ca học nào trong ngày.</div>
              ) : (
                sessions
                  .filter(s => s.coverTeacher === coverScheduleTeacherName || s.primaryTeacher === coverScheduleTeacherName)
                  .map(s => {
                    const isCover = s.coverTeacher === coverScheduleTeacherName;
                    return (
                      <div
                        key={s.sessionCode}
                        className={`p-3 rounded-2xl border ${isCover ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'} flex items-center justify-between`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs font-mono">{displaySessionCode(s)} &bull; {s.classCode}</span>
                            {isCover ? (
                              <span className="px-2 py-0.5 rounded font-bold bg-purple-600 text-white text-[10px]">Ca Dạy Thay</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-700 text-[10px]">Ca Đứng Chính</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 font-semibold mt-1">{s.className}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.timeSlot} &bull; Phòng: {s.room}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 block">Đã nạp vào lịch</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Sẵn sàng giảng dạy</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </PaginatedList>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCoverScheduleTeacherName(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: MÔ PHỎNG GIÁO VIÊN VÀO LỚP ================= */}
      {isCheckinSimOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="font-bold text-sm text-slate-800">
                Mô phỏng: Giáo viên ấn nút "Vào lớp"
              </div>
              <button
                type="button"
                onClick={() => setIsCheckinSimOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-slate-500">
                Hệ thống đối chiếu mốc giờ ấn <strong>Vào lớp</strong> với giờ bắt đầu ca để tự động ghi nhận Chuyên cần:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn ca học muốn mô phỏng:</label>
                <select
                  value={simSessionCode}
                  onChange={e => setSimSessionCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                >
                  {sessions.map(s => (
                    <option key={s.sessionCode} value={s.sessionCode}>
                      {displaySessionCode(s)}: {s.classCode} ({s.timeSlot})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerSimulateCheckin('ON_TIME')}
                  className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors text-left cursor-pointer"
                >
                  <span className="block">Bấm Đúng Giờ</span>
                  <span className="block text-[10px] text-emerald-600 font-mono mt-0.5">Vào lúc 17:55:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulateCheckin('LATE')}
                  className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition-colors text-left cursor-pointer"
                >
                  <span className="block">Bấm Đi Muộn</span>
                  <span className="block text-[10px] text-amber-600 font-mono mt-0.5">Vào trễ lúc 18:08:30</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCheckinSimOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BỘ LỌC CỘT BÊN PHẢI (SLIDE-OVER DRAWER) CHO GIÁM SÁT VẬN HÀNH */}
      <FilterDrawer
        isOpen={isTimeFilterOpen}
        onClose={() => setIsTimeFilterOpen(false)}
        title="Bộ lọc giám sát ca"
        subtitle="Lọc theo lớp, khối, trình độ và khung giờ"
        activeCount={[
          Boolean(filterCategory !== 'ALL'),
          Boolean(filterGrade !== 'ALL'),
          Boolean(filterLevel !== 'ALL'),
          Boolean(colFilterTime !== 'ALL')
        ].filter(Boolean).length}
        onReset={() => {
          setColFilterTime('ALL');
          setFilterCategory('ALL');
          setFilterGrade('ALL');
          setFilterLevel('ALL');
        }}
        onApply={() => setIsTimeFilterOpen(false)}
      >
        <div className="space-y-5 text-xs">


          <section className="space-y-3">
            <div className="font-semibold text-slate-800">Thông tin lớp</div>
            <label className="block font-medium text-slate-600">Loại lớp
              <select value={filterCategory} onChange={event => setFilterCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">
                <option value="ALL">Tất cả loại lớp</option>
                {teachingCategories.filter(category => category.status !== false).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="block font-medium text-slate-600">Môn học
              <select value={selectedSubjectCode} onChange={event => selectMonitoringSubject(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">
                {subjects.filter(subject => subject.status !== false).map(subject => <option key={subject.code} value={subject.code}>{subject.name}</option>)}
              </select>
            </label>
            <label className="block font-medium text-slate-600">Khối / lớp
              <select value={filterGrade} onChange={event => setFilterGrade(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">
                <option value="ALL">Tất cả khối / lớp</option>
                {Array.from(new Map(teachingCategories.flatMap(category => category.options.map(option => [option.id, option.label] as const))).entries()).map(([gradeId, gradeLabel]) => <option key={gradeId} value={gradeId}>{gradeLabel}</option>)}
              </select>
            </label>
            <label className="block font-medium text-slate-600">Trình độ
              <select value={filterLevel} onChange={event => setFilterLevel(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">
                <option value="ALL">Tất cả trình độ</option>
                {levels.filter(level => level.status !== false).map(level => <option key={level.code} value={level.code}>{level.name}</option>)}
              </select>
            </label>
            <label className="block font-medium text-slate-600">Khung giờ
              <select value={colFilterTime} onChange={event => setColFilterTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800">
                <option value="ALL">Tất cả khung giờ</option>
                {Array.from(new Set(sessions.map(session => session.timeSlot))).map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
          </section>
        </div>
      </FilterDrawer>

    </div>
  );
};
