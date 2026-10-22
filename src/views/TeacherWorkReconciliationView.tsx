import { ReportSelect } from '../components/ReportSelect';
import {WorkEvidenceLinks} from '../components/WorkEvidenceLinks';
import {normalizeWorkEvidence} from '../lib/workEvidence';
import {MultiSelectColumnFilter} from '../components/MultiSelectColumnFilter';
import {isIncidentWorkSession} from '../lib/workCredits';
import { workNoteDisplay } from '../lib/workNoteDisplay';
import {pendingLessonWork,lessonWorkDetails,lessonWorkStatus} from '../lib/pendingLessonWork';
import {useLessonCode} from '../hooks/useLessonCode';
import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { resolveAccountTeacher } from '../lib/evaluation';
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  MessageSquare,
  FileCheck,
  Calendar,
  X,
  HelpCircle,
  ChevronRight,
  Eye
} from 'lucide-react';
import { SessionPayrollRecord, DisputeItem } from '../types';
import { getCurrentPayrollMonth, getPayrollMonthOptions } from '../lib/payrollPeriods';
import { useBusinessValue, refreshBusinessData } from '../lib/businessPersistence';
import { visibleTeacherWork, canDisputeTeacherWork } from '../lib/teacherWorkReconciliation';
import type { TeachingLesson } from '../lib/teachingSessionDetails';

