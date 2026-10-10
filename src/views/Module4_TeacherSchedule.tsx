import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClassItem } from '../types';
import {
  Calendar,
  Sparkles,
  ExternalLink,
  Copy,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
  Video,
  BookOpen,
  AlertTriangle,
  Trash2,
  Play
} from 'lucide-react';

export const Module4_TeacherSchedule: React.FC = () => {
  const { classes, setClasses, students, teachers, reportIncidentToSession, showToast, currentUser } = useApp();

  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState('10/2026');
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [fromDate, setFromDate] = useState('2026-10-05');
  const [toDate, setToDate] = useState('2026-10-11');
  const [currentWeekLabel, setCurrentWeekLabel] = useState('Tuần: 05/10 - 11/10/2026');

  // Quản trị tri thức - Bot Chat hỗ trợ vận hành (SOP & Quy chế)
  const [isKnowledgeBotOpen, setIsKnowledgeBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Dạ em chào Thầy/Cô ạ! Em là Trợ lý Tri thức Vận hành Vuihoc Tutor. Em có thể giải đáp nhanh các quy định SOP: báo nghỉ trước ca, sự cố mất mạng/mất điện, quy trình xử lý học sinh vắng và chốt công đối soát.',
      time: 'Vừa xong'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Hàm xóa đoạn chat làm mới theo yêu cầu
  const handleClearChat = () => {
    setBotMessages([
      {
        sender: 'bot',
        text: 'Dạ em chào Thầy/Cô ạ! Em là Trợ lý Tri thức Vận hành Vuihoc Tutor. Em có thể giải đáp nhanh các quy định SOP: báo nghỉ trước ca, sự cố mất mạng/mất điện, quy trình xử lý học sinh vắng và chốt công đối soát.',
        time: 'Vừa xong'
      }
    ]);
    setChatInput('');
    showToast('Đã xóa toàn bộ dữ liệu đoạn chat!', 'info');
  };

  // Trạng thái buổi học: CHUA_DIEN_RA (chưa diễn ra), DANG_HOC (đang học), DA_HOAN_THANH (đã hoàn thành)
  const [classLiveStatus, setClassLiveStatus] = useState<'CHUA_DIEN_RA' | 'DANG_HOC' | 'DA_HOAN_THANH'>('CHUA_DIEN_RA');

  const quickQuestions = [
    'Quy định báo nghỉ trước ca dạy bao nhiêu tiếng?',
    'Sự cố mất mạng đột xuất trong ca dạy xử lý thế nào?',
    'Học sinh vắng không phép điểm danh ra sao?',
    'Thời hạn nộp giải trình đối soát công?',
    'Lỗi link phòng Zoom không vào được thì báo ai?'
  ];

  const handleSendQuestion = (questionText?: string) => {
    const q = (questionText || chatInput).trim();
    if (!q) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: q, time: timeStr };

    let botReply = '';
    const qLower = q.toLowerCase();

    if (qLower.includes('nghỉ') || qLower.includes('báo bận') || qLower.includes('cover')) {
      botReply = 'Dạ thưa Thầy/Cô, theo ĐIỀU 1 - SOP Báo nghỉ ca dạy Vuihoc Tutor:\n• Báo trước ít nhất 04 TIẾNG để Ban Vận hành kịp điều phối giáo viên dạy thay (Cover).\n• Báo dưới 02 tiếng sẽ tính là vi phạm mức 2 (ảnh hưởng đến đánh giá chuyên môn).\n• Thầy/Cô có thể bấm trực tiếp nút "Báo bận / Xin nghỉ" trên ca dạy hoặc nhắn vào Zalo Trực Ban Vận Hành nhé ạ!';
    } else if (qLower.includes('mất mạng') || qLower.includes('mất điện') || qLower.includes('thiết bị') || qLower.includes('mic') || qLower.includes('camera')) {
      botReply = 'Dạ thưa Thầy/Cô, theo ĐIỀU 2 - SOP Sự cố kỹ thuật trong ca dạy:\n• Trong 05 phút đầu: Dùng 4G điện thoại nhắn ngay vào Zalo Trực Ban Vận Hành ca trực.\n• Khắc phục tối đa trong 10 phút và bù giờ tương ứng cho học sinh.\n• Sau 10 phút chưa khắc phục được: Vận hành sẽ kích hoạt Giáo viên dạy thay khẩn cấp để đảm bảo quyền lợi học sinh.';
    } else if (qLower.includes('vắng') || qLower.includes('học sinh không vào') || qLower.includes('điểm danh')) {
      botReply = 'Dạ theo quy định Vận hành Lớp học:\n• Quá 05 phút học sinh chưa vào: Thầy/Cô bấm nút "Báo sự cố HS vắng" để Vận hành gọi điện cho phụ huynh ngay.\n• Sau ca dạy: Tích chọn trạng thái "Vắng không phép" và ghi chú vào Nhật ký buổi dạy để phục vụ chốt công.';
    } else if (qLower.includes('đối soát') || qLower.includes('giải trình') || qLower.includes('công') || qLower.includes('lương')) {
      botReply = 'Dạ theo Quy chế Đối soát công ca dạy:\n• Hệ thống khóa sổ kỳ công vào 23h59 Chủ nhật hàng tuần.\n• Thời hạn nộp giải trình khiếu nại sai lệch là trước 12h00 trưa Thứ 2 (kèm ảnh chụp màn hình minh chứng ca dạy).\n• Thầy/Cô vào mục "Đối soát công ca dạy" để gửi yêu cầu trực tiếp.';
    } else if (qLower.includes('zoom') || qLower.includes('phòng') || qLower.includes('link')) {
      botReply = 'Dạ link phòng học Zoom/ClassIn được Vận hành gắn cố định trên từng ô ca dạy. Nếu link báo hết hạn hoặc không vào được, Thầy/Cô nhấn nút "Báo sự cố" hoặc liên hệ trực tiếp Hot-line Vận hành Vuihoc Tutor nhé ạ!';
    } else {
      botReply = 'Dạ vấn đề này Thầy/Cô có thể tham khảo thêm tại tài liệu SOP Vận hành hoặc liên hệ trực ban Zalo Vận hành để được hỗ trợ tức thì ạ!';
    }

    setBotMessages(prev => [...prev, userMsg, { sender: 'bot', text: botReply, time: timeStr }]);
    setChatInput('');
  };

  const weekOptions = [
    { id: 'W1', label: 'Tuần 1 (05/10/2026 - 11/10/2026)', from: '2026-10-05', to: '2026-10-11' },
    { id: 'W2', label: 'Tuần 2 (12/10/2026 - 18/10/2026)', from: '2026-10-12', to: '2026-10-18' },
    { id: 'W3', label: 'Tuần 3 (19/10/2026 - 25/10/2026)', from: '2026-10-19', to: '2026-10-25' },
    { id: 'W4', label: 'Tuần 4 (26/10/2026 - 01/11/2026)', from: '2026-10-26', to: '2026-11-01' }
  ];

  const handleWeekSelect = (wId: string) => {
    setSelectedWeek(wId);
    const found = weekOptions.find(w => w.id === wId);
    if (found) {
      setFromDate(found.from);
      setToDate(found.to);
      setSelectedMonth(`${found.from.slice(5, 7)}/${found.from.slice(0, 4)}`);
      setCurrentWeekLabel(`Tuần: ${new Date(`${found.from}T00:00:00`).toLocaleDateString('vi-VN')} - ${new Date(`${found.to}T00:00:00`).toLocaleDateString('vi-VN')}`);
    }
  };
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedSessionNum, setSelectedSessionNum] = useState<number>(1);

  // AI Review modal state
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState(false);
  const [aiReviewStudentName, setAiReviewStudentName] = useState('Trần Gia Bảo');
  const [aiGeneratedText, setAiGeneratedText] = useState(
    'Hôm nay con tiếp thu bài rất nhanh, nắm vững 3 bước giải toán có lời văn và thực hiện phép tính cẩn thận. Con chú ý lắng nghe và hoàn thành tốt bài tập tại lớp. Thầy/Cô khen ngợi tinh thần học tập của con!'
  );

  const sampleAiTexts = [
    'Hôm nay con tiếp thu bài rất nhanh, nắm vững 3 bước giải toán có lời văn và thực hiện phép tính cẩn thận. Con chú ý lắng nghe và hoàn thành tốt bài tập tại lớp.',
    'Con hiểu bài tốt, thao tác tính toán nhanh và có tinh thần tự giác cao. Con cần chú ý đọc kỹ đề bài để tránh nhầm lẫn các đơn vị đo nhé!',
    'Con rất tích cực tương tác và đặt câu hỏi thông minh trong tiết học. Khen ngợi sự tập trung và cố gắng của con hôm nay!'
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép ${label}: "${text}"`, 'success');
    });
  };

  const handleOpenClassModal = (cls: ClassItem, sessionNum: number = 1) => {
    setSelectedClass(cls);
    setSelectedSessionNum(sessionNum);
    const currStatus = cls.activeSessions?.[sessionNum]?.status;
    if (currStatus === 'Đã hoàn thành') {
      setClassLiveStatus('DA_HOAN_THANH');
    } else {
      setClassLiveStatus('CHUA_DIEN_RA');
    }
  };

  const handleEnterClassroom = () => {
    if (!selectedClass || !selectedClass.roomLink) {
      showToast('Lớp học này chưa có link phòng Zoom/ClassIn do Vận hành gán!', 'warning');
      return;
    }
    // Chuyển trạng thái sang ĐANG_HOC để gia sư có thể xác nhận theo đúng quy trình
    setClassLiveStatus('DANG_HOC');
    showToast('Đang kết nối vào phòng học trực tuyến... Trạng thái ca: ĐANG HỌC!', 'info');
    setTimeout(() => {
      window.open(selectedClass.roomLink, '_blank');
    }, 400);
  };

  const handleConfirmCompleteSession = () => {
    if (!selectedClass) return;
    if (classLiveStatus !== 'DANG_HOC') {
      showToast('Lớp học chưa diễn ra! Chỉ khi ca học ở trạng thái "Đang học" mới có thể xác nhận hoàn tất.', 'warning');
      return;
    }
    setClasses(prev =>
      prev.map(c => {
        if (c.id === selectedClass.id) {
          const sessions = { ...(c.activeSessions || {}) };
          if (sessions[selectedSessionNum]) {
            sessions[selectedSessionNum] = {
              ...sessions[selectedSessionNum],
              status: 'Đã hoàn thành'
            };
          }
          return { ...c, activeSessions: sessions };
        }
        return c;
      })
    );
    setClassLiveStatus('DA_HOAN_THANH');
    showToast('Xác nhận hoàn tất ca dạy thành công! Nhật ký ca học đã được lưu vào hệ thống.', 'success');
  };

  const handleOpenAiReview = (studentName: string) => {
    setAiReviewStudentName(studentName);
    setIsAiReviewModalOpen(true);
  };

  const handleRegenerateAi = () => {
    const random = sampleAiTexts[Math.floor(Math.random() * sampleAiTexts.length)];
    setAiGeneratedText(random);
    showToast('AI đã tạo lại nhận xét theo tiêu chí môn học!', 'info');
  };

  const handleSaveAiReview = () => {
    setIsAiReviewModalOpen(false);
    showToast(`Đã lưu nhận xét AI cho học sinh [${aiReviewStudentName}]!`, 'success');
  };

  const defaultTeacher = teachers.find(
    t => t.id === currentUser.id || t.email === currentUser.email || t.name.includes(currentUser.name.replace('Thầy ', '').replace('Cô ', ''))
  ) || teachers[0];

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacher?.id || 'GV-001');

  const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || defaultTeacher;

  const teacherClasses = classes.filter(
    c => (currentTeacher && c.teacherId === currentTeacher.id) ||
         (currentTeacher && c.teacherName.includes(currentTeacher.name.replace('Thầy ', '').replace('Cô ', '')))
  );

  const scheduleEntriesForClass = (cls: ClassItem) => Array.from(
    cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
    match => ({
      dayIndex: match[3] ? 6 : Number(match[1]) - 2,
      time: (match[2] || match[4] || '').trim()
    })
  ).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).map((entry, index) => ({ ...entry, session: index + 1 }));

  const selectedWeekMaterial = (cls: ClassItem, session: number) => (cls.materials || []).find(material => {
    if (material.session !== session) return false;
    const startDate = material.week.match(/Từ ngày (\d{2})\/(\d{2})\/(\d{4})/);
    return Boolean(startDate && `${startDate[3]}-${startDate[2]}-${startDate[1]}` === fromDate);
  });

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${fromDate}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekDayNames = ['Thứ 2 / Mon', 'Thứ 3 / Tue', 'Thứ 4 / Wed', 'Thứ 5 / Thu', 'Thứ 6 / Fri', 'Thứ 7 / Sat', 'Chủ nhật / Sun'];
  const timetableSlots = Array.from(new Set(teacherClasses.flatMap(cls => scheduleEntriesForClass(cls).map(entry => entry.time)))).sort((a, b) => a.localeCompare(b));
  const teacherScheduleRows = timetableSlots.map(time => ({
    time,
    days: weekDates.map((_, dayIndex) => teacherClasses.flatMap(cls =>
      scheduleEntriesForClass(cls)
        .filter(entry => entry.time === time && entry.dayIndex === dayIndex)
        .map(entry => ({ cls, session: entry.session, material: selectedWeekMaterial(cls, entry.session) }))
    ))
  }));
  const selectedClassSchedule = selectedClass ? scheduleEntriesForClass(selectedClass) : [];
  const selectedClassMaterial = selectedClass ? selectedWeekMaterial(selectedClass, selectedSessionNum) : undefined;
  const shiftScheduleWeek = (offset: number) => {
    const start = new Date(`${fromDate}T00:00:00`);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const toInputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const nextFrom = toInputDate(start);
    const nextTo = toInputDate(end);
    setFromDate(nextFrom);
    setToDate(nextTo);
    setSelectedMonth(`${nextFrom.slice(5, 7)}/${nextFrom.slice(0, 4)}`);
    setSelectedWeek(weekOptions.find(week => week.from === nextFrom)?.id || '');
    setCurrentWeekLabel(`Tuần: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">Lịch Giảng Dạy &amp; Lớp Của Tôi</h1>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono">
              Giáo viên: {currentUser.name} ({currentUser.id})
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Năm học {selectedSchoolYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bấm trực tiếp vào từng ca dạy trên bảng để xem thông tin lớp, link vào phòng học Zoom/ClassIn và học liệu bài giảng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút mở Bot Chat Tri Thức Vận Hành (Chuẩn thiết kế màu cam) */}
          <button
            onClick={() => setIsKnowledgeBotOpen(!isKnowledgeBotOpen)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              isKnowledgeBotOpen
                ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-xs'
                : 'bg-white hover:bg-orange-50 text-[#FF5C00] border-orange-200 shadow-2xs'
            }`}
          >
            <span>Hỏi Trợ Lý Vận Hành (SOP)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-orange-100 text-[#FF5C00] font-bold">24/7</span>
          </button>

          <button
            onClick={() => showToast('Đã gửi yêu cầu hỗ trợ ca dạy đến bộ phận Vận hành!', 'info')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Yêu cầu hỗ trợ (Support)</span>
          </button>
        </div>
      </div>

      {/* THANH LỌC THỜI GIAN THEO YÊU CẦU: Năm học, Tháng, Tuần, Khoảng ngày áp dụng */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Năm học */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Năm học:</span>
              <select
                value={selectedSchoolYear}
                onChange={e => setSelectedSchoolYear(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="2026 - 2027">2026 - 2027 (Hiện tại)</option>
                <option value="2025 - 2026">2025 - 2026</option>
                <option value="2027 - 2028">2027 - 2028</option>
              </select>
            </div>

            {/* Tháng */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="09/2026">Tháng 09/2026</option>
                <option value="10/2026">Tháng 10/2026</option>
                <option value="11/2026">Tháng 11/2026</option>
                <option value="12/2026">Tháng 12/2026</option>
              </select>
            </div>

            {/* Tuần học */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Tuần học:</span>
              <select
                value={selectedWeek}
                onChange={e => handleWeekSelect(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {weekOptions.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Khoảng ngày hiệu lực Từ ngày - Đến ngày */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <span className="font-semibold text-slate-600">Khoảng thời gian:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setCurrentWeekLabel(`Từ: ${e.target.value} đến: ${toDate}`);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400">&rarr;</span>
              <input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setCurrentWeekLabel(`Từ: ${fromDate} đến: ${e.target.value}`);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Switcher chọn Giáo viên / Gia sư */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Lịch dạy của:</span>
            <span className="font-bold text-indigo-700">{currentTeacher?.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {currentTeacher?.id}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentTeacher?.name.includes('Gia sư') ? 'Gia sư 1-1 / Nhóm nhỏ' : 'Giáo viên Giảng dạy'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Đổi tài khoản:</span>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subjectName || t.subject}) - {t.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Thanh Chú Thích Màu Sắc & Bộ Chuyển Tuần */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-600">
          <span className="font-bold text-slate-700">Trạng thái ca:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Chưa học / Sắp tới
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Đã hoàn thành
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Nghỉ có phép
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-700" /> Dạy thay (Cover)
          </span>
        </div>

        <div className="flex items-center gap-2 font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => shiftScheduleWeek(-1)}
            className="p-1 hover:text-[#FF5C00] hover:bg-white rounded transition-colors cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4 font-bold" />
          </button>
          <span className="font-mono text-xs text-slate-800">{currentWeekLabel}</span>
          <button
            onClick={() => shiftScheduleWeek(1)}
            className="p-1 hover:text-[#FF5C00] hover:bg-white rounded transition-colors cursor-pointer"
            title="Tuần kế tiếp"
          >
            <ChevronRight className="w-4 h-4 font-bold" />
          </button>
        </div>
      </div>

      {/* ================= BẢNG LỊCH DẠY CHI TIẾT (TIMETABLE GRID) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-slate-800 text-white font-medium text-center">
                <th className="p-3 w-32 border-r border-slate-700 bg-slate-900 font-bold">Ca tối (Evening)</th>
                  {weekDates.map((date, index) => <th key={index} className={`p-3 border-r border-slate-700 w-1/7 ${index === 6 ? 'bg-slate-700/60' : ''}`}>
                    {weekDayNames[index]}<br /><span className={`text-[11px] font-normal ${index === 6 ? 'text-orange-200 font-bold' : 'text-slate-300'}`}>({date.toLocaleDateString('vi-VN')})</span>
                  </th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {teacherScheduleRows.length ? teacherScheduleRows.map(row => (
                <tr key={row.time} className="min-h-32">
                  <td className="p-3 text-center font-bold bg-slate-50 border-r border-slate-200 text-slate-700">
                    <div className="text-xs">{row.time}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">(GMT+7)</div>
                  </td>
                  {row.days.map((sessions, dayIndex) => <td key={dayIndex} className="min-w-32 p-2 border-r border-slate-200 align-top bg-slate-50/20">
                    <div className="space-y-2">
                      {sessions.map(({ cls, session, material }) => <button key={`${cls.id}-${session}`} type="button" onClick={() => handleOpenClassModal(cls, session)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-100">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-emerald-900 text-[11px]">{cls.code}</span>
                          <span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Buổi {session}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600">{cls.name}</div>
                        <div className="mt-1.5 line-clamp-2 text-[11px] font-medium text-slate-800">{material?.title || 'Chưa có học liệu được gắn'}</div>
                        <div className={`mt-2 flex items-center gap-1 border-t border-emerald-200/60 pt-1.5 text-[10px] ${cls.roomLink ? 'text-emerald-700' : 'text-slate-400'}`}>
                          <Video className="h-3.5 w-3.5" /> {cls.roomLink ? 'Có link phòng' : 'Chưa có link phòng'}
                        </div>
                      </button>)}
                    </div>
                  </td>)}
                </tr>
              )) : <tr><td colSpan={8} className="p-10 text-center text-sm text-slate-500">Chưa có ca dạy trong lịch của giáo viên ở tuần này.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: THÔNG TIN LỚP HỌC (CHUẨN 100% GIAO DIỆN MẪU) ================= */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <h2 className="text-base font-bold text-slate-800">Thông tin lớp học</h2>
              <button
                onClick={() => setSelectedClass(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
            </div>

            {/* Body 2 Cột */}
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* CỘT TRÁI: Thông tin lớp & Lịch dạy buổi 1/2 */}
              <div className="w-full md:w-80 bg-slate-50/70 p-5 border-r border-slate-200 flex-shrink-0 space-y-6">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Thông tin lớp</div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{selectedClass.code}</span>
                      <span className="text-slate-400"> - </span>
                      <span className="text-[#FF5C00] font-bold">{selectedClass.subject === 'SUB-MATH' ? 'Môn Toán' : 'Môn Tiếng Anh'}</span>
                      <span className="text-slate-600"> : Việt Nam : </span>
                      <span className="font-bold text-rose-500">{selectedClass.model}</span>
                    </div>

                    <div className="text-slate-700 font-medium">
                      {selectedClass.grade} ({selectedClass.level}) - {selectedClass.name}
                    </div>

                    <div className="text-slate-600 font-mono">
                      {selectedClass.schedule}
                    </div>
                  </div>
                </div>

                {/* Lịch các buổi trong tuần */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">LỊCH DẠY TRONG TUẦN</span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {weekDates[0].toLocaleDateString('vi-VN')} - {weekDates[6].toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[1, 2].map(session => {
                      const schedule = selectedClassSchedule.find(entry => entry.session === session);
                      const sessionDate = schedule ? weekDates[schedule.dayIndex] : null;
                      const activeSession = selectedClass.activeSessions?.[session];
                      const material = selectedWeekMaterial(selectedClass, session);
                      return <button key={session} type="button" onClick={() => setSelectedSessionNum(session)} className={`w-full rounded-xl border p-3 text-left transition-all ${selectedSessionNum === session ? 'border-sky-300 bg-sky-50/80 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <div className="text-[11px] font-bold text-slate-800">
                          {sessionDate ? `${sessionDate.toLocaleDateString('vi-VN')} ${schedule?.time}` : 'Chưa có lịch học'}
                        </div>
                        <div className="mt-1 text-xs italic leading-snug text-slate-700">
                          {material?.title || activeSession?.title || 'Chưa có học liệu được gắn cho buổi này'}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">Buổi {session}</span>
                          {selectedSessionNum === session && <span className="font-bold text-sky-700">Đang chọn</span>}
                        </div>
                      </button>;
                    })}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: Thẻ GV, Nút VÀO LỚP cam, Học liệu, Danh sách HS */}
              <div className="flex-1 p-6 space-y-6 bg-sky-50/30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Card 1: Thông tin giáo viên */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                    <div className="font-bold text-slate-800">Thông tin giáo viên</div>
                    <div className="text-slate-600">
                      Giáo viên: <span className="font-bold text-slate-800">{selectedClass.teacherName}</span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5 pt-1">
                      <span>Nickname:</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                        TM_M558
                      </span>
                      <button
                        onClick={() => copyToClipboard('TM_M558', 'Nickname')}
                        className="text-slate-400 hover:text-[#FF5C00]"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Tài khoản giảng dạy & NÚT VÀO LỚP CAM */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">Tài khoản giảng dạy</div>
                      <div className="text-[11px] text-slate-400 mt-1">Phòng Zoom do Vận hành gán:</div>
                      <div className="text-[11px] font-mono text-slate-600 truncate">
                        {selectedClass.roomLink || 'Chưa gán link phòng'}
                      </div>
                    </div>

                    <button
                      onClick={handleEnterClassroom}
                      className="mt-3 w-full py-2.5 px-4 bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-extrabold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <span>VÀO LỚP</span>
                      <ChevronRight className="w-4 h-4 font-bold group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Card 3: Tài liệu học tập */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                    <div className="font-bold text-slate-800">Học liệu buổi {selectedSessionNum}</div>
                    <div className="text-[11px] font-medium text-slate-600">{selectedClassMaterial?.title || 'Chưa có tên học liệu cho buổi này'}</div>
                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Slide:</span>
                        {selectedClassMaterial?.slide ? <a href={selectedClassMaterial.slide} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-[#FF5C00] hover:underline">
                          <span>Mở slide</span><ExternalLink className="h-3 w-3" />
                        </a> : <span className="text-slate-400">Chưa có link</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bài tập LMS:</span>
                        {selectedClassMaterial?.lms ? <a href={selectedClassMaterial.lms} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-[#FF5C00] hover:underline">
                          <span>Mở bài tập</span><ExternalLink className="h-3 w-3" />
                        </a> : <span className="text-slate-400">Chưa có link</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh sách học viên & Điểm danh & Nhận xét AI */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-8 text-xs font-bold">
                      <span className="text-slate-800 border-b-2 border-[#FF5C00] pb-2.5 -mb-3">
                        Danh sách Học viên ({selectedClass.studentIds.length} HS)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {classLiveStatus === 'CHUA_DIEN_RA' && (
                        <>
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                            Trạng thái: Chưa diễn ra
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setClassLiveStatus('DANG_HOC');
                              showToast('Đã bắt đầu ca học! Trạng thái chuyển sang: ĐANG HỌC.', 'success');
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Bắt đầu ca để chuyển sang trạng thái Đang học"
                          >
                            <Play className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>Bắt đầu giờ dạy</span>
                          </button>
                        </>
                      )}
                      {classLiveStatus === 'DANG_HOC' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                          <span>Trạng thái: Đang học</span>
                        </span>
                      )}
                      {classLiveStatus === 'DA_HOAN_THANH' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Trạng thái: Đã hoàn thành</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-semibold border-b border-slate-100 text-[11px]">
                          <th className="pb-2">Học viên</th>
                          <th className="pb-2">Mã Học Sinh</th>
                          <th className="pb-2 text-center">Điểm danh</th>
                          <th className="pb-2 text-right">Nhận xét buổi học</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedClass.studentIds.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              Lớp chưa được ghép học sinh nào.
                            </td>
                          </tr>
                        ) : (
                          selectedClass.studentIds.map(sid => {
                            const studentItem = students.find(s => s.id === sid);
                            const studentDisplayName = studentItem ? studentItem.name : (sid === 'HS-2026-001' ? 'Trần Gia Bảo' : sid);
                            const studentGradeLevel = studentItem ? `${studentItem.grade} - Trình độ ${studentItem.level}` : 'Khối Tiểu học';

                            return (
                              <tr key={sid}>
                                <td className="py-3">
                                  <div className="font-bold text-slate-800">
                                    {studentDisplayName}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{studentGradeLevel}</div>
                                </td>
                                <td className="py-3 font-mono text-slate-600 font-medium">{sid}</td>
                                <td className="py-3 text-center">
                                  <select className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:border-[#FF5C00]">
                                    <option value="present">Có mặt</option>
                                    <option value="late">Đi muộn</option>
                                    <option value="absent">Vắng mặt</option>
                                  </select>
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => handleOpenAiReview(studentDisplayName)}
                                    className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs border border-orange-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Tạo Nhận xét AI</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 italic">
                      * Điểm danh và xác nhận hoàn tất để lưu kết quả giảng dạy và sĩ số ca học.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('Nhập lý do sự cố (mất điện, hỏng mạng, vắng đột xuất):', 'Mất kết nối Internet đột xuất');
                          if (reason) {
                            reportIncidentToSession(selectedClass.code, 'Sự cố do Giáo viên báo', reason);
                          }
                        }}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Báo Sự Cố Ca Học</span>
                      </button>
                      {classLiveStatus === 'CHUA_DIEN_RA' ? (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 bg-slate-100 text-slate-400 font-bold rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 cursor-not-allowed opacity-70"
                          title="Lớp học chưa diễn ra! Chỉ khi ca học ở trạng thái 'Đang học' thì gia sư mới có thể ấn xác nhận."
                        >
                          <CheckCircle className="w-4 h-4 text-slate-300" />
                          <span>Chưa thể xác nhận (Chờ Đang học)</span>
                        </button>
                      ) : classLiveStatus === 'DANG_HOC' ? (
                        <button
                          type="button"
                          onClick={handleConfirmCompleteSession}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Xác Nhận Hoàn Tất Ca Dạy</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 text-xs flex items-center gap-1.5 cursor-default"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Đã Hoàn Tất Ca Dạy</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRỢ LÝ AI SINH NHẬN XÉT HỌC SINH ================= */}
      {isAiReviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Trợ lý AI - Nhận xét buổi học</h3>
                  <p className="text-[11px] text-slate-400">Học sinh: {aiReviewStudentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiReviewModalOpen(false);
                  setAiGeneratedText('');
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Đóng và xóa dữ liệu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khung tiêu chí đánh giá môn học:</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#FF5C00]" />
                    <span>Nắm chắc kiến thức bài học</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#FF5C00]" />
                    <span>Tính toán nhanh &amp; chính xác</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-[#FF5C00]" />
                    <span>Tập trung &amp; hăng hái phát biểu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-[#FF5C00]" />
                    <span>Cần rèn thêm chữ viết &amp; cẩn thận</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Lời nhận xét tự động (AI sinh):</label>
                  <div className="flex items-center gap-2">
                    {aiGeneratedText && (
                      <button
                        type="button"
                        onClick={() => setAiGeneratedText('')}
                        className="text-slate-400 hover:text-rose-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Xóa nội dung đang soạn"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa chữ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRegenerateAi}
                      className="text-[#FF5C00] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sinh lại</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={aiGeneratedText}
                  onChange={e => setAiGeneratedText(e.target.value)}
                  placeholder="Nhận xét của AI hoặc nhập nhận xét của Thầy/Cô..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00] leading-relaxed text-slate-700"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setAiGeneratedText('')}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Xóa nội dung
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiReviewModalOpen(false);
                    setAiGeneratedText('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveAiReview}
                  className="px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu nhận xét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================= CHATBOT TRÒN TRÒN Ở PHÍA BÊN PHẢI (MÀU CAM, THIẾT KẾ ĐẸP, KHÔNG NHẤP NHÁY) ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Nút tròn nổi phía bên phải */}
        {!isKnowledgeBotOpen && (
          <button
            type="button"
            onClick={() => setIsKnowledgeBotOpen(true)}
            className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#E05200] via-[#FF5C00] to-amber-500 text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-white ring-4 ring-orange-200/70"
            title="Trợ lý Tri thức Vận hành (SOP & Quy chế)"
          >
            {/* Chấm trạng thái Online (Tĩnh, không nhấp nháy theo yêu cầu) */}
            <span className="w-3 h-3 rounded-full bg-emerald-500 absolute top-0 right-0 ring-2 ring-white" />
            
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="12" x="4" y="8" rx="3" />
              <circle cx="9" cy="13" r="1.2" fill="currentColor" />
              <circle cx="15" cy="13" r="1.2" fill="currentColor" />
              <path d="M12 4v4" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
            </svg>
            <span className="text-[9px] font-black tracking-wider text-orange-50 leading-none mt-0.5">SOP</span>
            
            {/* Tooltip hiển thị khi hover */}
            <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700">
              Trợ lý Tri thức Vận hành SOP
            </span>
          </button>
        )}

        {/* Khung Chat nổi ghim sát mép phải khi mở */}
        {isKnowledgeBotOpen && (
          <div className="w-[380px] max-w-[calc(100vw-2rem)] h-[560px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden font-infer animate-in fade-in slide-in-from-bottom-4">
            {/* Header Bot màu cam hiện đại, tinh tế */}
            <div className="p-3.5 border-b border-orange-600/30 bg-gradient-to-r from-[#E05200] via-[#FF5C00] to-orange-500 text-white flex items-center justify-between flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="12" x="4" y="8" rx="3" />
                    <circle cx="9" cy="13" r="1" fill="currentColor" />
                    <circle cx="15" cy="13" r="1" fill="currentColor" />
                    <path d="M12 4v4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    <h3 className="font-bold text-xs text-white">
                      Trợ Lý Tri Thức Vận Hành
                    </h3>
                  </div>
                  <p className="text-[10px] text-orange-100">
                    SOP &amp; Quy chế Vận hành Vuihoc Tutor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Xóa đoạn chat làm mới"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsKnowledgeBotOpen(false);
                    handleClearChat();
                  }}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer font-bold text-xs transition-colors"
                  title="Đóng và xóa dữ liệu"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Questions Chips */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Gợi ý câu hỏi nhanh:
              </div>
              <div className="flex flex-wrap gap-1">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuestion(q)}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF5C00] border border-slate-200 hover:border-orange-300 transition-colors text-left cursor-pointer truncate max-w-full"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-50/40">
              {botMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-slate-400">
                    <span className={msg.sender === 'bot' ? 'text-[#FF5C00] font-semibold' : ''}>
                      {msg.sender === 'user' ? 'Thầy/Cô' : 'Bot Vận hành (SOP)'}
                    </span>
                    <span>• {msg.time}</span>
                  </div>
                  <div
                    className={`max-w-[90%] p-2.5 rounded-2xl whitespace-pre-line leading-relaxed text-xs shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-[#FF5C00] text-white rounded-br-xs font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2 flex-shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Nhập câu hỏi quy định SOP, báo nghỉ, sự cố..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 font-medium"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-3.5 py-1.5 bg-[#FF5C00] hover:bg-[#E05200] disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
