import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Send,
  MessageSquare,
  FileCheck,
  Calendar,
  X,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { SessionPayrollRecord, DisputeItem } from '../types';

export const TeacherWorkReconciliationView: React.FC = () => {
  const { currentUser, payrollStore, submitDispute, showToast } = useApp();

  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [selectedSessionForDispute, setSelectedSessionForDispute] = useState<SessionPayrollRecord | null>(null);
  const [disputeType, setDisputeType] = useState<string>('Học sinh xin nghỉ sát giờ nhưng bị tính vắng');
  const [disputeContent, setDisputeContent] = useState<string>('');
  const [disputeAttachment, setDisputeAttachment] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Tìm hồ sơ đối soát của nhân sự đang đăng nhập
  const monthData = payrollStore[selectedMonth] || {
    isLocked: false,
    adminSentNotice: true,
    teachers: [],
    disputes: []
  };

  // Xác định mã giáo viên / gia sư từ currentUser
  const myRecord = useMemo(() => {
    // Thầy Tuấn -> GV-001, Cô Hoa -> GV-002, Gia sư Nam -> GV-003
    if (currentUser.id === 'USR-04' || currentUser.name.includes('Tuấn')) {
      return monthData.teachers.find(t => t.teacherId === 'GV-001') || monthData.teachers[0];
    }
    if (currentUser.id === 'USR-05' || currentUser.name.includes('Hoa')) {
      return monthData.teachers.find(t => t.teacherId === 'GV-002') || monthData.teachers[0];
    }
    if (currentUser.id === 'USR-06' || currentUser.name.includes('Nam')) {
      return monthData.teachers.find(t => t.teacherId === 'GV-003') || monthData.teachers[0];
    }
    // Mặc định lấy theo name hoặc record đầu tiên
    return monthData.teachers.find(t => t.teacherName.includes(currentUser.name.replace('Thầy ', '').replace('Cô ', ''))) || monthData.teachers[0];
  }, [currentUser, monthData]);

  // Các đơn giải trình của bản thân
  const myDisputes = useMemo(() => {
    if (!myRecord) return [];
    return (monthData.disputes || []).filter(d => d.teacherId === myRecord.teacherId);
  }, [monthData, myRecord]);

  // Thống kê cá nhân
  const stats = useMemo(() => {
    if (!myRecord) return { totalSessions: 0, totalCredit: 0, standard: 0, cover: 0, canceled: 0, late: 0 };
    const sessions = myRecord.sessions || [];
    const totalCredit = sessions.reduce((acc, s) => acc + s.creditCoeff, 0);
    return {
      totalSessions: sessions.length,
      totalCredit: Number(totalCredit.toFixed(1)),
      standard: sessions.filter(s => s.type === 'STANDARD').length,
      cover: sessions.filter(s => s.type === 'COVER').length,
      canceled: sessions.filter(s => s.type === 'STUDENT_CANCELED').length,
      late: sessions.filter(s => s.type === 'LATE').length
    };
  }, [myRecord]);

  // Xuất file CSV / Excel cá nhân gửi bộ phận tính công
  const handleExportPersonalCsv = () => {
    if (!myRecord) return;
    const headers = [
      'STT',
      'Mã GV/Gia sư',
      'Họ và tên',
      'Phân loại',
      'Mã ca',
      'Ngày dạy',
      'Thứ',
      'Khung giờ',
      'Mã lớp',
      'Tên lớp',
      'Mô hình',
      'Sĩ số thực tế',
      'Check-in',
      'Check-out',
      'Thời lượng (phút)',
      'Trạng thái ca dạy',
      'Hệ số công',
      'Số công tính',
      'Ghi chú đối soát'
    ];

    const rows = (myRecord.sessions || []).map((s, idx) => [
      idx + 1,
      myRecord.teacherId,
      `"${myRecord.teacherName}"`,
      myRecord.staffRole === 'GIA_SU' ? 'Gia sư' : 'Giáo viên',
      s.id,
      s.dateStr,
      s.dayOfWeek,
      `"${s.time}"`,
      s.classCode,
      `"${s.className}"`,
      s.model || '1-3',
      s.studentCount ?? 3,
      `"${s.checkin}"`,
      `"${s.checkout}"`,
      s.durationMinutes ?? 90,
      `"${s.statusText}"`,
      s.creditCoeff,
      s.creditCoeff,
      `"${s.hrPayNote}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_doi_soat_cong_${myRecord.teacherId}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất bảng đối soát công cá nhân kỳ ${selectedMonth} để gửi bộ phận tính công!`, 'success');
  };

  // Gửi giải trình
  const handleSubmitDispute = () => {
    if (!myRecord || !selectedSessionForDispute) {
      showToast('Vui lòng chọn ca dạy cần giải trình!', 'error');
      return;
    }
    if (!disputeContent.trim()) {
      showToast('Vui lòng nhập nội dung giải trình chi tiết!', 'error');
      return;
    }

    const disputeItem: DisputeItem = {
      id: '',
      teacherId: myRecord.teacherId,
      teacherName: myRecord.teacherName,
      staffRole: myRecord.staffRole,
      subject: myRecord.subject,
      sessionId: selectedSessionForDispute.id,
      sessionTime: `${selectedSessionForDispute.dateStr} (${selectedSessionForDispute.time})`,
      classCode: selectedSessionForDispute.classCode,
      status: 'CHO_DUYET',
      incidentType: disputeType,
      content: disputeContent,
      attachment: disputeAttachment || 'Bien_ban_xac_nhan.png',
      adminNote: ''
    };

    submitDispute(selectedMonth, disputeItem);
    setShowDisputeModal(false);
    setSelectedSessionForDispute(null);
    setDisputeContent('');
    setDisputeAttachment('');
  };

  if (!myRecord) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        Không tìm thấy thông tin ca dạy của tài khoản này trong kỳ {selectedMonth}.
      </div>
    );
  }

  const isTutor = myRecord.staffRole === 'GIA_SU';

  return (
    <div className="space-y-6">
      {/* Header Banner Cổng Giáo viên & Gia sư */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#FF5C00] font-bold text-xs uppercase tracking-wide">
              {isTutor ? 'CỔNG GIA SƯ' : 'CỔNG GIÁO VIÊN'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs uppercase tracking-wide">
              ĐỐI SOÁT CÔNG CA DẠY
            </span>
            <h1 className="text-xl font-bold text-slate-800">Bảng Đối Soát Công Giảng Dạy</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, đối chiếu số ca và số công thực tế trong tháng; gửi giải trình nếu có sai lệch và xuất bảng công gửi bộ phận tính công.
          </p>
        </div>

        {/* Chọn kỳ & Hành động */}
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

          {/* Nút xuất file đối soát công cá nhân */}
          <button
            onClick={handleExportPersonalCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất file gửi tính công</span>
          </button>

          {/* Nút In phiếu công cá nhân */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In phiếu xác nhận</span>
          </button>

          {/* Nút Gửi giải trình */}
          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Gửi giải trình công</span>
          </button>
        </div>
      </div>

      {/* Grid thẻ thông tin tổng quan số công (Hoàn toàn không có thù lao / tiền) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Họ &amp; Tên</div>
          <div className="text-base font-bold text-slate-800 mt-1 truncate">{myRecord.teacherName}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Mã: <span className="font-mono font-semibold">{myRecord.teacherId}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Phân loại nhân sự</div>
          <div className="mt-1">
            {isTutor ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-200">
                Gia sư kèm nhóm
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
                Giáo viên giảng dạy
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{myRecord.subjectName}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng ca đã dạy</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ca trong kỳ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase">Tổng công ghi nhận</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.totalCredit}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Công chuẩn nghiệm thu</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Ca chuẩn / Cover</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {stats.standard} <span className="text-xs font-normal text-emerald-600">+{stats.cover} cover</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{stats.canceled} ca HS nghỉ sát giờ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Trạng thái kỳ</div>
          <div className="mt-1">
            {monthData.isLocked ? (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                Đã chốt gửi tính công
              </span>
            ) : myRecord.reconcileStatus === 'CO_GIAI_TRINH' ? (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold text-xs">
                Đang chờ giải trình
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs">
                Đã xác nhận công
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {myDisputes.length > 0 ? `${myDisputes.length} đơn giải trình` : 'Chưa có khiếu nại'}
          </div>
        </div>
      </div>

      {/* Danh sách các ca dạy trong tháng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Chi Tiết Các Ca Dạy Trong Kỳ {selectedMonth}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm tra kỹ giờ vào/ra, số phút thực dạy và hệ số công của từng ca.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Tổng cộng: <span className="font-bold text-slate-800">{myRecord.sessions?.length || 0}</span> ca dạy
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Mã ca</th>
                <th className="py-3 px-4">Ngày dạy</th>
                <th className="py-3 px-4">Khung giờ</th>
                <th className="py-3 px-4">Lớp học &amp; Mô hình</th>
                <th className="py-3 px-4">Học sinh / Nhóm</th>
                <th className="py-3 px-4">Vào / Ra</th>
                <th className="py-3 px-4">Trạng thái ca</th>
                <th className="py-3 px-4 text-center">Hệ số công</th>
                <th className="py-3 px-4">Ghi chú đối soát</th>
                <th className="py-3 px-4 text-center">Khiếu nại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(myRecord.sessions || []).map(session => (
                <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{session.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{session.dateStr}</div>
                    <div className="text-[11px] text-slate-400">{session.dayOfWeek}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{session.time}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{session.classCode}</div>
                    <div className="text-[11px] text-slate-500">Mô hình {session.model || '1-3'}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{session.studentName}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    <div>Vào: {session.checkin}</div>
                    <div>Ra: {session.checkout}</div>
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 text-center">
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">
                      {session.creditCoeff} công
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs">{session.hrPayNote}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedSessionForDispute(session);
                        setShowDisputeModal(true);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline p-1 cursor-pointer"
                    >
                      Giải trình
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách các đơn giải trình của bản thân */}
      {myDisputes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-slate-800 text-sm">Lịch Sử Giải Trình &amp; Khiếu Nại Công Của Tôi</h3>
          </div>

          <div className="space-y-3">
            {myDisputes.map(d => (
              <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Ca {d.sessionId}</span>
                    <span className="text-slate-500">• {d.sessionTime}</span>
                  </div>
                  <div>
                    {d.status === 'CHO_DUYET' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                        Đang chờ duyệt
                      </span>
                    ) : d.status === 'DA_DUYET' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                        Đã được duyệt (Bảo lưu công)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                        Bị từ chối
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-700">
                  <span className="font-semibold text-slate-600">Lý do:</span> {d.incidentType}
                </div>
                <div className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  "{d.content}"
                </div>
                {d.adminNote && (
                  <div className="text-emerald-700 font-medium">
                    Phản hồi từ Ban Vận Hành: {d.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Gửi giải trình */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-rose-500" />
                <span>Gửi Đơn Giải Trình Công Ca Dạy</span>
              </h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chọn ca dạy cần giải trình:</label>
                <select
                  value={selectedSessionForDispute?.id || ''}
                  onChange={e => {
                    const found = (myRecord.sessions || []).find(s => s.id === e.target.value);
                    setSelectedSessionForDispute(found || null);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Chọn ca học --</option>
                  {(myRecord.sessions || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.dateStr} ({s.time}) - {s.className} ({s.creditCoeff} công)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Loại vấn đề giải trình:</label>
                <select
                  value={disputeType}
                  onChange={e => setDisputeType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Học sinh xin nghỉ sát giờ nhưng hệ thống ghi nhận nhầm GV vắng">
                    Học sinh xin nghỉ sát giờ nhưng hệ thống ghi nhận nhầm GV vắng
                  </option>
                  <option value="Đã trực phòng đủ 30 phút theo quy chế đề nghị bảo lưu 1.0 công">
                    Đã trực phòng đủ 30 phút theo quy chế đề nghị bảo lưu 1.0 công
                  </option>
                  <option value="Sự cố kỹ thuật đường truyền Internet khách quan (Có biên bản)">
                    Sự cố kỹ thuật đường truyền Internet khách quan (Có biên bản)
                  </option>
                  <option value="Ca dạy thay đồng nghiệp chưa được cập nhật hệ số công">
                    Ca dạy thay đồng nghiệp chưa được cập nhật hệ số công
                  </option>
                  <option value="Khác">Lý do khác...</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nội dung giải trình chi tiết:</label>
                <textarea
                  rows={4}
                  value={disputeContent}
                  onChange={e => setDisputeContent(e.target.value)}
                  placeholder="Trình bày cụ thể diễn biến, thời gian vào phòng, học sinh vắng hay bù giờ..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên file ảnh / minh chứng đính kèm:</label>
                <input
                  type="text"
                  value={disputeAttachment}
                  onChange={e => setDisputeAttachment(e.target.value)}
                  placeholder="Ví dụ: Anh_chup_man_hinh_zoom_truc_phong.png"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitDispute}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Gửi đơn giải trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In phiếu xác nhận công cá nhân */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1 border-b pb-4">
              <div className="text-xs font-bold uppercase text-slate-600">HỆ THỐNG ĐÀO TẠO VUIHOC TUTOR</div>
              <div className="text-base font-extrabold text-slate-900 uppercase">
                PHIẾU XÁC NHẬN CÔNG DẠY CÁ NHÂN
              </div>
              <div className="text-xs text-slate-500">
                Kỳ đối soát: Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-500">Giảng viên / Gia sư:</span>
                <span className="font-bold text-slate-800 ml-1">{myRecord.teacherName}</span>
              </div>
              <div>
                <span className="text-slate-500">Mã nhân sự:</span>
                <span className="font-mono font-bold text-slate-800 ml-1">{myRecord.teacherId}</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng số ca hoàn thành:</span>
                <span className="font-bold text-slate-800 ml-1">{stats.totalSessions} ca</span>
              </div>
              <div>
                <span className="text-slate-500">Tổng công xác nhận:</span>
                <span className="font-bold text-emerald-600 ml-1">{stats.totalCredit} công</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2">STT</th>
                    <th className="p-2">Ngày dạy</th>
                    <th className="p-2">Mã ca</th>
                    <th className="p-2">Lớp</th>
                    <th className="p-2">Trạng thái</th>
                    <th className="p-2 text-right">Số công</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(myRecord.sessions || []).map((s, idx) => (
                    <tr key={s.id}>
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2">{s.dateStr}</td>
                      <td className="p-2 font-mono font-medium">{s.id}</td>
                      <td className="p-2 font-mono">{s.classCode}</td>
                      <td className="p-2">{s.statusText}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{s.creditCoeff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 text-center text-xs pt-6 gap-4">
              <div>
                <div className="font-bold text-slate-800">GIẢNG VIÊN / GIA SƯ XÁC NHẬN</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-medium text-slate-700">{myRecord.teacherName}</div>
              </div>

              <div>
                <div className="font-bold text-slate-800">BỘ PHẬN TÍNH CÔNG TIẾP NHẬN</div>
                <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-medium text-slate-700">Phòng Nhân sự / Kế toán</div>
              </div>
            </div>

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
                <span>In phiếu xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
