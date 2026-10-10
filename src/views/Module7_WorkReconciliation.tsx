import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  Download,
  Printer,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  Edit3,
  MessageSquare,
  Sparkles,
  FileSpreadsheet,
  X,
  FileCheck,
  AlertTriangle,
  UserCheck,
  Paperclip,
  Calendar,
  Share2,
  Send
} from 'lucide-react';
import { SessionPayrollRecord, DisputeItem } from '../types';
import { ColumnFilter } from '../components/ColumnFilter';
import { FilterDrawer } from '../components/FilterDrawer';
import { getCurrentPayrollMonth, getPayrollMonthOptions } from '../lib/payrollPeriods';

type SummaryRangeKey = 'standardSessions' | 'incidentSessions' | 'standardCredit' | 'incidentCredit' | 'totalCredit';
type SessionRangeKey = 'studentCount' | 'durationMinutes' | 'creditCoeff';
type NumericRange = { min: string; max: string };
type SessionClassification = 'ALL' | 'STANDARD' | 'INCIDENT';
type SessionWithStaff = { teacherId: string; teacherName: string; staffRole: 'GIAO_VIEN' | 'GIA_SU'; subject: string; session: SessionPayrollRecord };

const isIncidentSession = (session: SessionPayrollRecord) =>
  session.type !== 'STANDARD' && session.type !== 'COVER';

const getCreditBreakdown = (sessions: SessionPayrollRecord[]) => sessions.reduce(
  (totals, session) => {
    if (isIncidentSession(session)) totals.incidentCredit += session.creditCoeff;
    else totals.standardCredit += session.creditCoeff;
    return totals;
  },
  { standardCredit: 0, incidentCredit: 0 }
);

const getSessionStudentNames = (session: SessionPayrollRecord) =>
  session.studentNames?.length ? session.studentNames.join(', ') : session.studentName;