export const TeacherWorkReconciliationView: React.FC = () => {
  const lessonCode=useLessonCode();
  const {confirmSave,isSavingChanges}=useSaveConfirmation('business');
  const [datedLessons] = useBusinessValue<TeachingLesson[]>('dated_lessons');
  const { can, requirePermission } = usePermissions();
  const { currentUser, payrollStore, submitDispute, showToast, teachers, users,classes,students,timeSlots } = useApp();
  const [clockNow,setClockNow] = useState(()=>new Date());
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible'){setClockNow(new Date());void refreshBusinessData();}};
    refresh();
    const timer=window.setInterval(refresh,15_000);
    window.addEventListener('focus',refresh);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentPayrollMonth());
  const payrollMonthOptions = getPayrollMonthOptions(new Date(), [...Object.keys(payrollStore), ...datedLessons.map(lesson => lesson.date.slice(0,7))]);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [selectedSessionForDispute, setSelectedSessionForDispute] = useState<SessionPayrollRecord | null>(null);
  const [disputeType, setDisputeType] = useState<string>('');
  const [disputeContent, setDisputeContent] = useState<string>('');
  const [disputeAttachment, setDisputeAttachment] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  type ColumnKey='lesson'|'date'|'time'|'class'|'students'|'attendance'|'kind'|'status'|'credit';
  const [columnFilters,setColumnFilters]=useState<Partial<Record<ColumnKey,string[]>>>({});
  const [viewingSessionId,setViewingSessionId]=useState<string|null>(null);
  useEffect(()=>{setColumnFilters({});setViewingSessionId(null);},[selectedMonth,currentUser.id]);
  useEffect(()=>{if(!viewingSessionId)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setViewingSessionId(null);};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[viewingSessionId]);

  // Tìm hồ sơ đối soát của nhân sự đang đăng nhập
  const monthData = payrollStore[selectedMonth] || {
    isLocked: false,
    adminSentNotice: false,
    teachers: [],
    disputes: []
  };

  const ownTeacher = resolveAccountTeacher(currentUser, teachers, users);
  const savedRecord = ownTeacher
    ? monthData.teachers.find(record => record.teacherId === ownTeacher.id)
    : undefined;

  const pendingSessions=useMemo(()=>ownTeacher?pendingLessonWork({lessons:datedLessons,credited:(savedRecord?.sessions||[]).map(row=>({...row,teacherId:ownTeacher.id})),classes,teachers,students,slots:timeSlots,month:selectedMonth,now:clockNow}).filter(row=>row.teacherId===ownTeacher.id):[],[datedLessons,savedRecord,classes,teachers,students,timeSlots,selectedMonth,ownTeacher?.id,clockNow]);
  const myRecord=savedRecord||(ownTeacher&&pendingSessions.length?{teacherId:ownTeacher.id,teacherName:ownTeacher.name,staffRole:'GIAO_VIEN' as const,subject:ownTeacher.subject,subjectName:ownTeacher.subjectName,reconcileStatus:undefined,payrollSent:false,sessions:[]}:undefined);
  const completedSessions = useMemo(() => ownTeacher
    ? visibleTeacherWork([...lessonWorkDetails(savedRecord?.sessions || [],datedLessons),...pendingSessions],datedLessons,ownTeacher.id,clockNow) : [],
    [savedRecord,datedLessons,ownTeacher?.id,clockNow,pendingSessions]);
  const reconcileLabel=(session:SessionPayrollRecord)=>session.isPendingCredit?'—':({DA_XAC_NHAN:'Đã xác nhận',CO_GIAI_TRINH:'Có giải trình',DA_CHOT:'Đã chốt'} as Record<string,string>)[session.reconcileStatus||'']||'Chờ đối soát';
  const rowFields=(session:SessionPayrollRecord):Record<ColumnKey,string[]>=>({
    lesson:[lessonCode(session.lessonId||session.id)],date:[session.dateStr],time:[session.time],class:[session.classCode],students:session.studentNames?.length?session.studentNames:[session.studentName],attendance:[`Vào: ${session.checkin} · Ra: ${session.checkout}`],
    kind:[isIncidentWorkSession(session)?'Buổi sự cố':'Buổi chuẩn',...(session.type==='COVER'?['Cover']:[])],
    status:[reconcileLabel(session),lessonWorkStatus(session.lessonStatus),...(session.feedbackProgress?[`Nhận xét ${session.feedbackProgress.completed}/${session.feedbackProgress.total}`]:[])],credit:[session.isPendingCredit?'—':String(session.creditCoeff)]
  });
  const filteredSessions=completedSessions.filter(session=>Object.entries(columnFilters).every(([key,values])=>!values?.length||values.some(value=>rowFields(session)[key as ColumnKey].includes(value))));
  const column=(label:string,key:ColumnKey)=><MultiSelectColumnFilter label={label} values={columnFilters[key]||[]} onChange={values=>setColumnFilters(previous=>({...previous,[key]:values}))} options={Array.from(new Set(completedSessions.flatMap(session=>rowFields(session)[key]))).filter(Boolean).map(value=>({value,label:value}))}/>;
  const viewingSession=completedSessions.find(session=>session.id===viewingSessionId);

  // Các đơn giải trình của bản thân
  const myDisputes = useMemo(() => {
    if (!myRecord) return [];
    return (monthData.disputes || []).filter(d => d.teacherId === myRecord.teacherId);
  }, [monthData, myRecord]);

  // Thống kê cá nhân
  const stats = useMemo(() => {
    if (!myRecord) return { totalSessions: 0, totalCredit: 0, standard: 0, cover: 0, canceled: 0, late: 0 };
    const sessions = completedSessions.filter(session=>!session.isPendingCredit);
    const totalCredit = sessions.reduce((acc, s) => acc + (s.creditCoeff??0), 0);
    return {
      totalSessions: sessions.length,
      totalCredit: Number(totalCredit.toFixed(1)),
      standard: sessions.filter(s => s.type === 'STANDARD').length,
      cover: sessions.filter(s => s.type === 'COVER').length,
      canceled: sessions.filter(s => s.type === 'STUDENT_CANCELED').length,
      late: sessions.filter(s => s.type === 'LATE').length
    };
  }, [myRecord, completedSessions]);

  // Xuất file CSV / Excel cá nhân gửi bộ phận tính công
  const handleExportPersonalCsv = () => {
    if (!requirePermission("Xuất bảng công cá nhân")) return;
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
      'Trạng thái buổi học',
      'Nhận xét học sinh',
      'Hệ số công',
      'Số công tính',
      'Ghi chú đối soát'
    ];

    const rows = filteredSessions.map((s, idx) => [
      idx + 1,
      myRecord.teacherId,
      `"${myRecord.teacherName}"`,
      myRecord.staffRole === 'GIA_SU' ? 'Gia sư' : 'Giáo viên',
      lessonCode(s.lessonId||s.id),
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
      `"${lessonWorkStatus(s.lessonStatus)}"`,
      s.feedbackProgress?`${s.feedbackProgress.completed}/${s.feedbackProgress.total}`:'',
      s.isPendingCredit?'':s.creditCoeff,
      s.isPendingCredit?'':s.creditCoeff,
      `"${workNoteDisplay(s,lessonCode(s.lessonId||s.id)).replaceAll('"','""')}"`
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
    if(isSavingChanges)return;
    if (!requirePermission("Gửi giải trình / khiếu nại sai lệch ca dạy")) return;
    if (!myRecord || !selectedSessionForDispute) {
      showToast('Vui lòng chọn ca dạy cần giải trình!', 'error');
      return;
    }
    const latestSession=completedSessions.find(session=>session.id===selectedSessionForDispute.id);
    if (!latestSession || !(latestSession.reconciliationSent ?? myRecord.payrollSent)) {
      showToast('Ca này chưa được gửi yêu cầu đối soát.', 'warning');
      return;
    }
    if (monthData.isLocked) { showToast('Kỳ công đã khóa. Vui lòng liên hệ vận hành để mở lại kỳ.', 'warning'); return; }
    if (myDisputes.some(dispute => dispute.sessionId === selectedSessionForDispute.id && dispute.status === 'CHO_DUYET')) { showToast('Ca này đã có giải trình đang chờ duyệt.', 'warning'); return; }
    if (!disputeContent.trim()) {
      showToast('Vui lòng nhập nội dung giải trình chi tiết!', 'error');
      return;
    }
    if (!disputeType.trim()) { showToast('Vui lòng nhập vấn đề cần giải trình.', 'error'); return; }

    let evidence: string;
    try { evidence=normalizeWorkEvidence(disputeAttachment); }
    catch(error) { showToast(error instanceof Error ? error.message : 'Minh chứng không hợp lệ.', 'error'); return; }
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
      incidentType: disputeType.trim(),
      content: disputeContent,
      attachment: evidence,
      adminNote: ''
    };

    if (!submitDispute(selectedMonth, disputeItem)) return;
    void confirmSave(()=>{
    setShowDisputeModal(false);
    setSelectedSessionForDispute(null);
    setDisputeContent('');
    setDisputeType('');
    setDisputeAttachment('');
    });
  };

  if (!myRecord) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Đối soát công cá nhân</h2>
            <p className="mt-1 text-xs text-slate-500">Chọn kỳ hiện tại hoặc tháng trước để xem bảng công.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4" />
            Kỳ công
            <ReportSelect
              value={selectedMonth}
              onChange={event => setSelectedMonth(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
            >
              {payrollMonthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </ReportSelect>
          </label>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chưa có dữ liệu đối soát công của bạn trong {selectedMonth}.
        </div>
      </div>
    );
  }

  const isTutor = myRecord.staffRole === 'GIA_SU';
  const canDisputeSession = (session: SessionPayrollRecord) =>
    canDisputeTeacherWork(session,monthData.isLocked,Boolean(myRecord.payrollSent),can('Gửi giải trình / khiếu nại sai lệch ca dạy'),myDisputes);

  return (
    <div className="space-y-6">
      {/* Header Banner Cổng Giáo viên & Gia sư */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Bảng Đối Soát Công Giảng Dạy</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Công cá nhân cập nhật đến hiện tại. Giải trình được mở khi vận hành gửi yêu cầu đối soát cho ca dạy.
          </p>
        </div>

        {/* Chọn kỳ & Hành động */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">

            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <ReportSelect
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-2 cursor-pointer"
            >
              {payrollMonthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </ReportSelect>
          </div>

          {/* Nút xuất file đối soát công cá nhân */}
          <button
            disabled={!can("Xuất bảng công cá nhân")} onClick={handleExportPersonalCsv}
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
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Tổng ca tính công</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gồm ca dạy và ca nghỉ có công sự cố</div>
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
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Trạng thái gửi đối soát</div>
          <div className="mt-1">
            {myRecord.payrollSent ? (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                Đã gửi
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-xs">
                Chưa gửi
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {monthData.isLocked
              ? 'Kỳ công đã chốt'
              : myRecord.reconcileStatus === 'CO_GIAI_TRINH'
              ? 'Có giải trình đang xử lý'
              : myDisputes.length > 0
              ? `${myDisputes.length} đơn giải trình`
              : 'Trạng thái đối soát kỳ này'}
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
            Hiển thị: <span className="font-bold text-slate-800">{filteredSessions.length}/{completedSessions.length}</span> ca dạy
            {Object.values(columnFilters).some(values=>values?.length)&&<button type="button" onClick={()=>setColumnFilters({})} className="ml-2 text-orange-600 hover:underline">Xóa lọc</button>}
            {pendingSessions.length>0&&<span className="ml-2 text-amber-700">· {pendingSessions.length} buổi chưa có công, nhận xét chưa đầy đủ</span>}
          </div>
        </div>

        <div className="workspace-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng dữ liệu có thể cuộn">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <th className="py-3 px-4">{column('Mã buổi','lesson')}</th>
                <th className="py-3 px-4">{column('Ngày dạy','date')}</th>
                <th className="py-3 px-4">{column('Khung giờ','time')}</th>
                <th className="py-3 px-4">{column('Lớp học','class')}</th>
                <th className="py-3 px-4">{column('Học sinh / Nhóm','students')}</th>
                <th className="py-3 px-4">{column('Vào / Ra','attendance')}</th>
                <th className="py-3 px-4">{column('Loại buổi','kind')}</th>
                <th className="py-3 px-4">{column('Trạng thái','status')}</th>
                <th className="py-3 px-4 text-center">{column('Công','credit')}</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <PaginatedTableBody className="divide-y divide-slate-100">
              {!filteredSessions.length&&<tr><td colSpan={10} className="p-6 text-center text-slate-500">Không có buổi học phù hợp với bộ lọc.</td></tr>}
              {filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{lessonCode(session.lessonId||session.id)}</td>
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
                  <td className="py-3 px-4"><span className={'inline-block rounded-md px-2 py-0.5 text-[10px] font-bold '+(isIncidentWorkSession(session)?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800')}>{isIncidentWorkSession(session)?'Buổi sự cố':'Buổi chuẩn'}</span>{session.type==='COVER'&&<span className="ml-1 inline-block rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Cover</span>}</td>
                  <td className="py-3 px-4"><span className="text-[11px] text-slate-700">{session.isPendingCredit?lessonWorkStatus(session.lessonStatus):reconcileLabel(session)}</span><div className="mt-1 text-[11px] text-slate-500">{!session.isPendingCredit?lessonWorkStatus(session.lessonStatus):''}{session.feedbackProgress?((session.isPendingCredit?'':' · ')+`Nhận xét ${session.feedbackProgress.completed}/${session.feedbackProgress.total}`):''}</div></td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">
                      {session.isPendingCredit?'—':session.creditCoeff}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button type="button" onClick={()=>setViewingSessionId(session.id)} aria-label={'Xem chi tiết buổi '+lessonCode(session.lessonId||session.id)} title="Xem chi tiết" className="mr-2 inline-flex rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4"/></button>
                    <button
                      disabled={!canDisputeSession(session) || myDisputes.some(dispute => dispute.sessionId === session.id && dispute.status === 'CHO_DUYET')}
                      title={session.isPendingCredit?'Buổi học chưa được ghi công':monthData.isLocked ? 'Kỳ công đã khóa' : !canDisputeSession(session) ? 'Chờ quản trị gửi yêu cầu đối soát' : 'Gửi giải trình ca dạy'}
                      onClick={() => {
                        setSelectedSessionForDispute(session);
                        setShowDisputeModal(true);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline p-1 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                    >
                      Giải trình
                    </button>
                  </td>
                </tr>
              ))}
            </PaginatedTableBody>
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
                    <span className="font-bold text-slate-800">Ca {lessonCode(d.sessionId)}</span>
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
                <WorkEvidenceLinks value={d.attachment} />
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

      {viewingSession&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={event=>{if(event.target===event.currentTarget)setViewingSessionId(null);}}>
        <div role="dialog" aria-modal="true" aria-label="Chi tiết buổi dạy" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h3 className="font-bold text-slate-800">Chi tiết buổi dạy</h3><p className="mt-1 font-mono text-xs text-slate-500">{lessonCode(viewingSession.lessonId||viewingSession.id)}</p></div><button type="button" aria-label="Đóng chi tiết buổi dạy" onClick={()=>setViewingSessionId(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
          <dl className="grid grid-cols-1 gap-4 overflow-y-auto p-5 text-xs sm:grid-cols-2">{[
            ['Nhân sự',`${myRecord.teacherName} (${myRecord.teacherId})`],
            ['Ngày & giờ',`${viewingSession.dateStr} · ${viewingSession.time}`],
            ['Lớp học',`${viewingSession.classCode} · ${viewingSession.className}`],
            ['Học sinh / sĩ số',`${viewingSession.studentNames?.join(', ')||viewingSession.studentName} · ${viewingSession.studentCount??viewingSession.studentNames?.length??'—'} HS`],
            ['Phân loại',(isIncidentWorkSession(viewingSession)?'Buổi sự cố':'Buổi chuẩn')+(viewingSession.type==='COVER'?' · Cover':'')],
            ['Điểm danh vào / ra',`${viewingSession.checkin} / ${viewingSession.checkout}`],
            ['Thời lượng',viewingSession.durationMinutes!=null?`${viewingSession.durationMinutes} phút`:'—'],
            ['Trạng thái buổi',lessonWorkStatus(viewingSession.lessonStatus)],
            ['Trạng thái đối soát',reconcileLabel(viewingSession)],
            ['Nhận xét học sinh',viewingSession.feedbackProgress?`${viewingSession.feedbackProgress.completed}/${viewingSession.feedbackProgress.total}`:'—'],
            ['Hệ số ghi nhận',viewingSession.isPendingCredit?'—':String(viewingSession.creditCoeff)],
            ...(isIncidentWorkSession(viewingSession)?[['Sự cố',viewingSession.statusText]]:[]),
            ['Ghi chú đối soát',workNoteDisplay(viewingSession,lessonCode(viewingSession.lessonId||viewingSession.id))||'Không có ghi chú'],
            ...(viewingSession.dispute?[['Giải trình liên quan',viewingSession.dispute.content]]:[])
          ].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-semibold text-slate-800">{value}</dd></div>)}</dl>
          <div className="flex justify-end border-t border-slate-200 p-4"><button type="button" onClick={()=>setViewingSessionId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Đóng</button></div>
        </div>
      </div>}

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
                <ReportSelect
                  value={selectedSessionForDispute?.id || ''}
                  onChange={e => {
                    const found = completedSessions.find(s => s.id === e.target.value);
                    setSelectedSessionForDispute(found || null);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Chọn ca học --</option>
                  {completedSessions.filter(canDisputeSession).map(s => (
                    <option key={s.id} value={s.id}>
                      {lessonCode(s.lessonId||s.id)} - {s.dateStr} ({s.time}) - {s.className} ({s.creditCoeff} công)
                    </option>
                  ))}
                </ReportSelect>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Vấn đề cần giải trình:</label>
                <input
                  type="text"
                  value={disputeType}
                  onChange={e => setDisputeType(e.target.value)}
                  placeholder="Mô tả ngắn vấn đề cần đối soát"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                />
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
                <label className="block text-slate-600 font-semibold mb-1">Liên kết minh chứng (không bắt buộc):</label>
                <textarea
                  rows={3}
                  value={disputeAttachment}
                  onChange={e => setDisputeAttachment(e.target.value)}
                  placeholder="Mỗi dòng một liên kết https://…"
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
                disabled={!can("Gửi giải trình / khiếu nại sai lệch ca dạy")} onClick={handleSubmitDispute}
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
                  {completedSessions.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2">{s.dateStr}</td>
                      <td className="p-2 font-mono font-medium">{lessonCode(s.lessonId||s.id)}</td>
                      <td className="p-2 font-mono">{s.classCode}</td>
                      <td className="p-2">{s.statusText}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">{s.isPendingCredit?'—':s.creditCoeff}</td>
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
                  if (!requirePermission("Xuất bảng công cá nhân")) return;
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
