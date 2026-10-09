import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Video,
  ExternalLink,
  PlayCircle,
  Play,
  Pause,
  Volume2,
  Maximize2,
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

export const TeacherEvaluationView: React.FC = () => {
  const { currentUser, teachers, classes, showToast, users, setTeachers } = useApp();

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
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);

  // Modal lập biên bản đánh giá buổi học mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClassCode, setNewClassCode] = useState('TOAN_K03_NT2_13_01');
  const [newSessionName, setNewSessionName] = useState('Tiết 3: Luyện tập phép tính chia và giải toán có lời văn');
  const [newSessionNum, setNewSessionNum] = useState(3);
  const [newEvalDate, setNewEvalDate] = useState('2026-10-10');
  const [newEvaluatorName, setNewEvaluatorName] = useState('ThS. Hoàng Ngọc Mai');
  const [newEvaluatorRole, setNewEvaluatorRole] = useState('Trưởng ban Chuyên môn');
  const [newTc1, setNewTc1] = useState(9.0);
  const [newTc2, setNewTc2] = useState(8.5);
  const [newTc3, setNewTc3] = useState(9.0);
  const [newComment, setNewComment] = useState('Giáo viên giảng bài nhiệt tình, nắm vững mục tiêu bài học.');
  const [newStrengths, setNewStrengths] = useState('Kiểm soát tốt lớp học, giải thích mạch lạc.');
  const [newImprovements, setNewImprovements] = useState('Tăng cường thời lượng làm bài độc lập của học sinh.');

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

  const handleCreateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTeacherAccount || !currentTeacher) return;
    const finalScore = Number(((newTc1 * 0.25) + (newTc2 * 0.5) + (newTc3 * 0.25)).toFixed(1));
    const targetClass = classes.find(c => c.code === newClassCode);

    const newRecord: EvaluationRecord = {
      id: `BB-${Date.now()}`,
      reportCode: `BBDG/2026/${Math.floor(100 + Math.random() * 900)}`,
      evaluationDate: newEvalDate,
      evaluatorName: newEvaluatorName,
      evaluatorRole: newEvaluatorRole,
      classCode: newClassCode,
      className: targetClass ? targetClass.name : 'Lớp học Vuihoc Tutor',
      sessionNum: Number(newSessionNum),
      sessionName: newSessionName,
      timeSlot: '18:00 - 19:30',
      model: targetClass?.model || '1-3',
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

    setTeachers(prev => prev.map(t => t.id === currentTeacher.id ? {
      ...t, evaluationReports: [newRecord, ...(t.evaluationReports || [])]
    } : t));

    setIsCreateModalOpen(false);
    showToast(`Đã lập thành công Biên bản đánh giá dự giờ [${newRecord.reportCode}] cho ${currentTeacher.name}!`, 'success');
  };

  if (!currentTeacher) return <div className="p-6 bg-white rounded-xl">Chưa có hồ sơ giáo viên liên kết với tài khoản này.</div>;

  return (
    <div className="space-y-6 font-infer">
      {/* Header Banner phong cách Figma */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="space-y-3">
            {filteredRecords.map(record => (
              <div
                key={record.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
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
          </div>
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
                      {viewingRecord.classCode}
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
                      href={viewingRecord.roomLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 flex items-center gap-1 transition-colors"
                      title="Mở phòng học Zoom trực tiếp"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Vào phòng học</span>
                    </a>
                    <a
                      href={viewingRecord.recordLink || undefined}
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

                {/* Khung Video Bản ghi bài giảng (Recording Player) */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
                  <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-between p-3 select-none">
                    <div className="flex items-center justify-between text-xs text-white/90 z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-semibold text-[11px] tracking-wide">RECORDER BÀI GIẢNG FULL HD 1080P</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">01:28:45</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                        <span>Phòng: Vuihoc Tutor Room 01</span>
                      </div>
                    </div>

                    <div className="relative flex-1 flex items-center justify-center my-2">
                      <div className="w-full h-full bg-emerald-950/40 rounded-xl border border-emerald-500/20 p-3 flex flex-col justify-between text-white/80">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">
                              Bảng tương tác bài giảng
                            </div>
                            <h4 className="text-sm font-bold text-white mt-0.5">
                              {viewingRecord.sessionName}
                            </h4>
                            <p className="text-[11px] text-slate-300 mt-1">
                              Lớp: {viewingRecord.className} &bull; Khung giờ: {viewingRecord.timeSlot}
                            </p>
                          </div>

                          <div className="w-28 h-20 bg-slate-800 rounded-lg border border-white/20 overflow-hidden relative shadow-lg flex flex-col justify-between p-1">
                            <div className="text-[9px] font-bold text-white/90 bg-black/50 px-1 rounded self-start truncate max-w-[90px]">
                              {currentTeacher.name.split(' ').slice(-1)[0]} (GV)
                            </div>
                            <div className="flex items-center justify-center text-orange-300 text-xs font-bold">
                              🎥 Mic On
                            </div>
                            <div className="text-[9px] text-emerald-400 font-mono text-right">● HD 30fps</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setIsPlayingRecording(!isPlayingRecording)}
                            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                          >
                            {isPlayingRecording ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Mô hình lớp: {viewingRecord.model}</span>
                          <span className="text-emerald-400 font-mono">Đường truyền ổn định (Ping: 18ms)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 z-10">
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                        <div className="bg-indigo-500 h-full rounded-full w-3/5" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/80 pt-0.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPlayingRecording(!isPlayingRecording)}
                            className="hover:text-white cursor-pointer"
                          >
                            {isPlayingRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <Volume2 className="w-4 h-4 text-white/70" />
                          <span className="text-[11px] font-mono text-white/70">52:10 / 90:00</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-white/60">Tốc độ tua:</span>
                          {[1, 1.25, 1.5].map(speed => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => setVideoSpeed(speed)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                                videoSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Thẻ Thông tin Ca học chuẩn Tutor Screen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs">
                    <span className="font-bold text-slate-800 block">Thời gian ca dạy</span>
                    <div className="text-slate-600 font-medium">{viewingRecord.evaluationDate}</div>
                    <div className="text-[11px] font-mono text-indigo-700 font-semibold">{viewingRecord.timeSlot}</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Check-in: Đúng giờ quy định</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">Phòng học Zoom/ClassIn</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">Phòng: Vuihoc Room 01</div>
                      <div className="text-[11px] font-mono text-slate-600">ID: 988 776 655 (Pass: 2026)</div>
                    </div>
                    <a
                      href={viewingRecord.roomLink || undefined}
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
                      <span className="text-indigo-600 font-medium">Slide_Tiet_{viewingRecord.sessionNum}.pdf</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Bài tập HS:</span>
                      <span className="text-indigo-600 font-medium">BTVN_Pack_{viewingRecord.sessionNum}.docx</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">LMS:</span>
                      <span className="text-emerald-600 font-medium">Hoàn thành 100%</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách học sinh tham gia ca dạy & Điểm danh */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Danh sách Học sinh &amp; Điểm danh ca dạy</span>
                    </h5>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      100% Chuyên cần
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                          GB
                        </div>
                        <div>
                          <span className="font-bold text-slate-800">Trần Gia Bảo</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">HS-2026-089</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          Có mặt (Check-in 17:58)
                        </span>
                        <span className="text-slate-500">Phát biểu 5 lần</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                          AI: Tiếp thu xuất sắc
                        </span>
                      </div>
                    </div>
                    {viewingRecord.model !== '1-1' && (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center">
                            ĐA
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Bùi Đức Anh</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">HS-2026-033</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            Có mặt (Check-in 17:55)
                          </span>
                          <span className="text-slate-500">Hoàn thành 100% BT</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                            AI: Tương tác tốt
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nhật ký buổi học của Gia sư (Lesson Diary) */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>Nhật ký buổi học của Gia sư (Lesson Diary)</span>
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700">Ghi nhận sau buổi học</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed italic bg-white/80 p-2 rounded-lg border border-amber-100">
                      &ldquo;Buổi học diễn ra đúng giáo trình tiết học. Học sinh nắm bài tốt, hoàn thành các bài tập ví dụ trên lớp và tham gia mini game tính nhẩm hào hứng. Đã giao bài tập về nhà và hướng dẫn phương pháp tự giải.&rdquo;
                    </p>
                  </div>
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
                  <label className="block font-semibold text-slate-700 mb-1">Chọn lớp học dự giờ:</label>
                  <select
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.code}>
                        {c.code} - {c.name}
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
                    value={newSessionNum}
                    onChange={e => setNewSessionNum(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên buổi / Tiết học dự giờ:</label>
                <input
                  type="text"
                  required
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
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