export const Module7_WorkReconciliation: React.FC = () => {
  const {
    payrollStore,
    updateSessionCredit,
    sendPayrollToTeachers,
    reviewDispute,
    lockPayrollMonth,
    unlockPayrollMonth,
    showToast
  } = useApp();

  // State bộ lọc
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentPayrollMonth());
  const payrollMonthOptions = getPayrollMonthOptions();
  const [activeTab, setActiveTab] = useState<'summary' | 'sessions' | 'disputes'>('summary');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'ALL' | 'GIAO_VIEN' | 'GIA_SU'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [payrollSentFilter, setPayrollSentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [staffIdFilter, setStaffIdFilter] = useState('');
  const [staffNameFilter, setStaffNameFilter] = useState('');
  const [summaryRanges, setSummaryRanges] = useState<Record<SummaryRangeKey, NumericRange>>({
    standardSessions: { min: '', max: '' },
    incidentSessions: { min: '', max: '' },
    standardCredit: { min: '', max: '' },
    incidentCredit: { min: '', max: '' },
    totalCredit: { min: '', max: '' }
  });
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [sessionDateFrom, setSessionDateFrom] = useState('');
  const [sessionDateTo, setSessionDateTo] = useState('');
  const [sessionTimeFilter, setSessionTimeFilter] = useState('');
  const [sessionClassFilter, setSessionClassFilter] = useState('');
  const [sessionStudentFilter, setSessionStudentFilter] = useState('');
  const [sessionModelFilter, setSessionModelFilter] = useState('');
  const [sessionCheckinFilter, setSessionCheckinFilter] = useState('');
  const [sessionCheckoutFilter, setSessionCheckoutFilter] = useState('');
  const [sessionClassificationFilter, setSessionClassificationFilter] = useState<SessionClassification>('ALL');
  const [sessionReconcileFilter, setSessionReconcileFilter] = useState('ALL');
  const [sessionNoteFilter, setSessionNoteFilter] = useState('');
  const [sessionRanges, setSessionRanges] = useState<Record<SessionRangeKey, NumericRange>>({
    studentCount: { min: '', max: '' },
    durationMinutes: { min: '', max: '' },
    creditCoeff: { min: '', max: '' }
  });
  const [disputeIdFilter, setDisputeIdFilter] = useState('');
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('ALL');
  const [disputeTypeFilter, setDisputeTypeFilter] = useState('');
  const [disputeSessionFilter, setDisputeSessionFilter] = useState('');
  const [disputeContentFilter, setDisputeContentFilter] = useState('');
  const [disputeAdminNoteFilter, setDisputeAdminNoteFilter] = useState('');
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  // Modals
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<{ teacherId: string; session: SessionPayrollRecord } | null>(null);
  const [viewingSession, setViewingSession] = useState<SessionWithStaff | null>(null);
  const [newCoeff, setNewCoeff] = useState<number>(1.0);
  const [editNote, setEditNote] = useState<string>('');
  const [reviewingDispute, setReviewingDispute] = useState<DisputeItem | null>(null);
  const [disputeAdminNote, setDisputeAdminNote] = useState<string>('');
  const [disputeDecision, setDisputeDecision] = useState<'DA_DUYET' | 'TU_CHOI'>('DA_DUYET');
  const [disputeCreditCoeff, setDisputeCreditCoeff] = useState(0);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const highlightSessionRow = (sessionId: string) => {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    setHighlightedSessionId(sessionId);
    highlightTimer.current = window.setTimeout(() => {
      setHighlightedSessionId(null);
      highlightTimer.current = null;
    }, 2600);
  };

  useEffect(() => () => {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
  }, []);

  const matchesRange = (value: number, range: NumericRange) =>
    (!range.min || value >= Number(range.min)) && (!range.max || value <= Number(range.max));
  const renderRangeFilter = (label: string, range: NumericRange, onChange: (range: NumericRange) => void, step = '1') => (
    <fieldset>
      <legend className="mb-1 font-bold text-slate-700">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-slate-500">Từ
          <input type="number" min="0" step={step} value={range.min} onChange={event => onChange({ ...range, min: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700" />
        </label>
        <label className="text-slate-500">Đến
          <input type="number" min="0" step={step} value={range.max} onChange={event => onChange({ ...range, max: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700" />
        </label>
      </div>
    </fieldset>
  );
  const columnTextFilter = (label: string, value: string, onChange: (value: string) => void) => (
    <ColumnFilter label={label} active={Boolean(value.trim())} onReset={() => onChange('')}>
      <input
        aria-label={`Lọc ${label}`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={`Tìm ${label.toLocaleLowerCase('vi')}`}
        className="w-full rounded-lg border border-slate-200 p-2"
      />
    </ColumnFilter>
  );
  const columnSelectFilter = (label: string, value: string, onChange: (value: string) => void, options: Array<{ value: string; label: string }>) => (
    <ColumnFilter label={label} active={value !== 'ALL'} onReset={() => onChange('ALL')}>
      <select aria-label={`Lọc ${label}`} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2">
        <option value="ALL">Tất cả</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </ColumnFilter>
  );
  const columnRangeFilter = (label: string, range: NumericRange, onChange: (range: NumericRange) => void, step = '1') => (
    <ColumnFilter label={label} active={Boolean(range.min || range.max)} onReset={() => onChange({ min: '', max: '' })}>
      {renderRangeFilter(label, range, onChange, step)}
    </ColumnFilter>
  );

  // Lấy dữ liệu kỳ
  const monthData = payrollStore[selectedMonth] || {
    isLocked: false,
    adminSentNotice: true,
    teachers: [],
    disputes: []
  };

  // Danh sách giáo viên & gia sư sau khi lọc
  const filteredStaff = useMemo(() => {
    return (monthData.teachers || []).filter(t => {
      if (staffTypeFilter !== 'ALL' && (t.staffRole || 'GIAO_VIEN') !== staffTypeFilter) return false;
      if (subjectFilter !== 'ALL' && t.subject !== subjectFilter) return false;
      if (statusFilter !== 'ALL' && t.reconcileStatus !== statusFilter) return false;
      if (payrollSentFilter !== 'ALL' && String(Boolean(t.payrollSent)) !== payrollSentFilter) return false;
      if (staffIdFilter && !t.teacherId.toLocaleLowerCase('vi').includes(staffIdFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (staffNameFilter && !t.teacherName.toLocaleLowerCase('vi').includes(staffNameFilter.trim().toLocaleLowerCase('vi'))) return false;
      const sessions = t.sessions || [];
      const { standardCredit, incidentCredit } = getCreditBreakdown(t.sessions || []);
      const totalCredit = standardCredit + incidentCredit;
      const standardSessions = sessions.filter(session => !isIncidentSession(session)).length;
      const incidentSessions = sessions.filter(isIncidentSession).length;
      const summaryMetrics: Record<SummaryRangeKey, number> = {
        standardSessions,
        incidentSessions,
        standardCredit,
        incidentCredit,
        totalCredit
      };
      if (Object.entries(summaryRanges).some(([key, range]) => !matchesRange(summaryMetrics[key as SummaryRangeKey], range))) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = t.teacherName.toLowerCase().includes(term);
        const matchId = t.teacherId.toLowerCase().includes(term);
        return matchName || matchId;
      }
      return true;
    });
  }, [monthData.teachers, staffTypeFilter, subjectFilter, statusFilter, payrollSentFilter, staffIdFilter, staffNameFilter, summaryRanges, searchTerm]);

  // Toàn bộ buổi học trong kỳ
  const allSessionsWithStaff = useMemo(() => {
    const list: SessionWithStaff[] = [];
    (monthData.teachers || []).forEach(t => {
      (t.sessions || []).forEach(s => {
        list.push({
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          staffRole: t.staffRole || 'GIAO_VIEN',
          subject: t.subject,
          session: s
        });
      });
    });
    return list;
  }, [monthData.teachers]);

  // Buổi học sau khi lọc
  const filteredSessions = useMemo(() => {
    return allSessionsWithStaff.filter(item => {
      if (staffTypeFilter !== 'ALL' && item.staffRole !== staffTypeFilter) return false;
      const sessionDate = item.session.date;
      if (staffIdFilter && !item.teacherId.toLocaleLowerCase('vi').includes(staffIdFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (staffNameFilter && !item.teacherName.toLocaleLowerCase('vi').includes(staffNameFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionIdFilter && !item.session.id.toLocaleLowerCase('vi').includes(sessionIdFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionDateFrom && sessionDate < sessionDateFrom) return false;
      if (sessionDateTo && sessionDate > sessionDateTo) return false;
      if (sessionTimeFilter && !`${item.session.dayOfWeek} ${item.session.time}`.toLocaleLowerCase('vi').includes(sessionTimeFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionClassFilter && !`${item.session.classCode} ${item.session.className}`.toLocaleLowerCase('vi').includes(sessionClassFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionStudentFilter && !getSessionStudentNames(item.session).toLocaleLowerCase('vi').includes(sessionStudentFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionModelFilter && !(item.session.model || '1-3').toLocaleLowerCase('vi').includes(sessionModelFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionCheckinFilter && !item.session.checkin.toLocaleLowerCase('vi').includes(sessionCheckinFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionCheckoutFilter && !item.session.checkout.toLocaleLowerCase('vi').includes(sessionCheckoutFilter.trim().toLocaleLowerCase('vi'))) return false;
      if (sessionClassificationFilter === 'STANDARD' && isIncidentSession(item.session)) return false;
      if (sessionClassificationFilter === 'INCIDENT' && !isIncidentSession(item.session)) return false;
      if (sessionReconcileFilter !== 'ALL' && item.session.reconcileStatus !== sessionReconcileFilter) return false;
      if (sessionNoteFilter && !item.session.hrPayNote.toLocaleLowerCase('vi').includes(sessionNoteFilter.trim().toLocaleLowerCase('vi'))) return false;
      const sessionMetrics: Record<SessionRangeKey, number> = {
        studentCount: item.session.studentCount ?? 3,
        durationMinutes: item.session.durationMinutes ?? 90,
        creditCoeff: item.session.creditCoeff
      };
      if (Object.entries(sessionRanges).some(([key, range]) => !matchesRange(sessionMetrics[key as SessionRangeKey], range))) return false;
      if (subjectFilter !== 'ALL' && item.subject !== subjectFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchStaff = item.teacherName.toLowerCase().includes(term);
        const matchClass = item.session.classCode.toLowerCase().includes(term);
        const matchStudent = getSessionStudentNames(item.session).toLowerCase().includes(term);
        const matchId = item.session.id.toLowerCase().includes(term);
        return matchStaff || matchClass || matchStudent || matchId;
      }
      return true;
    });
  }, [
    allSessionsWithStaff, staffTypeFilter, subjectFilter, staffIdFilter, staffNameFilter, sessionIdFilter,
    sessionDateFrom, sessionDateTo, sessionTimeFilter, sessionClassFilter, sessionStudentFilter, sessionModelFilter,
    sessionCheckinFilter, sessionCheckoutFilter, sessionClassificationFilter, sessionReconcileFilter, sessionNoteFilter,
    sessionRanges, searchTerm
  ]);

  const filteredDisputes = useMemo(() => (monthData.disputes || []).filter(dispute => {
    if (staffTypeFilter !== 'ALL' && dispute.staffRole !== staffTypeFilter) return false;
    if (subjectFilter !== 'ALL' && dispute.subject !== subjectFilter) return false;
    if (disputeIdFilter && !dispute.id.toLocaleLowerCase('vi').includes(disputeIdFilter.trim().toLocaleLowerCase('vi'))) return false;
    if (disputeStatusFilter !== 'ALL' && dispute.status !== disputeStatusFilter) return false;
    if (disputeTypeFilter && !dispute.incidentType.toLocaleLowerCase('vi').includes(disputeTypeFilter.trim().toLocaleLowerCase('vi'))) return false;
    if (disputeSessionFilter && !`${dispute.sessionId || ''} ${dispute.classCode || ''} ${dispute.teacherName || ''}`.toLocaleLowerCase('vi').includes(disputeSessionFilter.trim().toLocaleLowerCase('vi'))) return false;
    if (disputeContentFilter && !dispute.content.toLocaleLowerCase('vi').includes(disputeContentFilter.trim().toLocaleLowerCase('vi'))) return false;
    if (disputeAdminNoteFilter && !(dispute.adminNote || '').toLocaleLowerCase('vi').includes(disputeAdminNoteFilter.trim().toLocaleLowerCase('vi'))) return false;
    return true;
  }).sort((left, right) => Number(right.status === 'CHO_DUYET') - Number(left.status === 'CHO_DUYET')), [
    monthData.disputes, staffTypeFilter, subjectFilter, disputeIdFilter, disputeStatusFilter,
    disputeTypeFilter, disputeSessionFilter, disputeContentFilter, disputeAdminNoteFilter
  ]);

  const activeFilterCount = (activeTab === 'summary'
    ? [
        staffTypeFilter !== 'ALL', subjectFilter !== 'ALL', statusFilter !== 'ALL', payrollSentFilter !== 'ALL',
        staffIdFilter.trim().length > 0, staffNameFilter.trim().length > 0, searchTerm.trim().length > 0,
        ...Object.values(summaryRanges).flatMap(range => [range.min.length > 0, range.max.length > 0])
      ]
    : activeTab === 'sessions'
    ? [
        staffTypeFilter !== 'ALL', subjectFilter !== 'ALL', staffIdFilter.trim().length > 0, staffNameFilter.trim().length > 0,
        sessionIdFilter.trim().length > 0, sessionDateFrom.length > 0, sessionDateTo.length > 0, sessionTimeFilter.trim().length > 0, sessionClassFilter.trim().length > 0,
        sessionStudentFilter.trim().length > 0, sessionModelFilter.trim().length > 0, sessionCheckinFilter.trim().length > 0,
        sessionCheckoutFilter.trim().length > 0, sessionClassificationFilter !== 'ALL', sessionReconcileFilter !== 'ALL',
        sessionNoteFilter.trim().length > 0, searchTerm.trim().length > 0,
        ...Object.values(sessionRanges).flatMap(range => [range.min.length > 0, range.max.length > 0])
      ]
    : [
        staffTypeFilter !== 'ALL', subjectFilter !== 'ALL', disputeIdFilter.trim().length > 0, disputeStatusFilter !== 'ALL',
        disputeTypeFilter.trim().length > 0, disputeSessionFilter.trim().length > 0, disputeContentFilter.trim().length > 0,
        disputeAdminNoteFilter.trim().length > 0
      ]
  ).filter(Boolean).length;

  const resetFilters = () => {
    setStaffTypeFilter('ALL');
    setSubjectFilter('ALL');
    setStatusFilter('ALL');
    setPayrollSentFilter('ALL');
    setSearchTerm('');
    setStaffIdFilter('');
    setStaffNameFilter('');
    setSummaryRanges({
      standardSessions: { min: '', max: '' },
      incidentSessions: { min: '', max: '' },
      standardCredit: { min: '', max: '' },
      incidentCredit: { min: '', max: '' },
      totalCredit: { min: '', max: '' }
    });
    setSessionIdFilter('');
    setSessionDateFrom('');
    setSessionDateTo('');
    setSessionTimeFilter('');
    setSessionClassFilter('');
    setSessionStudentFilter('');
    setSessionModelFilter('');
    setSessionCheckinFilter('');
    setSessionCheckoutFilter('');
    setSessionClassificationFilter('ALL');
    setSessionReconcileFilter('ALL');
    setSessionNoteFilter('');
    setSessionRanges({
      studentCount: { min: '', max: '' },
      durationMinutes: { min: '', max: '' },
      creditCoeff: { min: '', max: '' }
    });
    setDisputeIdFilter('');
    setDisputeStatusFilter('ALL');
    setDisputeTypeFilter('');
    setDisputeSessionFilter('');
    setDisputeContentFilter('');
    setDisputeAdminNoteFilter('');
  };

  // Thống kê KPI tổng thể
  const stats = useMemo(() => {
    let totalSessions = 0;
    let totalCredit = 0;
    let teacherCredit = 0;
    let tutorCredit = 0;
    let coverCount = 0;
    let incidentCount = 0;

    (monthData.teachers || []).forEach(t => {
      const isTutor = (t.staffRole || 'GIAO_VIEN') === 'GIA_SU';
      (t.sessions || []).forEach(s => {
        totalSessions += 1;
        totalCredit += s.creditCoeff;
        if (isTutor) tutorCredit += s.creditCoeff;
        else teacherCredit += s.creditCoeff;
        if (s.type === 'COVER') coverCount += 1;
        if (isIncidentSession(s)) incidentCount += 1;
      });
    });

    const pendingDisputes = (monthData.disputes || []).filter(d => d.status === 'CHO_DUYET').length;

    return {
      totalSessions,
      totalCredit: Number(totalCredit.toFixed(1)),
      teacherCredit: Number(teacherCredit.toFixed(1)),
      tutorCredit: Number(tutorCredit.toFixed(1)),
      coverCount,
      incidentCount,
      pendingDisputes,
      staffCount: (monthData.teachers || []).length
    };
  }, [monthData]);

  // Hàm xuất CSV / Excel UTF-8 kèm BOM
  const handleDownloadCsv = () => {
    const headers = [
      'STT',
      'Mã nhân sự',
      'Họ và tên',
      'Phân loại nhân sự',
      'Môn học',
      'Mã buổi học',
      'Ngày dạy',
      'Thứ',
      'Khung giờ',
      'Mã lớp',
      'Tên lớp',
      'Học sinh / Nhóm',
      'Mô hình',
      'Sĩ số thực tế',
      'Check-in',
      'Check-out',
      'Thời lượng (phút)',
      'Trạng thái buổi học',
      'Hệ số công',
      'Số công tính',
      'Ghi chú đối soát',
      'Trạng thái đối soát'
    ];

    const rows = filteredSessions.map((item, index) => [
      index + 1,
      item.teacherId,
      `"${item.teacherName}"`,
      item.staffRole === 'GIA_SU' ? 'Gia sư' : 'Giáo viên',
      item.session.classCode.startsWith('ENG') ? 'Tiếng Anh' : 'Toán',
      item.session.id,
      item.session.dateStr,
      item.session.dayOfWeek,
      `"${item.session.time}"`,
      item.session.classCode,
      `"${item.session.className}"`,
      `"${getSessionStudentNames(item.session)}"`,
      item.session.model || '1-3',
      item.session.studentCount ?? 3,
      `"${item.session.checkin}"`,
      `"${item.session.checkout}"`,
      item.session.durationMinutes ?? 90,
      `"${item.session.statusText}"`,
      item.session.creditCoeff,
      item.session.creditCoeff,
      `"${item.session.hrPayNote}"`,
      item.session.reconcileStatus === 'DA_XAC_NHAN' ? 'Đã xác nhận' : 'Chờ đối soát'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_doi_soat_cong_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất file đối soát công kỳ ${selectedMonth} thành công để gửi bộ phận tính công!`, 'success');
  };

  // Lưu điều chỉnh hệ số công
  const handleSaveCoeff = () => {
    if (!editingSession) return;
    updateSessionCredit(selectedMonth, editingSession.teacherId, editingSession.session.id, newCoeff, editNote);
    highlightSessionRow(editingSession.session.id);
    setEditingSession(null);
  };

  const closeSessionDetails = () => {
    if (viewingSession) highlightSessionRow(viewingSession.session.id);
    setViewingSession(null);
  };

  const closeSessionEditor = () => {
    if (editingSession) highlightSessionRow(editingSession.session.id);
    setEditingSession(null);
  };

  // Xử lý duyệt giải trình
  const handleApproveDispute = (status: 'DA_DUYET' | 'TU_CHOI') => {
    if (!reviewingDispute) return;
    reviewDispute(selectedMonth, reviewingDispute.id, status, disputeAdminNote, disputeCreditCoeff);
    setReviewingDispute(null);
    setDisputeAdminNote('');
    setDisputeDecision('DA_DUYET');
  };

  const sendSelectedPayrolls = () => {
    sendPayrollToTeachers(selectedMonth, selectedTeacherIds);
    setSelectedTeacherIds([]);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(previous =>
      previous.includes(teacherId)
        ? previous.filter(id => id !== teacherId)
        : [...previous, teacherId]
    );
  };

  const sendableTeacherIds = filteredStaff
    .filter(teacher =>
      !teacher.payrollSent &&
      !monthData.isLocked
    )
    .map(teacher => teacher.teacherId);

  const toggleVisibleTeacherSelection = () => {
    setSelectedTeacherIds(previous => {
      const allVisibleSelected = sendableTeacherIds.length > 0 &&
        sendableTeacherIds.every(id => previous.includes(id));
      return allVisibleSelected
        ? previous.filter(id => !sendableTeacherIds.includes(id))
        : [...new Set([...previous, ...sendableTeacherIds])];
    });
  };

  const openDisputeReview = (dispute: DisputeItem) => {
    setReviewingDispute(dispute);
    setDisputeAdminNote(dispute.adminNote || '');
    setDisputeDecision(dispute.status === 'TU_CHOI' ? 'TU_CHOI' : 'DA_DUYET');
    const session = monthData.teachers
      .find(teacher => teacher.teacherId === dispute.teacherId)
      ?.sessions.find(payrollSession => payrollSession.id === dispute.sessionId);
    setDisputeCreditCoeff(session?.creditCoeff ?? 0);
  };

  return (
    <div className="space-y-6">
      {/* Banner Tiêu đề Phân hệ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Đối Soát Công Buổi Dạy</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm tra, nghiệm thu và đối soát từng buổi học, số công thực tế của Giáo viên &amp; Gia sư; sẵn sàng xuất dữ liệu gửi bộ phận tính công (không có thù lao).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500">Năm học</span>
            <select
              value={selectedSchoolYear}
              onChange={e => setSelectedSchoolYear(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="2026 - 2027">2026 - 2027</option>
              <option value="2025 - 2026">2025 - 2026</option>
            </select>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              {payrollMonthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            </div>
          </div>

          {/* Nút Xuất Excel gửi bộ phận tính công */}
          <button
            onClick={() => setShowExportModal(true)}
            title="Xuất Excel gửi bộ phận tính công"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút In biên bản đối soát */}
          <button
            onClick={() => setShowPrintModal(true)}
            title="In biên bản đối soát"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In biên bản</span>
          </button>

          {/* Nút Khóa / Mở kỳ */}
          {monthData.isLocked ? (
            <button
              onClick={() => unlockPayrollMonth(selectedMonth, 'Mở khóa để điều chỉnh nghiệp vụ')}
              title="Mở khóa kỳ đối soát"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-lg border border-amber-300 transition-colors cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở khóa kỳ</span>
            </button>
          ) : (
            <button
              onClick={() => lockPayrollMonth(selectedMonth)}
              title="Khóa kỳ và chốt gửi tính công"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Chốt kỳ</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Chỉ số buổi học và công giảng dạy (Không thù lao) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng số buổi dạy</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Buổi trong kỳ đối soát</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase">Tổng công quy đổi</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.totalCredit}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Công chuẩn ghi nhận</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-blue-700 uppercase">Công Giáo Viên</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats.teacherCredit}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Lớp chuẩn &amp; nâng cao</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-purple-700 uppercase">Công Gia Sư</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats.tutorCredit}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Kèm 1-1 &amp; nhóm 1-3</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700 uppercase">Buổi dạy thay / Sự cố</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats.coverCount} <span className="text-xs font-normal text-slate-500">/ {stats.incidentCount}</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">Dạy thay / Điều chỉnh</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tình trạng kỳ</div>
          <div className="mt-1 flex items-center gap-1.5">
            {monthData.isLocked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                <Lock className="w-3 h-3" /> Đã chốt gửi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Đang đối soát
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.pendingDisputes > 0 ? (
              <span className="text-rose-500 font-semibold">{stats.pendingDisputes} đơn chờ duyệt</span>
            ) : (
              'Không có vướng mắc'
            )}
          </div>
        </div>
      </div>

      {/* Tabs Chuyển đổi màn hình */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 px-3 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('summary')}
            className={`shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'border-[#FF5C00] text-[#E05200]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Tổng hợp công theo nhân sự (GV &amp; Gia sư)</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
              {filteredStaff.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'sessions'
                ? 'border-[#FF5C00] text-[#E05200]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chi tiết từng buổi học &amp; Chốt công</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
              {filteredSessions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'disputes'
                ? 'border-[#FF5C00] text-[#E05200]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Xử lý giải trình &amp; Khiếu nại công</span>
            {stats.pendingDisputes > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {stats.pendingDisputes}
              </span>
            )}
          </button>
        </div>

        {/* Thanh công cụ lọc */}
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {activeTab === 'summary'
              ? `${filteredStaff.length} nhân sự`
              : activeTab === 'sessions'
              ? `${filteredSessions.length} buổi học`
              : `${filteredDisputes.length} đơn giải trình`}
          </span>
          <div className="flex items-center gap-2">
            {activeTab === 'summary' && selectedTeacherIds.length > 0 && (
              <button
                type="button"
                onClick={sendSelectedPayrolls}
                disabled={monthData.isLocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Gửi đã chọn ({selectedTeacherIds.length})
              </button>
            )}
            {activeTab === 'summary' && sendableTeacherIds.length > 0 && (
              <button
                type="button"
                onClick={() => sendPayrollToTeachers(selectedMonth, sendableTeacherIds)}
                disabled={monthData.isLocked}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Gửi tất cả GV chưa gửi ({sendableTeacherIds.length})
              </button>
            )}
            {activeTab === 'disputes' && (
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Filter className="h-3.5 w-3.5" />
                Lọc đơn
                {activeFilterCount > 0 && <span className="rounded-full bg-[#FF5C00] px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
              </button>
            )}
            {activeFilterCount > 0 && (
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-[#E05200] hover:underline">
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Nội dung Tab 1: Tổng hợp công theo nhân sự */}
        {activeTab === 'summary' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả giáo viên chưa gửi"
                      checked={sendableTeacherIds.length > 0 && sendableTeacherIds.every(id => selectedTeacherIds.includes(id))}
                      disabled={sendableTeacherIds.length === 0}
                      onChange={toggleVisibleTeacherSelection}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600 disabled:opacity-40"
                    />
                  </th>
                  <th className="py-3 px-3">{columnTextFilter('Mã nhân sự', staffIdFilter, setStaffIdFilter)}</th>
                  <th className="py-3 px-3">{columnTextFilter('Họ và tên', staffNameFilter, setStaffNameFilter)}</th>
                  <th className="py-3 px-3">{columnSelectFilter('Phân loại', staffTypeFilter, value => setStaffTypeFilter(value as typeof staffTypeFilter), [{ value: 'GIAO_VIEN', label: 'Giáo viên' }])}</th>
                  <th className="py-3 px-3">{columnSelectFilter('Chuyên trách', subjectFilter, setSubjectFilter, [{ value: 'TOAN', label: 'Toán' }, { value: 'ANH', label: 'Tiếng Anh' }])}</th>
                  <th className="py-3 px-3 text-center">{columnRangeFilter('Buổi chuẩn', summaryRanges.standardSessions, range => setSummaryRanges(previous => ({ ...previous, standardSessions: range })))}</th>
                  <th className="py-3 px-3 text-center">{columnRangeFilter('Buổi sự cố', summaryRanges.incidentSessions, range => setSummaryRanges(previous => ({ ...previous, incidentSessions: range })))}</th>
                  <th className="py-3 px-3 text-center">{columnRangeFilter('Công buổi chuẩn', summaryRanges.standardCredit, range => setSummaryRanges(previous => ({ ...previous, standardCredit: range })), '0.1')}</th>
                  <th className="py-3 px-3 text-center">{columnRangeFilter('Công buổi sự cố', summaryRanges.incidentCredit, range => setSummaryRanges(previous => ({ ...previous, incidentCredit: range })), '0.1')}</th>
                  <th className="py-3 px-3 text-right">{columnRangeFilter('Tổng công', summaryRanges.totalCredit, range => setSummaryRanges(previous => ({ ...previous, totalCredit: range })), '0.1')}</th>
                  <th className="py-3 px-3 text-center">{columnSelectFilter('Trạng thái gửi', payrollSentFilter, setPayrollSentFilter, [{ value: 'true', label: 'Đã gửi' }, { value: 'false', label: 'Chưa gửi' }])}</th>
                  <th className="py-3 px-3 text-center">{columnSelectFilter('Trạng thái đối soát', statusFilter, setStatusFilter, [{ value: 'CHO_GUI', label: 'Chờ gửi đối soát' }, { value: 'DA_GUI', label: 'Đã gửi nhân sự' }, { value: 'CO_GIAI_TRINH', label: 'Có giải trình' }, { value: 'DA_XU_LY_GT', label: 'Đã xử lý giải trình' }, { value: 'DA_CHOT', label: 'Đã chốt công' }])}</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(t => {
                  const standardSessionCount = (t.sessions || []).filter(session => !isIncidentSession(session)).length;
                  const incidentSessionCount = (t.sessions || []).filter(isIncidentSession).length;
                  const { standardCredit, incidentCredit } = getCreditBreakdown(t.sessions || []);
                  const totalCredit = standardCredit + incidentCredit;

                  return (
                    <tr key={t.teacherId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center">
                        {!t.payrollSent && !monthData.isLocked && (
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${t.teacherName} để gửi đối soát`}
                            checked={selectedTeacherIds.includes(t.teacherId)}
                            onChange={() => toggleTeacherSelection(t.teacherId)}
                            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                          />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{t.teacherId}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{t.teacherName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold text-[11px]">
                          Giáo viên
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{t.subjectName}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">{standardSessionCount}</td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-700">{incidentSessionCount}</td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-700">{standardCredit.toFixed(1)}</td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-700">{incidentCredit.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {totalCredit.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.payrollSent ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Đã gửi</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Chưa gửi</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.reconcileStatus === 'DA_CHOT' ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-[11px]">
                            Đã chốt công
                          </span>
                        ) : t.reconcileStatus === 'CO_GIAI_TRINH' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-semibold text-[11px]">
                            Có giải trình
                          </span>
                        ) : t.reconcileStatus === 'DA_GUI' ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold text-[11px]">
                            Đã gửi NS
                          </span>
                        ) : t.reconcileStatus === 'DA_XU_LY_GT' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-[11px]">
                            Đã xử lý giải trình
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold text-[11px]">
                            Chờ đối soát
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => sendPayrollToTeachers(selectedMonth, [t.teacherId])}
                            disabled={t.payrollSent || monthData.isLocked}
                            className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            title={t.payrollSent ? 'Đã gửi đối soát' : 'Gửi đối soát cho giáo viên'}
                            aria-label={`${t.payrollSent ? 'Đã gửi đối soát cho' : 'Gửi đối soát cho'} ${t.teacherName}`}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              resetFilters();
                              setSearchTerm(t.teacherName);
                              setActiveTab('sessions');
                            }}
                            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Xem các buổi học"
                            aria-label={`Xem các buổi học của ${t.teacherName}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Nội dung Tab 2: Chi tiết từng buổi học & Chốt công */}
        {activeTab === 'sessions' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-3">{columnTextFilter('Mã buổi học', sessionIdFilter, setSessionIdFilter)}</th>
                  <th className="py-3 px-3">
                    <ColumnFilter
                      label="Ngày & giờ"
                      active={Boolean(sessionDateFrom || sessionDateTo || sessionTimeFilter.trim())}
                      onReset={() => { setSessionDateFrom(''); setSessionDateTo(''); setSessionTimeFilter(''); }}
                    >
                      <label className="block">Từ ngày<input type="date" value={sessionDateFrom} max={sessionDateTo || undefined} onChange={event => setSessionDateFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2" /></label>
                      <label className="block">Đến ngày<input type="date" value={sessionDateTo} min={sessionDateFrom || undefined} onChange={event => setSessionDateTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2" /></label>
                      <input aria-label="Lọc thứ hoặc khung giờ" value={sessionTimeFilter} onChange={event => setSessionTimeFilter(event.target.value)} placeholder="Thứ hoặc khung giờ" className="w-full rounded-lg border border-slate-200 p-2" />
                    </ColumnFilter>
                  </th>
                  <th className="py-3 px-3">{columnTextFilter('Nhân sự', staffNameFilter, setStaffNameFilter)}</th>
                  <th className="py-3 px-3">{columnTextFilter('Lớp học', sessionClassFilter, setSessionClassFilter)}</th>
                  <th className="py-3 px-3">{columnSelectFilter('Loại buổi', sessionClassificationFilter, value => setSessionClassificationFilter(value as SessionClassification), [{ value: 'STANDARD', label: 'Buổi chuẩn' }, { value: 'INCIDENT', label: 'Buổi sự cố' }])}</th>
                  <th className="py-3 px-3">{columnSelectFilter('Trạng thái', sessionReconcileFilter, setSessionReconcileFilter, [{ value: 'CHO_DOI_SOAT', label: 'Chờ đối soát' }, { value: 'DA_XAC_NHAN', label: 'Đã xác nhận' }, { value: 'CO_GIAI_TRINH', label: 'Có giải trình' }, { value: 'DA_CHOT', label: 'Đã chốt công' }])}</th>
                  <th className="py-3 px-3 text-center">{columnRangeFilter('Công', sessionRanges.creditCoeff, range => setSessionRanges(previous => ({ ...previous, creditCoeff: range })), '0.1')}</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(({ teacherId, teacherName, staffRole, subject, session }) => {
                  const isTutor = staffRole === 'GIA_SU';

                  return (
                    <tr
                      key={session.id}
                      className={`transition-colors duration-700 ${
                        highlightedSessionId === session.id
                          ? 'bg-slate-200/90 shadow-[inset_0_0_0_1px_rgb(203_213_225)]'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{session.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{session.dateStr}</div>
                        <div className="text-[11px] text-slate-400">
                          {session.dayOfWeek} ({session.time})
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{teacherName}</div>
                        <div className="text-[11px] text-slate-500">{teacherId} · {isTutor ? 'Gia sư' : 'Giáo viên'} · {subject === 'ANH' ? 'Tiếng Anh' : 'Toán'}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="font-mono">{session.classCode}</div>
                        <div className="text-[11px] font-normal text-slate-500">Mô hình {session.model || '1-3'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isIncidentSession(session) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                          {isIncidentSession(session) ? 'Buổi sự cố' : 'Buổi chuẩn'}
                        </span>
                        {session.type === 'COVER' && (
                          <span className="ml-1 inline-block rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Cover</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-700">
                          {session.reconcileStatus === 'DA_XAC_NHAN' ? 'Đã xác nhận' : session.reconcileStatus === 'CO_GIAI_TRINH' ? 'Có giải trình' : session.reconcileStatus === 'DA_CHOT' ? 'Đã chốt' : 'Chờ đối soát'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">
                          {session.creditCoeff}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button type="button" onClick={() => { highlightSessionRow(session.id); setViewingSession({ teacherId, teacherName, staffRole, subject, session }); }} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer" title="Xem chi tiết" aria-label={`Xem chi tiết buổi ${session.id}`}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              highlightSessionRow(session.id);
                              setEditingSession({ teacherId, session });
                              setNewCoeff(session.creditCoeff);
                              setEditNote(session.hrPayNote);
                            }}
                            disabled={monthData.isLocked}
                            className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            title={monthData.isLocked ? 'Mở khóa kỳ để sửa hệ số công' : 'Sửa hệ số công'}
                            aria-label={`Sửa hệ số công buổi ${session.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Nội dung Tab 3: Xử lý giải trình & Khiếu nại công */}
        {activeTab === 'disputes' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: 'ALL', label: 'Tất cả đơn', count: (monthData.disputes || []).length },
                { value: 'CHO_DUYET', label: 'Chờ xử lý', count: (monthData.disputes || []).filter(dispute => dispute.status === 'CHO_DUYET').length },
                { value: 'DA_DUYET', label: 'Đã duyệt', count: (monthData.disputes || []).filter(dispute => dispute.status === 'DA_DUYET').length },
                { value: 'TU_CHOI', label: 'Đã từ chối', count: (monthData.disputes || []).filter(dispute => dispute.status === 'TU_CHOI').length }
              ].map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setDisputeStatusFilter(status.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    disputeStatusFilter === status.value
                      ? 'border-orange-300 bg-orange-50 text-orange-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-[11px] font-semibold">{status.label}</span>
                  <span className="mt-1 block text-lg font-black">{status.count}</span>
                </button>
              ))}
            </div>
            {filteredDisputes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-semibold text-slate-600">
                  {(monthData.disputes || []).length === 0 ? 'Không có đơn giải trình công nào trong kỳ!' : 'Không tìm thấy đơn giải trình phù hợp.'}
                </p>
                {(monthData.disputes || []).length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Tất cả các buổi dạy đã được nghiệm thu và đối soát chuẩn xác.</p>
                )}
              </div>
            ) : (
              filteredDisputes.map(dispute => (
                <div
                  key={dispute.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-xs">
                        {dispute.id}
                      </span>
                      <span className="font-bold text-slate-800">{dispute.teacherName}</span>
                      <span className="text-xs text-slate-500">
                        • Buổi {dispute.sessionId} ({dispute.sessionTime})
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700">
                      Vấn đề giải trình: <span className="text-rose-600">{dispute.incidentType}</span>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        dispute.status === 'CHO_DUYET'
                          ? 'bg-amber-100 text-amber-800'
                          : dispute.status === 'DA_DUYET'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {dispute.status === 'CHO_DUYET' ? 'Chờ xử lý' : dispute.status === 'DA_DUYET' ? 'Đã duyệt' : 'Đã từ chối'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      "{dispute.content}"
                    </div>

                    {dispute.attachment && (
                      <div className="text-[11px] text-indigo-600 flex items-center gap-1.5 font-medium">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span>Minh chứng đính kèm:</span>
                        <span className="underline cursor-pointer">{dispute.attachment}</span>
                      </div>
                    )}

                    {dispute.adminNote && (
                      <div className="text-[11px] text-slate-500 italic">
                        Phản hồi đã gửi cho giáo viên: {dispute.adminNote}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {dispute.status === 'CHO_DUYET' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDisputeReview(dispute)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Xử lý giải trình
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDisputeReview(dispute)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title="Sửa kết quả và gửi lại cho giáo viên"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Sửa & gửi lại
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Lọc đối soát công"
        subtitle={activeTab === 'summary' ? 'Lọc theo thông tin nhân sự và trạng thái công' : activeTab === 'sessions' ? 'Lọc riêng từng trường của buổi học' : 'Lọc theo thông tin và trạng thái giải trình'}
        activeCount={activeFilterCount}
        onReset={resetFilters}
      >
        <div className="space-y-4 text-xs">
          {activeTab !== 'disputes' && (
            <div>
              <label className="mb-1 block font-bold text-slate-700">Tìm nhanh</label>
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Tên, mã nhân sự, mã buổi học, lớp..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
          )}

          {activeTab === 'summary' && (
            <>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã nhân sự</label>
                <input value={staffIdFilter} onChange={event => setStaffIdFilter(event.target.value)} placeholder="Nhập mã nhân sự" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Họ và tên</label>
                <input value={staffNameFilter} onChange={event => setStaffNameFilter(event.target.value)} placeholder="Nhập tên giáo viên/gia sư" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Phân loại nhân sự</label>
                <select value={staffTypeFilter} onChange={event => setStaffTypeFilter(event.target.value as typeof staffTypeFilter)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả nhân sự</option>
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="GIA_SU">Gia sư</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Môn chuyên trách</label>
                <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả môn</option>
                  <option value="TOAN">Toán</option>
                  <option value="ANH">Tiếng Anh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Trạng thái đối soát</label>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="CHO_GUI">Chờ gửi đối soát</option>
                  <option value="DA_GUI">Đã gửi nhân sự</option>
                  <option value="CO_GIAI_TRINH">Có giải trình</option>
                  <option value="DA_XU_LY_GT">Đã xử lý giải trình</option>
                  <option value="DA_CHOT">Đã chốt công</option>
                </select>
              </div>
              {renderRangeFilter('Buổi chuẩn', summaryRanges.standardSessions, range => setSummaryRanges(previous => ({ ...previous, standardSessions: range })))}
              {renderRangeFilter('Số buổi sự cố', summaryRanges.incidentSessions, range => setSummaryRanges(previous => ({ ...previous, incidentSessions: range })))}
              {renderRangeFilter('Công buổi chuẩn', summaryRanges.standardCredit, range => setSummaryRanges(previous => ({ ...previous, standardCredit: range })), '0.1')}
              {renderRangeFilter('Công buổi sự cố', summaryRanges.incidentCredit, range => setSummaryRanges(previous => ({ ...previous, incidentCredit: range })), '0.1')}
              {renderRangeFilter('Tổng công', summaryRanges.totalCredit, range => setSummaryRanges(previous => ({ ...previous, totalCredit: range })), '0.1')}
            </>
          )}

          {activeTab === 'sessions' && (
            <>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã buổi học</label>
                <input value={sessionIdFilter} onChange={event => setSessionIdFilter(event.target.value)} placeholder="Nhập mã buổi học" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-1 font-bold text-slate-700">Ngày dạy</legend>
                <label className="block text-slate-600">Từ ngày<input type="date" value={sessionDateFrom} max={sessionDateTo || undefined} onChange={event => setSessionDateFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
                <label className="block text-slate-600">Đến ngày<input type="date" value={sessionDateTo} min={sessionDateFrom || undefined} onChange={event => setSessionDateTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              </fieldset>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Thứ / Khung giờ</label>
                <input value={sessionTimeFilter} onChange={event => setSessionTimeFilter(event.target.value)} placeholder="Ví dụ: Thứ 2 hoặc 18:00" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã nhân sự</label>
                <input value={staffIdFilter} onChange={event => setStaffIdFilter(event.target.value)} placeholder="Nhập mã nhân sự" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Giáo viên / Gia sư</label>
                <input value={staffNameFilter} onChange={event => setStaffNameFilter(event.target.value)} placeholder="Nhập tên nhân sự" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Phân loại nhân sự</label>
                <select value={staffTypeFilter} onChange={event => setStaffTypeFilter(event.target.value as typeof staffTypeFilter)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả nhân sự</option>
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="GIA_SU">Gia sư</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Môn học</label>
                <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả môn</option>
                  <option value="TOAN">Toán</option>
                  <option value="ANH">Tiếng Anh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Lớp học</label>
                <input value={sessionClassFilter} onChange={event => setSessionClassFilter(event.target.value)} placeholder="Mã hoặc tên lớp" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Học sinh / Nhóm</label>
                <input value={sessionStudentFilter} onChange={event => setSessionStudentFilter(event.target.value)} placeholder="Nhập tên học sinh/nhóm" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mô hình lớp</label>
                <input value={sessionModelFilter} onChange={event => setSessionModelFilter(event.target.value)} placeholder="Ví dụ: 1-1 hoặc 1-3" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              {renderRangeFilter('Sĩ số thực tế', sessionRanges.studentCount, range => setSessionRanges(previous => ({ ...previous, studentCount: range })))}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Giờ vào</label>
                <input value={sessionCheckinFilter} onChange={event => setSessionCheckinFilter(event.target.value)} placeholder="Ví dụ: 18:00" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Giờ ra</label>
                <input value={sessionCheckoutFilter} onChange={event => setSessionCheckoutFilter(event.target.value)} placeholder="Ví dụ: 19:30" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              {renderRangeFilter('Thời lượng (phút)', sessionRanges.durationMinutes, range => setSessionRanges(previous => ({ ...previous, durationMinutes: range })))}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Trạng thái buổi học</label>
                <select value={sessionClassificationFilter} onChange={event => setSessionClassificationFilter(event.target.value as SessionClassification)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả phân loại</option>
                  <option value="STANDARD">Buổi chuẩn</option>
                  <option value="INCIDENT">Buổi sự cố</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Trạng thái đối soát ca</label>
                <select value={sessionReconcileFilter} onChange={event => setSessionReconcileFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="CHO_DOI_SOAT">Chờ đối soát</option>
                  <option value="DA_XAC_NHAN">Đã xác nhận</option>
                  <option value="CO_GIAI_TRINH">Có giải trình</option>
                  <option value="DA_CHOT">Đã chốt công</option>
                </select>
              </div>
              {renderRangeFilter('Hệ số công', sessionRanges.creditCoeff, range => setSessionRanges(previous => ({ ...previous, creditCoeff: range })), '0.1')}
              <div>
                <label className="mb-1 block font-bold text-slate-700">Ghi chú đối soát</label>
                <input value={sessionNoteFilter} onChange={event => setSessionNoteFilter(event.target.value)} placeholder="Tìm trong ghi chú" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
            </>
          )}

          {activeTab === 'disputes' && (
            <>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Phân loại nhân sự</label>
                <select value={staffTypeFilter} onChange={event => setStaffTypeFilter(event.target.value as typeof staffTypeFilter)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả nhân sự</option>
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="GIA_SU">Gia sư</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Môn học</label>
                <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả môn</option>
                  <option value="TOAN">Toán</option>
                  <option value="ANH">Tiếng Anh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã đơn giải trình</label>
                <input value={disputeIdFilter} onChange={event => setDisputeIdFilter(event.target.value)} placeholder="Nhập mã đơn" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Trạng thái đơn</label>
                <select value={disputeStatusFilter} onChange={event => setDisputeStatusFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="CHO_DUYET">Chờ duyệt</option>
                  <option value="DA_DUYET">Đã duyệt</option>
                  <option value="TU_CHOI">Đã từ chối</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Vấn đề giải trình</label>
                <input value={disputeTypeFilter} onChange={event => setDisputeTypeFilter(event.target.value)} placeholder="Nhập loại vấn đề" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Mã buổi học / Lớp / Nhân sự</label>
                <input value={disputeSessionFilter} onChange={event => setDisputeSessionFilter(event.target.value)} placeholder="Tìm theo mã buổi học, lớp hoặc tên" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Nội dung giải trình</label>
                <input value={disputeContentFilter} onChange={event => setDisputeContentFilter(event.target.value)} placeholder="Tìm trong nội dung" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Ý kiến xử lý</label>
                <input value={disputeAdminNoteFilter} onChange={event => setDisputeAdminNoteFilter(event.target.value)} placeholder="Tìm trong ghi chú xử lý" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
            </>
          )}
        </div>
      </FilterDrawer>

      {/* Modal Xuất Excel gửi bộ phận tính công */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Xuất Bảng Đối Soát Công Gửi Bộ Phận Tính Công</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kỳ đối soát: {selectedMonth} • Số dòng dữ liệu: {filteredSessions.length} buổi học
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview dữ liệu */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Mã NS</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Loại</th>
                    <th className="py-2.5 px-3">Mã buổi học</th>
                    <th className="py-2.5 px-3">Ngày dạy</th>
                    <th className="py-2.5 px-3">Lớp học</th>
                    <th className="py-2.5 px-3">Sĩ số</th>
                    <th className="py-2.5 px-3 text-center">Hệ số công</th>
                    <th className="py-2.5 px-3">Ghi chú đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map(({ teacherId, teacherName, staffRole, session }, idx) => (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-medium">{teacherId}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{teacherName}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            staffRole === 'GIA_SU' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {staffRole === 'GIA_SU' ? 'Gia sư' : 'GV'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">{session.id}</td>
                      <td className="py-2 px-3">{session.dateStr}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{session.classCode}</td>
                      <td className="py-2 px-3">{session.studentCount ?? 3} HS</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">
                        {session.creditCoeff}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{session.hrPayNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                * Dữ liệu file xuất được định dạng UTF-8 có dấu BOM tiếng Việt chuẩn, không chứa thông tin thù lao tiền mặt.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    handleDownloadCsv();
                    setShowExportModal(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file Excel (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal In biên bản đối soát bàn giao */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header Biên bản */}
            <div className="text-center space-y-1 border-b pb-4">
              <div className="text-xs font-bold uppercase text-slate-600">HỆ THỐNG ĐÀO TẠO TRỰC TUYẾN VUIHOC TUTOR</div>
              <div className="text-base font-extrabold text-slate-900 uppercase">
                BIÊN BẢN NGHIỆM THU &amp; ĐỐI SOÁT CÔNG CA DẠY
              </div>
              <div className="text-xs text-slate-500">
                Kỳ nghiệm thu: Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]} • Ngày lập:{' '}
                {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>

            {/* Tóm tắt */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-500">Tổng nhân sự đối soát:</span>
                <span className="font-bold text-slate-800 ml-1">{filteredStaff.length} người</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng số buổi dạy:</span>
                <span className="font-bold text-slate-800 ml-1">{stats.totalSessions} ca</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng số công quy chuẩn:</span>
                <span className="font-bold text-emerald-600 ml-1">{stats.totalCredit}</span>
              </div>
            </div>

            {/* Bảng danh sách ký nhận */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">STT</th>
                    <th className="p-2.5">Mã NS</th>
                    <th className="p-2.5">Họ và tên</th>
                    <th className="p-2.5">Vai trò</th>
                    <th className="p-2.5 text-center">Buổi chuẩn</th>
                    <th className="p-2.5 text-center">Buổi Cover</th>
                    <th className="p-2.5 text-right">Tổng công xác nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((t, idx) => {
                    const sessions = t.sessions || [];
                    const totalCredit = sessions.reduce((acc, session) => acc + session.creditCoeff, 0);
                    const standardSessionCount = sessions.filter(session => !isIncidentSession(session)).length;
                    const coverSessionCount = sessions.filter(session => session.type === 'COVER').length;
                    return (
                      <tr key={t.teacherId}>
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-mono font-medium">{t.teacherId}</td>
                        <td className="p-2 font-semibold text-slate-800">{t.teacherName}</td>
                        <td className="p-2">{(t.staffRole || 'GIAO_VIEN') === 'GIA_SU' ? 'Gia sư' : 'Giáo viên'}</td>
                        <td className="p-2 text-center">{standardSessionCount}</td>
                        <td className="p-2 text-center">{coverSessionCount}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{totalCredit.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phần chữ ký bàn giao */}
            <div className="grid grid-cols-3 text-center text-xs pt-6 gap-4">
              <div>
                <div className="font-bold text-slate-800">NGƯỜI LẬP BIÊN BẢN</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-medium text-slate-700">Trần Quản Trị</div>
              </div>

              <div>
                <div className="font-bold text-slate-800">BAN VẬN HÀNH ĐÀO TẠO</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-medium text-slate-700">Lê Tuấn Quang</div>
              </div>

              <div>
                <div className="font-bold text-slate-800">BỘ PHẬN TÍNH CÔNG TIẾP NHẬN</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-medium text-slate-700">Nguyễn Kế Toán</div>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In biên bản bàn giao</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Chi tiết buổi học</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{viewingSession.session.id}</p>
              </div>
              <button onClick={closeSessionDetails} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng chi tiết">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-xs sm:grid-cols-2">
                <div><dt className="text-slate-500">Nhân sự</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.teacherName} ({viewingSession.teacherId}) · {viewingSession.staffRole === 'GIA_SU' ? 'Gia sư' : 'Giáo viên'}</dd></div>
                <div><dt className="text-slate-500">Môn học</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.subject === 'ANH' ? 'Tiếng Anh' : 'Toán'}</dd></div>
                <div><dt className="text-slate-500">Ngày & giờ</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.dayOfWeek}, {viewingSession.session.dateStr} · {viewingSession.session.time}</dd></div>
                <div><dt className="text-slate-500">Lớp học</dt><dd className="mt-1 font-mono font-semibold text-slate-800">{viewingSession.session.classCode}<div className="mt-0.5 font-sans text-[11px] font-normal text-slate-500">Mô hình {viewingSession.session.model || '1-3'}</div></dd></div>
                <div><dt className="text-slate-500">Học sinh / sĩ số</dt><dd className="mt-1 font-semibold text-slate-800">{getSessionStudentNames(viewingSession.session)} · {viewingSession.session.studentCount ?? viewingSession.session.studentNames?.length ?? 3} HS</dd></div>
                <div><dt className="text-slate-500">Phân loại</dt><dd className="mt-1 font-semibold text-slate-800">{isIncidentSession(viewingSession.session) ? 'Buổi sự cố' : 'Buổi chuẩn'}{viewingSession.session.type === 'COVER' ? ' · Cover' : ''}</dd></div>
                <div><dt className="text-slate-500">Điểm danh vào / ra</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.checkin} / {viewingSession.session.checkout}</dd></div>
                <div><dt className="text-slate-500">Thời lượng</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.durationMinutes ?? 90} phút</dd></div>
                <div><dt className="text-slate-500">Trạng thái buổi</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.statusText}</dd></div>
                <div><dt className="text-slate-500">Trạng thái đối soát</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.reconcileStatus === 'DA_XAC_NHAN' ? 'Đã xác nhận' : viewingSession.session.reconcileStatus === 'CO_GIAI_TRINH' ? 'Có giải trình' : viewingSession.session.reconcileStatus === 'DA_CHOT' ? 'Đã chốt công' : 'Chờ đối soát'}</dd></div>
                <div><dt className="text-slate-500">Hệ số ghi nhận</dt><dd className="mt-1 font-bold text-emerald-700">{viewingSession.session.creditCoeff}</dd></div>
                <div><dt className="text-slate-500">AI rà soát</dt><dd className="mt-1 font-semibold text-slate-800">{viewingSession.session.hasAiReview ? 'Đã rà soát' : 'Chưa rà soát'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-500">Ghi chú đối soát</dt><dd className="mt-1 rounded-lg bg-slate-50 p-3 text-slate-700">{viewingSession.session.hrPayNote || 'Không có ghi chú'}</dd></div>
                {viewingSession.session.dispute && (
                  <div className="sm:col-span-2"><dt className="text-slate-500">Giải trình liên quan</dt><dd className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-slate-700">{viewingSession.session.dispute.content}</dd></div>
                )}
              </dl>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4">
              <button onClick={closeSessionDetails} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Điều chỉnh hệ số công */}
      {editingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Điều chỉnh công buổi học</h3>
              <button onClick={closeSessionEditor} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Mã buổi học:</span>
                <span className="font-mono font-bold text-slate-800 ml-1">{editingSession.session.id}</span>
              </div>
              <div>
                <span className="text-slate-500">Lớp:</span>
                <span className="font-semibold text-slate-800 ml-1">{editingSession.session.className}</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Hệ số công ghi nhận:</label>
                <select
                  value={newCoeff}
                  onChange={e => setNewCoeff(parseFloat(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value={1.0}>1.0 · Chuẩn / Dạy thay hoàn tất</option>
                  <option value={0.5}>0.5 · Học sinh hủy sát giờ / Trực phòng chờ</option>
                  <option value={1.5}>1.5 · Phụ đạo tăng cường / Ghép buổi</option>
                  <option value={0.0}>0.0 · Vắng không phép / Lỗi giáo viên</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú đối soát cho kế toán:</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={closeSessionEditor}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCoeff}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Cập nhật công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xử lý giải trình */}
      {reviewingDispute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {reviewingDispute.status === 'CHO_DUYET' ? 'Xử lý đơn giải trình' : 'Sửa kết quả giải trình'}
              </h3>
              <button onClick={() => setReviewingDispute(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Người gửi:</span>
                <span className="font-bold text-slate-800 ml-1">{reviewingDispute.teacherName}</span>
              </div>
              <div>
                <span className="text-slate-500">Buổi học:</span>
                <span className="font-mono text-slate-800 ml-1">
                  {reviewingDispute.sessionId} ({reviewingDispute.sessionTime})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border text-slate-700">"{reviewingDispute.content}"</div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Hệ số công sau khi xử lý buổi này:</label>
                <select
                  value={disputeCreditCoeff}
                  onChange={event => setDisputeCreditCoeff(Number(event.target.value))}
                  className="mb-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                >
                  {!([0, 0.5, 1, 1.5].includes(disputeCreditCoeff)) && (
                    <option value={disputeCreditCoeff}>{disputeCreditCoeff} · Hệ số hiện tại</option>
                  )}
                  <option value={0}>0</option>
                  <option value={0.5}>0.5</option>
                  <option value={1}>1.0</option>
                  <option value={1.5}>1.5</option>
                </select>
                <p className="mb-3 text-[11px] text-slate-500">Hệ số này sẽ cập nhật trực tiếp vào công của buổi học và tổng công đối soát.</p>
                <label className="block text-slate-600 font-semibold mb-1">Kết quả xử lý gửi cho giáo viên:</label>
                <select
                  value={disputeDecision}
                  onChange={event => setDisputeDecision(event.target.value as 'DA_DUYET' | 'TU_CHOI')}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                >
                  <option value="DA_DUYET">Chấp nhận giải trình</option>
                  <option value="TU_CHOI">Từ chối giải trình</option>
                </select>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú phản hồi cho giáo viên:</label>
                <textarea
                  rows={3}
                  value={disputeAdminNote}
                  onChange={e => setDisputeAdminNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setReviewingDispute(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleApproveDispute(disputeDecision)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer ${
                  disputeDecision === 'DA_DUYET'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {reviewingDispute.status === 'CHO_DUYET' ? 'Gửi kết quả cho giáo viên' : 'Lưu và gửi lại cho giáo viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
