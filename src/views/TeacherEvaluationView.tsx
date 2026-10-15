import { PaginatedList } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Video,
  ExternalLink,
  PlayCircle,
  BookOpen,
  Users,
  FileText,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Send,
  Download,
  Mail,
  Award,
  Sparkles,
  X
} from 'lucide-react';

import { EvaluationRecord } from '../types';
import { resolveTeacherAccount, sessionDateISO } from '../lib/evaluation';
import { inspectionSession, isCompletedInspectionLesson } from '../lib/inspectionSession';
import { useBusinessValue, waitForBusinessSave } from '../lib/businessPersistence';
import type { TeachingLesson } from '../lib/teachingSessionDetails';

export const TeacherEvaluationView: React.FC = () => {
  const { can, requirePermission } = usePermissions();
  const { currentUser, teachers, classes, showToast, users, students, timeSlots } = useApp();
  const [datedLessons] = useBusinessValue<TeachingLesson[]>('dated_lessons');
  const [, setEvaluations] = useBusinessValue<EvaluationRecord[]>('teacher_evaluations');
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  // Tìm hồ sơ giáo viên đang đăng nhập hoặc mặc định
  const isTeacherAccount = currentUser.role === 'Giáo viên Giảng dạy';
  const defaultTeacher = teachers.find(t => resolveTeacherAccount(t, users)?.id === currentUser.id);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacher?.id || teachers[0]?.id || '');
  const currentTeacher = isTeacherAccount ? defaultTeacher : teachers.find(t => t.id === selectedTeacherId);

  // Lọc thời gian biên bản
  const [filterSchoolYear, setFilterSchoolYear] = useState('2026 - 2027');
  const [filterMonth, setFilterMonth] = useState('ALL');

  // Modal xem toàn văn biên bản
  const [viewingRecord, setViewingRecord] = useState<EvaluationRecord | null>(null);

  const viewingSource = inspectionSession(viewingRecord?.lessonId || viewingRecord?.sessionCode || '', classes, datedLessons, timeSlots);
  const viewingDetail = viewingSource?.lesson.materials;
  const viewingSession = viewingSource?.lesson.inspectionData;
  const viewingStudentIds = viewingSession?.studentIds || viewingSource?.lesson.feedbackProgress?.studentIds || [];
  const viewingStudents = students.filter(s => viewingStudentIds.includes(s.id));
  const viewingRoomLink = viewingSource?.session.roomLink || '';
  const viewingRecordingLink = viewingSource?.session.recordLink || '';

  // Modal lập biên bản đánh giá buổi học mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionCode, setNewSessionCode] = useState('');
  const availableSessions = datedLessons.map(lesson => inspectionSession(lesson.id || '', classes, datedLessons, timeSlots)).filter(source => source &&
    isCompletedInspectionLesson(source.lesson) &&
    (source.lesson.coverTeacherId || source.lesson.primaryTeacherId) === currentTeacher?.id);
  const newSession = availableSessions.find(source => source?.session.code === newSessionCode);
  const [newEvalDate, setNewEvalDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }));
  const [newEvaluatorName, setNewEvaluatorName] = useState(currentUser.name);
  const [newEvaluatorRole, setNewEvaluatorRole] = useState<string>(currentUser.role);
  const [newTc1, setNewTc1] = useState(0);
  const [newTc2, setNewTc2] = useState(0);
  const [newTc3, setNewTc3] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [newStrengths, setNewStrengths] = useState('');
  const [newImprovements, setNewImprovements] = useState('');

  const currentRecords = [...(currentTeacher?.evaluationReports || []).filter(r => !isTeacherAccount || r.recipientUserId === currentUser.id)];

  // Lọc theo tháng
  const filteredRecords = currentRecords.filter(r => {
    const iso = sessionDateISO({ date: r.evaluationDate } as any);
    const startYear = Number(filterSchoolYear.split(' - ')[0]);
    const inSchoolYear = iso >= `${startYear}-09-01` && iso <= `${startYear + 1}-08-31`;
    return inSchoolYear && (filterMonth === 'ALL' || iso.slice(5, 7) === filterMonth.padStart(2, '0'));
  });

  // Điểm trung bình các buổi dự giờ
  const averageScore = currentRecords.length > 0
    ? (currentRecords.reduce((acc, r) => acc + r.overallScore, 0) / currentRecords.length).toFixed(1)
    : '—';

  const handleCreateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirePermission("Chấm điểm và cập nhật báo cáo dự giờ")) return;
    e.preventDefault();
    if (isTeacherAccount || !currentTeacher || savingEvaluation) return;
    if (!newSession?.sessionNum) { showToast('Vui lòng chọn ca dạy có số buổi từ ca gốc. Nếu thiếu, hãy cập nhật truy vấn dự giờ.', 'error'); return; }
    const finalScore = Number(((newTc1 * 0.25) + (newTc2 * 0.5) + (newTc3 * 0.25)).toFixed(1));
    const targetClass = newSession.cls;

    const newRecord: EvaluationRecord = {
      id: crypto.randomUUID(),
      teacherId: currentTeacher.id,
      lessonId: newSession.lesson.id,
      sessionCode: newSession.session.code,
      sessionDate: newSession.lesson.date,
      sentAt: new Date().toISOString(),
      recipientUserId: resolveTeacherAccount(currentTeacher, users)?.id,
      evaluatorUserId: currentUser.id,
      reportCode: `BBDG/${new Date().getFullYear()}/${crypto.randomUUID()}`,
      evaluationDate: newEvalDate,
      evaluatorName: newEvaluatorName,
      evaluatorRole: newEvaluatorRole,
      classCode: targetClass.code,
      className: targetClass.name,
      sessionNum: newSession.sessionNum,
      sessionName: newSession.session.name,
      timeSlot: newSession.session.slot,
      model: targetClass.model,
      roomLink: newSession.session.roomLink,
      recordLink: newSession.session.recordLink,
      overallScore: finalScore,
      rank: finalScore >= 9.0 ? 'Xuất sắc' : finalScore >= 8.0 ? 'Tốt' : 'Khá',
      criteriaScores: {
        tc1: Number(newTc1),
        tc2: Number(newTc2),
        tc3: Number(newTc3)
      },
      generalComment: newComment,
      strengths: newStrengths,
      improvements: newImprovements,
      recommendations: 'Lưu vào hồ sơ chuyên môn định kỳ của giáo viên.',
      status: 'DA_DUYET'
    };

    setSavingEvaluation(true);
    try {
      setEvaluations(prev => [newRecord, ...prev]);
      await waitForBusinessSave();
      setIsCreateModalOpen(false);
      showToast(`Đã lập thành công Biên bản đánh giá dự giờ [${newRecord.reportCode}] cho ${currentTeacher.name}!`, 'success');
    } catch (error) { showToast((error as Error).message, 'error'); }
    finally { setSavingEvaluation(false); }
  };

  if (!currentTeacher) return <div className="p-6 bg-white rounded-xl">Chưa có hồ sơ giáo viên liên kết với tài khoản này.</div>;

  return (
    <div className="space-y-6 font-infer">
      {/* Header Banner phong cách Figma */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider border border-slate-200">
              CHUYÊN MÔN SƯ PHẠM
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Năm học {filterSchoolYear}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentRecords.length} biên bản dự giờ
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-2">
            Hồ Sơ Chuyên Môn &amp; Biên Bản Đánh Giá Dự Giờ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp các biên bản thẩm định chất lượng dạy học của Ban Chuyên môn theo từng buổi học, từng lớp và tiêu chuẩn sư phạm.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Điểm sư phạm trung bình</div>
            <div className="text-lg font-black text-emerald-600">
              {averageScore} / 10.0 ({Number(averageScore) >= 9.0 ? 'Hạng A' : 'Hạng B'})
            </div>
          </div>
          {!isTeacherAccount && <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            + Lập Biên Bản Dự Giờ Mới
          </button>}
        </div>
      </div>

      {/* Switcher chọn giáo viên & Thanh lọc thời gian */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Giáo viên / Gia sư:</span>
            <span className="font-bold text-indigo-700">{currentTeacher?.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {currentTeacher?.id}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentTeacher?.subjectName || 'Môn học'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isTeacherAccount && <>
            <span className="text-slate-500 text-[11px]">Chọn hồ sơ:</span>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subjectName || t.subject}) - {t.id}
                </option>
              ))}
            </select>

            </>}
            <span className="text-slate-300">|</span>

            <span className="text-slate-500 text-[11px]">Năm học:</span>
            <select
              value={filterSchoolYear}
              onChange={e => setFilterSchoolYear(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="2026 - 2027">2026 - 2027 (Hiện tại)</option>
              <option value="2025 - 2026">2025 - 2026</option>
            </select>

            <span className="text-slate-500 text-[11px]">Tháng:</span>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tất cả các tháng</option>
              <option value="09">Tháng 09/2026</option>
              <option value="10">Tháng 10/2026</option>
              <option value="11">Tháng 11/2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÁC BIÊN BẢN ĐÁNH GIÁ DỰ GIỜ CỦA CHUYÊN MÔN */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Danh Sách Biên Bản Đánh Giá Dự Giờ Từng Buổi Học ({filteredRecords.length} biên bản)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chuyên môn có thể dự giờ 1 hoặc nhiều buổi học. Bấm vào từng biên bản để xem chi tiết điểm 3 tiêu chí và biên bản chính thức.
            </p>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có biên bản đánh giá dự giờ nào trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <PaginatedList className="space-y-3">
            {filteredRecords.map(record => (
              <div
                key={record.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Thông tin biên bản & Buổi học */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                      {record.reportCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                      Ngày dự giờ: {record.evaluationDate}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      Xếp loại: {record.rank}
                    </span>
                  </div>

                  <div className="font-bold text-slate-800 text-sm">
                    {record.sessionName}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div>
                      Lớp: <span className="font-semibold text-slate-700">{record.className}</span> (
                      <span className="font-mono font-bold text-indigo-700">{record.classCode}</span>)
                    </div>
                    <div>
                      Mô hình: <span className="font-semibold text-slate-700">{record.model}</span>
                    </div>
                    <div>
                      Người dự giờ: <span className="font-semibold text-slate-700">{record.evaluatorName}</span> (
                      {record.evaluatorRole})
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 line-clamp-1 italic pt-0.5">
                    "{record.generalComment}"
                  </div>
                </div>

                {/* Điểm số 3 tiêu chí & Nút thao tác */}
                <div className="flex items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 flex-shrink-0">
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Điểm tổng</div>
                    <div className="text-base font-black text-emerald-600 font-mono">
                      {record.overallScore}
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400">TC1: Sư phạm</div>
                      <div className="font-bold text-slate-700 font-mono">{record.criteriaScores.tc1}</div>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400">TC2: Tương tác</div>
                      <div className="font-bold text-slate-700 font-mono">{record.criteriaScores.tc2}</div>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400">TC3: Thao tác</div>
                      <div className="font-bold text-slate-700 font-mono">{record.criteriaScores.tc3}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingRecord(record)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Xem Biên Bản Chi Tiết &rarr;
                  </button>
                </div>
              </div>
            ))}
          </PaginatedList>
        )}
      </div>

      {/* ================= MODAL: 2 CỘT CHI TIẾT CA DẠY (TRÁI) & PHIẾU CHẤM DỰ GIỜ (PHẢI) ================= */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header chung của Modal */}
            <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base">
                      Biên Bản Đánh Giá Dự Giờ: {viewingRecord.reportCode}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
                      {viewingSource?.cls.code || viewingRecord.classCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã thẩm định chính thức
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giáo viên: <strong className="text-slate-800 font-semibold">{currentTeacher.name}</strong> ({currentTeacher.id}) &bull; Người dự giờ: <strong className="text-indigo-700 font-semibold">{viewingRecord.evaluatorName}</strong> ({viewingRecord.evaluatorRole})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
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
                    <Video className="w-4 h-4 text-indigo-600" />
                    <span>Chi tiết Ca Dạy &amp; Màn Hình Buổi Học của Gia Sư</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={viewingRoomLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 flex items-center gap-1 transition-colors"
                      title="Mở phòng học Zoom trực tiếp"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Vào phòng học</span>
                    </a>
                    <a
                      href={viewingRecordingLink || undefined}
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

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {viewingRecordingLink ? <a href={viewingRecordingLink} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Mở bản ghi buổi học</a> : "Chưa có bản ghi buổi học."}
                </div>
                {/* 3 Thẻ Thông tin Ca học chuẩn Tutor Screen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs">
                    <span className="font-bold text-slate-800 block">Thời gian ca dạy</span>
                    <div className="text-slate-600 font-medium">{viewingSource?.lesson.date || viewingRecord.sessionDate || 'Chưa có ngày ca dạy'}</div>
                    <div className="text-[11px] font-mono text-indigo-700 font-semibold">{viewingSource?.session.slot || viewingRecord.timeSlot}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Check-in: {viewingSource?.session.checkin || 'Chưa có dữ liệu'}</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">Phòng học Zoom/ClassIn</span>
                      <div className="text-[11px] text-slate-500 mt-0.5 break-all">{viewingRoomLink || 'Chưa có link phòng học'}</div>
                    </div>
                    <a
                      href={viewingRoomLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 py-1.5 px-3 bg-[#FF5C00] hover:bg-[#E05200] text-white text-[11px] font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>VÀO LỚP</span>
                      <ChevronRight className="w-3.5 h-3.5 font-bold" />
                    </a>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs">
                    <span className="font-bold text-slate-800 block">Tài liệu / LMS</span>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Slide GV:</span>
                      <span className="text-indigo-600 font-medium break-all">{viewingDetail?.materialGv || viewingDetail?.slide || 'Chưa có tài liệu'}</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Bài tập HS:</span>
                      <span className="text-indigo-600 font-medium break-all">{viewingDetail?.materialHs || 'Chưa có tài liệu'}</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">LMS:</span>
                      <span className="text-emerald-600 font-medium break-all">{viewingDetail?.exerciseLms || viewingDetail?.lms || 'Chưa có dữ liệu'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h5 className="font-bold text-sm">Học sinh và điểm danh</h5>
                  {!viewingStudents.length && <p className="text-xs text-slate-500">Chưa có dữ liệu học sinh cho ca dạy.</p>}
                  {viewingStudents.map(student => <div key={student.id} className="rounded-lg border border-slate-100 p-3 text-xs">
                    <p className="font-semibold">{student.name} <span className="font-normal text-slate-400">{student.id}</span></p>
                    <p className="mt-1 text-slate-600">{({ present: "Có mặt", late: "Đi muộn", absent: "Vắng mặt" } as Record<string, string>)[viewingSession?.attendance?.[student.id] || ""] || "Chưa điểm danh"}</p>
                    <p className="mt-1 text-slate-500">{viewingSession?.feedback?.[student.id] || "Chưa có nhận xét."}</p>
                  </div>)}
                </div>
              </div>
              {/* ================= CỘT PHẢI (5/12 CỘT): BIÊN BẢN & PHIẾU CHẤM DỰ GIỜ ================= */}
              <div className="lg:col-span-5 p-5 bg-white overflow-y-auto space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                      <span>Phiếu Đánh Giá &amp; Biên Bản Dự Giờ</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Hạng {viewingRecord.rank}
                    </span>
                  </div>

                  {/* Quốc hiệu / Tiêu ngữ tiêu chuẩn */}
                  <div className="text-center pb-2 border-b border-slate-100 space-y-0.5">
                    <div className="font-bold uppercase text-[10px] text-slate-800">
                      HỆ THỐNG TRỰC TUYẾN VUIHOC TUTOR
                    </div>
                    <div className="font-semibold text-slate-600 text-[9px]">
                      HỘI ĐỒNG THẨM ĐỊNH CHẤT LƯỢNG SƯ PHẠM VÀ PHÁT TRIỂN GIÁO VIÊN
                    </div>
                    <div className="text-slate-400 text-[9px] font-mono">
                      Số biên bản: {viewingRecord.reportCode} - Ngày lập: {viewingRecord.evaluationDate}
                    </div>
                  </div>

                  {/* Bảng điểm chi tiết 3 tiêu chuẩn */}
                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-slate-800 text-xs">
                      Kết quả đánh giá theo 3 tiêu chí sư phạm Vuihoc:
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-[11px] text-slate-600">
                          <tr>
                            <th className="p-2">Tiêu chí đánh giá</th>
                            <th className="p-2 text-center w-16">Trọng số</th>
                            <th className="p-2 text-right w-20">Điểm đạt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          <tr>
                            <td className="p-2 font-medium text-slate-800">
                              1. Sư phạm &amp; Giáo án
                            </td>
                            <td className="p-2 text-center text-slate-500 font-mono">25%</td>
                            <td className="p-2 text-right font-bold text-indigo-700 font-mono">
                              {viewingRecord.criteriaScores.tc1} / 10
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium text-slate-800">
                              2. Tương tác &amp; Khích lệ
                            </td>
                            <td className="p-2 text-center text-slate-500 font-mono">50%</td>
                            <td className="p-2 text-right font-bold text-indigo-700 font-mono">
                              {viewingRecord.criteriaScores.tc2} / 10
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium text-slate-800">
                              3. Thao tác Công nghệ/Bảng vẽ
                            </td>
                            <td className="p-2 text-center text-slate-500 font-mono">25%</td>
                            <td className="p-2 text-right font-bold text-indigo-700 font-mono">
                              {viewingRecord.criteriaScores.tc3} / 10
                            </td>
                          </tr>
                          <tr className="bg-emerald-50 font-bold">
                            <td className="p-2 text-emerald-900">ĐIỂM TRUNG BÌNH CHUNG</td>
                            <td className="p-2 text-center text-emerald-700 font-mono">100%</td>
                            <td className="p-2 text-right text-emerald-700 text-sm font-mono">
                              {viewingRecord.overallScore} / 10.0
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nhận xét và khuyến nghị */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Điểm mạnh nổi bật:</span>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{viewingRecord.strengths}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Nội dung cần hoàn thiện:</span>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{viewingRecord.improvements}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Khuyến nghị từ Ban Chuyên môn:</span>
                      <p className="text-slate-600 mt-0.5 leading-relaxed italic">{viewingRecord.recommendations}</p>
                    </div>
                  </div>

                  {/* Chữ ký xác nhận */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      Trạng thái: <span className="font-bold text-emerald-700">Đã phê duyệt chính thức</span>
                    </div>
                    <div className="text-right">
                      <div>Xác nhận: <strong>{viewingRecord.evaluatorName}</strong></div>
                      <div className="text-[10px] text-slate-400">{viewingRecord.evaluatorRole}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => showToast('Đã gửi bản sao biên bản đánh giá về email giáo viên!', 'info')}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi Email</span>
                  </button>
                  <button
                    onClick={() => showToast('Đã xuất file biên bản dự giờ PDF thành công!', 'success')}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất PDF</span>
                  </button>
                  <button
                    onClick={() => setViewingRecord(null)}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LẬP BIÊN BẢN DỰ GIỜ BUỔI HỌC MỚI ================= */}
      {isCreateModalOpen && !isTeacherAccount && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Lập Biên Bản Đánh Giá Dự Giờ Buổi Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đánh giá cho giáo viên: <strong>{currentTeacher.name}</strong> ({currentTeacher.id})
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReportSubmit} className="p-5 space-y-4 text-xs">
              {/* Chọn lớp học & Buổi học */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn ca dạy dự giờ:</label>
                  <select
                    required
                    value={newSessionCode}
                    onChange={e => setNewSessionCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="">Chọn ca dạy đã có</option>
                    {availableSessions.map(source => source && (
                      <option key={source.session.code} value={source.session.code}>
                        {source.cls.code} · {source.lesson.date} · {source.session.slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Buổi số:</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newSession?.sessionNum || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên buổi / Tiết học dự giờ:</label>
                <input
                  type="text"
                  required
                  value={newSession?.session.name || ''}
                  readOnly
                  placeholder="Ví dụ: Tiết 3: Ôn tập phép tính phân số"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày dự giờ:</label>
                  <input
                    type="date"
                    required
                    value={newEvalDate}
                    onChange={e => setNewEvalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người dự giờ:</label>
                  <input
                    type="text"
                    required
                    value={newEvaluatorName}
                    onChange={e => setNewEvaluatorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức vụ:</label>
                  <input
                    type="text"
                    required
                    value={newEvaluatorRole}
                    onChange={e => setNewEvaluatorRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Chấm điểm 3 tiêu chí */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-xs block">Chấm điểm 3 tiêu chuẩn sư phạm (Thang 10):</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">TC1: Sư phạm (25%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={newTc1}
                      onChange={e => setNewTc1(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">TC2: Tương tác (50%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={newTc2}
                      onChange={e => setNewTc2(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">TC3: Thao tác (25%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={newTc3}
                      onChange={e => setNewTc3(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận xét chung buổi dạy:</label>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ưu điểm nổi bật:</label>
                  <textarea
                    rows={2}
                    value={newStrengths}
                    onChange={e => setNewStrengths(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cần khắc phục:</label>
                  <textarea
                    rows={2}
                    value={newImprovements}
                    onChange={e => setNewImprovements(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEvaluation || !newSession}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Lưu &amp; Ký Biên Bản Dự Giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
