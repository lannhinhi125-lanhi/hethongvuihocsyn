import React, { useState, useMemo } from 'react';
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
  Share2
} from 'lucide-react';
import { SessionPayrollRecord, DisputeItem } from '../types';

export const Module7_WorkReconciliation: React.FC = () => {
  const {
    payrollStore,
    updateSessionCredit,
    reviewDispute,
    lockPayrollMonth,
    unlockPayrollMonth,
    showToast
  } = useApp();

  // State bộ lọc
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [activeTab, setActiveTab] = useState<'summary' | 'sessions' | 'disputes'>('summary');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'ALL' | 'GIAO_VIEN' | 'GIA_SU'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<{ teacherId: string; session: SessionPayrollRecord } | null>(null);
  const [newCoeff, setNewCoeff] = useState<number>(1.0);
  const [editNote, setEditNote] = useState<string>('');
  const [reviewingDispute, setReviewingDispute] = useState<DisputeItem | null>(null);
  const [disputeAdminNote, setDisputeAdminNote] = useState<string>('');

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
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = t.teacherName.toLowerCase().includes(term);
        const matchId = t.teacherId.toLowerCase().includes(term);
        return matchName || matchId;
      }
      return true;
    });
  }, [monthData.teachers, staffTypeFilter, subjectFilter, statusFilter, searchTerm]);

  // Toàn bộ các ca học của kỳ
  const allSessionsWithStaff = useMemo(() => {
    const list: { teacherId: string; teacherName: string; staffRole: 'GIAO_VIEN' | 'GIA_SU'; session: SessionPayrollRecord }[] = [];
    (monthData.teachers || []).forEach(t => {
      (t.sessions || []).forEach(s => {
        list.push({
          teacherId: t.teacherId,
          teacherName: t.teacherName,
          staffRole: t.staffRole || 'GIAO_VIEN',
          session: s
        });
      });
    });
    return list;
  }, [monthData.teachers]);

  // Ca học sau khi lọc
  const filteredSessions = useMemo(() => {
    return allSessionsWithStaff.filter(item => {
      if (staffTypeFilter !== 'ALL' && item.staffRole !== staffTypeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchStaff = item.teacherName.toLowerCase().includes(term);
        const matchClass = item.session.classCode.toLowerCase().includes(term);
        const matchStudent = item.session.studentName.toLowerCase().includes(term);
        const matchId = item.session.id.toLowerCase().includes(term);
        return matchStaff || matchClass || matchStudent || matchId;
      }
      return true;
    });
  }, [allSessionsWithStaff, staffTypeFilter, searchTerm]);

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
        if (s.type === 'STUDENT_CANCELED' || s.type === 'LATE' || s.type === 'EMERGENCY') incidentCount += 1;
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
      'Mã ca',
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
      'Trạng thái ca dạy',
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
      `"${item.session.studentName}"`,
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
    updateSessionCredit(selectedMonth, editingSession.teacherId, editingSession.session.id, newCoeff);
    setEditingSession(null);
  };

  // Xử lý duyệt giải trình
  const handleApproveDispute = (status: 'DA_DUYET' | 'TU_CHOI') => {
    if (!reviewingDispute) return;
    reviewDispute(selectedMonth, reviewingDispute.id, status, disputeAdminNote);
    setReviewingDispute(null);
    setDisputeAdminNote('');
  };

  return (
    <div className="space-y-6">
      {/* Banner Tiêu đề Phân hệ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-xs uppercase tracking-wide">
              ĐỐI SOÁT CÔNG CA DẠY &amp; GIA SƯ
            </span>
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Đối Soát Công Ca Dạy</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm tra, nghiệm thu và đối soát số ca, số công thực tế của Giáo viên &amp; Gia sư; sẵn sàng xuất dữ liệu gửi bộ phận tính công (không có thù lao).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 pl-1.5">Năm học:</span>
            <select
              value={selectedSchoolYear}
              onChange={e => setSelectedSchoolYear(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-2 cursor-pointer"
            >
              <option value="2026 - 2027">2026 - 2027</option>
              <option value="2025 - 2026">2025 - 2026</option>
            </select>
            <span className="text-slate-300">|</span>
            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-2 cursor-pointer"
            >
              <option value="2026-09">Kỳ Tháng 09/2026</option>
              <option value="2026-10">Kỳ Tháng 10/2026</option>
            </select>
          </div>

          {/* Nút Xuất Excel gửi bộ phận tính công */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel gửi bộ phận tính công</span>
          </button>

          {/* Nút In biên bản đối soát */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In biên bản đối soát</span>
          </button>

          {/* Nút Khóa / Mở kỳ */}
          {monthData.isLocked ? (
            <button
              onClick={() => unlockPayrollMonth(selectedMonth, 'Mở khóa để điều chỉnh nghiệp vụ')}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-300 transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Mở khóa kỳ đối soát</span>
            </button>
          ) : (
            <button
              onClick={() => lockPayrollMonth(selectedMonth)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Khóa kỳ &amp; Chốt gửi tính công</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Chỉ số ca và công giảng dạy (Không thù lao) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng số ca dạy</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ca trong kỳ đối soát</div>
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
          <div className="text-[11px] font-semibold text-amber-700 uppercase">Ca Cover / Sự Cố</div>
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
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Tổng hợp công theo nhân sự (GV &amp; Gia sư)</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
              {filteredStaff.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'sessions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Chi tiết từng ca học &amp; Chốt công</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
              {filteredSessions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'disputes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Xử lý giải trình &amp; Khiếu nại công</span>
            {stats.pendingDisputes > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold">
                {stats.pendingDisputes}
              </span>
            )}
          </button>
        </div>

        {/* Thanh công cụ lọc chung */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Phân loại GV / Gia sư */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Nhân sự:</span>
              <select
                value={staffTypeFilter}
                onChange={e => setStaffTypeFilter(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả (GV &amp; Gia sư)</option>
                <option value="GIAO_VIEN">Chỉ Giáo viên giảng dạy</option>
                <option value="GIA_SU">Chỉ Gia sư kèm 1-1 / Nhóm nhỏ</option>
              </select>
            </div>

            {/* Môn học */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Môn:</span>
              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả môn</option>
                <option value="TOAN">Môn Toán</option>
                <option value="ANH">Môn Tiếng Anh</option>
              </select>
            </div>

            {/* Trạng thái đối soát */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="CHO_GUI">Chờ gửi đối soát</option>
                <option value="DA_GUI">Đã gửi nhân sự</option>
                <option value="CO_GIAI_TRINH">Có giải trình</option>
                <option value="DA_CHOT">Đã chốt công</option>
              </select>
            </div>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên GV, mã ca, lớp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Nội dung Tab 1: Tổng hợp công theo nhân sự */}
        {activeTab === 'summary' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-3">Mã NS</th>
                  <th className="py-3 px-3">Họ và tên</th>
                  <th className="py-3 px-3">Phân loại</th>
                  <th className="py-3 px-3">Chuyên trách</th>
                  <th className="py-3 px-3 text-center">Ca chuẩn</th>
                  <th className="py-3 px-3 text-center">Cover (Dạy thay)</th>
                  <th className="py-3 px-3 text-center">HS nghỉ gấp</th>
                  <th className="py-3 px-3 text-center">Sự cố / Bù</th>
                  <th className="py-3 px-3 text-right">Tổng công tính</th>
                  <th className="py-3 px-3 text-center">Trạng thái đối soát</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(t => {
                  const isTutor = (t.staffRole || 'GIAO_VIEN') === 'GIA_SU';
                  const totalCredit = (t.sessions || []).reduce((acc, s) => acc + s.creditCoeff, 0);

                  return (
                    <tr key={t.teacherId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{t.teacherId}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{t.teacherName}</div>
                      </td>
                      <td className="py-3 px-3">
                        {isTutor ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-semibold text-[11px]">
                            Gia sư
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold text-[11px]">
                            Giáo viên
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{t.subjectName}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">{t.standardSessions}</td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-600">
                        {t.coverSessions > 0 ? `+${t.coverSessions}` : '0'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-600">{t.studentCanceledSessions}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-500">
                        {t.lateSessions + t.emergencySessions}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {totalCredit.toFixed(1)} công
                        </span>
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
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold text-[11px]">
                            Chờ đối soát
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setSearchTerm(t.teacherName);
                            setActiveTab('sessions');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Xem các ca
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Nội dung Tab 2: Chi tiết từng ca học & Chốt công */}
        {activeTab === 'sessions' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-3">Mã ca</th>
                  <th className="py-3 px-3">Ngày &amp; Giờ</th>
                  <th className="py-3 px-3">Nhân sự (GV / Gia sư)</th>
                  <th className="py-3 px-3">Lớp &amp; Mô hình</th>
                  <th className="py-3 px-3">Sĩ số</th>
                  <th className="py-3 px-3">Vào / Ra</th>
                  <th className="py-3 px-3">Trạng thái buổi học</th>
                  <th className="py-3 px-3 text-center">Hệ số công</th>
                  <th className="py-3 px-3">Ghi chú đối soát</th>
                  <th className="py-3 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(({ teacherId, teacherName, staffRole, session }) => {
                  const isTutor = staffRole === 'GIA_SU';

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{session.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{session.dateStr}</div>
                        <div className="text-[11px] text-slate-400">
                          {session.dayOfWeek} ({session.time})
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{teacherName}</div>
                        <div className="text-[11px] mt-0.5">
                          {isTutor ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-200">
                              Gia sư
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              Giáo viên
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{session.classCode}</div>
                        <div className="text-[11px] text-slate-500">
                          Mô hình {session.model || '1-3'} • {session.studentName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                          {session.studentCount ?? 3} HS
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        <div>Vào: {session.checkin}</div>
                        <div>Ra: {session.checkout}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            session.type === 'STANDARD'
                              ? 'bg-emerald-100 text-emerald-700'
                              : session.type === 'COVER'
                              ? 'bg-blue-100 text-blue-700'
                              : session.type === 'STUDENT_CANCELED'
                              ? 'bg-amber-100 text-amber-700'
                              : session.type === 'LATE'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {session.statusText}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">
                          {session.creditCoeff} công
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs">{session.hrPayNote}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setEditingSession({ teacherId, session });
                            setNewCoeff(session.creditCoeff);
                            setEditNote(session.hrPayNote);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                          title="Điều chỉnh hệ số công"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
            {(monthData.disputes || []).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-semibold text-slate-600">Không có đơn giải trình công nào trong kỳ!</p>
                <p className="text-xs text-slate-400 mt-1">Tất cả các ca dạy đã được nghiệm thu và đối soát chuẩn xác.</p>
              </div>
            ) : (
              (monthData.disputes || []).map(dispute => (
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
                        • Ca {dispute.sessionId} ({dispute.sessionTime})
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700">
                      Vấn đề giải trình: <span className="text-rose-600">{dispute.incidentType}</span>
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
                        Ý kiến phê duyệt: {dispute.adminNote}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {dispute.status === 'CHO_DUYET' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setReviewingDispute(dispute);
                            setDisputeAdminNote('Duyệt bảo lưu 1.0 công theo quy chế trực phòng');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Xử lý giải trình
                        </button>
                      </div>
                    ) : dispute.status === 'DA_DUYET' ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs">
                        Đã duyệt (Miễn phạt / Bảo lưu công)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full font-bold text-xs">
                        Đã từ chối
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
                  Kỳ đối soát: {selectedMonth} • Số dòng dữ liệu: {filteredSessions.length} ca dạy
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
                    <th className="py-2.5 px-3">Mã ca</th>
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
                        {session.creditCoeff} công
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
                <span className="text-slate-500">Tổng số ca dạy:</span>
                <span className="font-bold text-slate-800 ml-1">{stats.totalSessions} ca</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng số công quy chuẩn:</span>
                <span className="font-bold text-emerald-600 ml-1">{stats.totalCredit} công</span>
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
                    <th className="p-2.5 text-center">Số ca chuẩn</th>
                    <th className="p-2.5 text-center">Số ca Cover</th>
                    <th className="p-2.5 text-right">Tổng công xác nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((t, idx) => {
                    const totalCredit = (t.sessions || []).reduce((acc, s) => acc + s.creditCoeff, 0);
                    return (
                      <tr key={t.teacherId}>
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-mono font-medium">{t.teacherId}</td>
                        <td className="p-2 font-semibold text-slate-800">{t.teacherName}</td>
                        <td className="p-2">{(t.staffRole || 'GIAO_VIEN') === 'GIA_SU' ? 'Gia sư' : 'Giáo viên'}</td>
                        <td className="p-2 text-center">{t.standardSessions}</td>
                        <td className="p-2 text-center">{t.coverSessions}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{totalCredit.toFixed(1)} công</td>
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

      {/* Modal Điều chỉnh hệ số công */}
      {editingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Điều Chỉnh Hệ Số Công Ca Học</h3>
              <button onClick={() => setEditingSession(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Mã ca học:</span>
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
                  <option value={1.0}>1.0 công (Chuẩn / Dạy thay hoàn tất)</option>
                  <option value={0.5}>0.5 công (HS hủy sát giờ / Trực phòng chờ)</option>
                  <option value={1.5}>1.5 công (Ca phụ đạo tăng cường / Ca ghép)</option>
                  <option value={0.0}>0.0 công (Vắng không phép / Lỗi GV)</option>
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
                onClick={() => setEditingSession(null)}
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
              <h3 className="font-bold text-slate-800 text-sm">Phê Duyệt Đơn Giải Trình Công</h3>
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
                <span className="text-slate-500">Ca học:</span>
                <span className="font-mono text-slate-800 ml-1">
                  {reviewingDispute.sessionId} ({reviewingDispute.sessionTime})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border text-slate-700">"{reviewingDispute.content}"</div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú phê duyệt của Ban Vận Hành:</label>
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
                onClick={() => handleApproveDispute('TU_CHOI')}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 cursor-pointer"
              >
                Từ chối
              </button>
              <button
                onClick={() => handleApproveDispute('DA_DUYET')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Phê duyệt (Bảo lưu 1.0 công)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
