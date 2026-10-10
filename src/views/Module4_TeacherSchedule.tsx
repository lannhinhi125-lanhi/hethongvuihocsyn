import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClassItem } from '../types';
import { findKnowledgeDocument } from '../lib/knowledgeSearch';
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
  const {
    classes, setClasses, students, teachers, reportIncidentToSession, showToast, currentUser,
    subjects, criteriaCategories, activeToneKey, toneDirectives, sopDocuments, ragBotConfig
  } = useApp();

  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState('10/2026');
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [fromDate, setFromDate] = useState('2026-10-05');
  const [toDate, setToDate] = useState('2026-10-11');
  const [currentWeekLabel, setCurrentWeekLabel] = useState('Tuần: 05/10 - 11/10/2026');

  // Bot chat tra cứu tài liệu tri thức; câu trả lời hiện là mô phỏng trước khi kết nối Gemini.
  const [isKnowledgeBotOpen, setIsKnowledgeBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: ragBotConfig.welcomeGreeting,
      time: 'Vừa xong'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Hàm xóa đoạn chat làm mới theo yêu cầu
  const handleClearChat = () => {
    setBotMessages([
      {
        sender: 'bot',
        text: ragBotConfig.welcomeGreeting,
        time: 'Vừa xong'
      }
    ]);
    setChatInput('');
    showToast('Đã xóa toàn bộ dữ liệu đoạn chat!', 'info');
  };

  // Trạng thái buổi học: CHUA_DIEN_RA (chưa diễn ra), DANG_HOC (đang học), DA_HOAN_THANH (đã hoàn thành)
  const [classLiveStatus, setClassLiveStatus] = useState<'CHUA_DIEN_RA' | 'DANG_HOC' | 'DA_HOAN_THANH'>('CHUA_DIEN_RA');

  const quickQuestions = ragBotConfig.quickPrompts;

  const handleSendQuestion = (questionText?: string) => {
    const q = (questionText || chatInput).trim();
    if (!q) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: q, time: timeStr };

    const documentMatch = findKnowledgeDocument(q, sopDocuments);
    const botReply = documentMatch
      ? `${documentMatch.content}\n\nTài liệu tham khảo: ${documentMatch.title}`
      : ragBotConfig.fallbackResponse;

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
  const [selectedSessionDate, setSelectedSessionDate] = useState('');

  // AI Review modal state
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState(false);
  const [aiReviewStudentName, setAiReviewStudentName] = useState('Trần Gia Bảo');
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [selectedCriterionOptions, setSelectedCriterionOptions] = useState<Record<string, string>>({});

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép ${label}: "${text}"`, 'success');
    });
  };

  const handleOpenClassModal = (cls: ClassItem, sessionNum: number = 1, sessionDate = fromDate) => {
    setSelectedClass(cls);
    setSelectedSessionNum(sessionNum);
    setSelectedSessionDate(sessionDate);
    const storedSession = cls.activeSessions?.[sessionNum];
    const currStatus = storedSession?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === sessionDate
      ? storedSession.status
      : undefined;
    if (currStatus === 'Đã hoàn thành') {
      setClassLiveStatus('DA_HOAN_THANH');
    } else {
      setClassLiveStatus('CHUA_DIEN_RA');
    }
  };

  const handleEnterClassroom = () => {
    if (selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id) {
      showToast(`Ca này đang được dạy thay bởi ${selectedClassCoverAssignment.teacherName}.`, 'warning');
      return;
    }
    if (!selectedClass || !selectedClass.roomLink) {
      showToast('Lớp học này chưa có link phòng Zoom/ClassIn do Vận hành gán!', 'warning');
      return;
    }
    const schedule = selectedClassSchedule.find(entry => entry.session === selectedSessionNum);
    const sessionDate = schedule ? weekDates.find(date => {
      const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return dateValue === selectedSessionDate;
    }) || weekDates[schedule.dayIndex] : new Date(`${selectedSessionDate || fromDate}T00:00:00`);
    const dateStr = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
    const checkinTime = new Date().toTimeString().slice(0, 8);
    const scheduledStart = Number((schedule?.time.match(/^(\d{1,2}):(\d{2})/) || [])[1]) * 60 + Number((schedule?.time.match(/^(\d{1,2}):(\d{2})/) || [])[2]);
    const [checkinHour, checkinMinute] = checkinTime.split(':').map(Number);
    const teacherAttendance = checkinHour * 60 + checkinMinute > scheduledStart ? 'LATE' : 'ATTENDED';
    const storedSession = selectedClass.activeSessions?.[selectedSessionNum];
    const activeSession = storedSession?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === dateStr
      ? storedSession
      : undefined;
    setClasses(previous => previous.map(cls => cls.id === selectedClass.id ? {
      ...cls,
      activeSessions: {
        ...(cls.activeSessions || {}),
        [selectedSessionNum]: {
          ...(activeSession || {}),
          sessionNum: selectedSessionNum,
          dateStr: `${dateStr} ${schedule?.time || activeSession?.dateStr.split(' ').slice(1).join(' ') || ''}`.trim(),
          title: selectedClassMaterial?.title || activeSession?.title || `Buổi ${selectedSessionNum}`,
          status: activeSession?.status || 'Chưa diễn ra',
          materialGv: selectedClassMaterial?.slide || activeSession?.materialGv || '',
          materialHs: activeSession?.materialHs || '',
          exerciseLms: selectedClassMaterial?.lms || activeSession?.exerciseLms || '',
          checkinTime,
          teacherAttendance,
          checkinBy: currentUser.name
        }
      }
    } : cls));
    setClassLiveStatus('DANG_HOC');
    showToast(`Đã ghi nhận ${currentUser.name} vào lớp lúc ${checkinTime}. Chuyên cần: ${teacherAttendance === 'ATTENDED' ? 'Có mặt' : 'Đi muộn'}.`, teacherAttendance === 'ATTENDED' ? 'success' : 'warning');
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
    setSelectedCriterionOptions({});
    setAiGeneratedText('');
    setIsAiReviewModalOpen(true);
  };

  const handleRegenerateAi = () => {
    const selectedFeedback = reviewCriteria.flatMap(category => category.criteria.flatMap(criterion => {
      const selectedOptionId = selectedCriterionOptions[criterion.id];
      const selectedOption = criterion.options.find(option => option.id === selectedOptionId);
      return selectedOption ? [selectedOption.label] : [];
    }));
    if (!selectedFeedback.length) {
      showToast('Vui lòng chọn kết quả cho ít nhất một tiêu chí trước khi tạo nhận xét.', 'warning');
      return;
    }

    const subjectName = selectedClass
      ? subjects.find(subject => subject.code === selectedClass.subject)?.name || selectedClass.subject
      : 'buổi học';
    const detail = selectedFeedback.join('; ');
    const generatedText = activeToneKey === 'chuan-muc'
      ? `Nhận xét buổi học môn ${subjectName} của ${aiReviewStudentName}: ${detail}.`
      : activeToneKey === 'ngan-gon'
        ? `${aiReviewStudentName} (${subjectName}): ${detail}.`
        : `Hôm nay ${aiReviewStudentName} học môn ${subjectName}: ${detail}. Thầy/Cô ghi nhận nỗ lực của con và sẽ tiếp tục đồng hành ở buổi học sau.`;
    setAiGeneratedText(generatedText);
    showToast('Đã tạo bản nhận xét xem trước từ các tiêu chí giáo viên đã chọn.', 'info');
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

  const isPrimaryTeacherForClass = (cls: ClassItem) => Boolean(currentTeacher && (
    cls.teacherId === currentTeacher.id ||
    cls.teacherName.includes(currentTeacher.name.replace('Thầy ', '').replace('Cô ', ''))
  ));
  const teacherClasses = classes.filter(cls =>
    isPrimaryTeacherForClass(cls) ||
    cls.coverAssignments?.some(assignment =>
      assignment.teacherId === currentTeacher?.id &&
      assignment.dateStr >= fromDate &&
      assignment.dateStr <= toDate
    )
  );

  const scheduleEntriesForClass = (cls: ClassItem) => Array.from(
    cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
    match => ({
      dayIndex: match[3] ? 6 : Number(match[1]) - 2,
      time: (match[2] || match[4] || '').trim()
    })
  ).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).slice(0, 2).map((entry, index) => ({ ...entry, session: index + 1 }));

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
  const dateStringForWeekDay = (dayIndex: number) => {
    const date = weekDates[dayIndex];
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const weekDayNames = ['Thứ 2 / Mon', 'Thứ 3 / Tue', 'Thứ 4 / Wed', 'Thứ 5 / Thu', 'Thứ 6 / Fri', 'Thứ 7 / Sat', 'Chủ nhật / Sun'];
  const timetableSlots = Array.from(new Set(teacherClasses.flatMap(cls => scheduleEntriesForClass(cls).map(entry => entry.time)))).sort((a, b) => a.localeCompare(b));
  const teacherScheduleRows = timetableSlots.map(time => ({
    time,
    days: weekDates.map((_, dayIndex) => teacherClasses.flatMap(cls =>
      scheduleEntriesForClass(cls)
        .filter(entry => entry.time === time && entry.dayIndex === dayIndex)
        .flatMap(entry => {
          const coverAssignment = cls.coverAssignments?.find(assignment =>
            assignment.sessionNum === entry.session && assignment.dateStr === dateStringForWeekDay(dayIndex)
          );
          const isPrimary = isPrimaryTeacherForClass(cls);
          if (!isPrimary && coverAssignment?.teacherId !== currentTeacher?.id) return [];
          return [{
            cls,
            session: entry.session,
            material: selectedWeekMaterial(cls, entry.session),
            coverAssignment,
            sessionDate: dateStringForWeekDay(dayIndex)
          }];
        })
    ))
  }));
  const selectedClassSchedule = selectedClass ? scheduleEntriesForClass(selectedClass) : [];
  const selectedClassMaterial = selectedClass ? selectedWeekMaterial(selectedClass, selectedSessionNum) : undefined;
  const selectedSubjectKey = selectedClass
    ? subjects.find(subject => subject.code === selectedClass.subject)?.abbr ||
      (selectedClass.subject === 'SUB-ENG' ? 'ENG' : 'TOAN')
    : '';
  const reviewCriteria = criteriaCategories.filter(category => category.subject === selectedSubjectKey);
  const selectedClassCoverAssignment = selectedClass?.coverAssignments?.find(assignment =>
    assignment.sessionNum === selectedSessionNum && assignment.dateStr === selectedSessionDate
  );
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
            <span>Bot chat AI</span>
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
                      {sessions.map(({ cls, session, material, coverAssignment, sessionDate }) => <button key={`${cls.id}-${session}-${sessionDate}`} type="button" onClick={() => handleOpenClassModal(cls, session, sessionDate)} className={`w-full rounded-xl border p-2.5 text-left transition-colors ${coverAssignment ? 'border-purple-200 bg-purple-50/80 hover:border-purple-400 hover:bg-purple-100' : 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-100'}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-emerald-900 text-[11px]">{cls.code}</span>
                          <div className="flex items-center gap-1">
                            <span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Buổi {session}</span>
                            {coverAssignment && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-800">Dạy thay</span>}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600">{cls.name}</div>
                        {coverAssignment && <div className="mt-1 text-[10px] font-semibold text-purple-800">{coverAssignment.teacherName}</div>}
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
                    {selectedClassCoverAssignment && (
                      <div className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-2 text-[11px] text-purple-800">
                        Ca này được phân công dạy thay cho <strong>{selectedClassCoverAssignment.teacherName}</strong>.
                      </div>
                    )}
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
                      const sessionDateText = sessionDate
                        ? `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`
                        : '';
                      const coverAssignment = selectedClass.coverAssignments?.find(assignment =>
                        assignment.sessionNum === session && assignment.dateStr === sessionDateText
                      );
                      const activeSession = selectedClass.activeSessions?.[session];
                      const material = selectedWeekMaterial(selectedClass, session);
                      return <button key={session} type="button" onClick={() => {
                        setSelectedSessionNum(session);
                        if (sessionDateText) setSelectedSessionDate(sessionDateText);
                      }} className={`w-full rounded-xl border p-3 text-left transition-all ${selectedSessionNum === session ? 'border-sky-300 bg-sky-50/80 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <div className="text-[11px] font-bold text-slate-800">
                          {sessionDate ? `${sessionDate.toLocaleDateString('vi-VN')} ${schedule?.time}` : 'Chưa có lịch học'}
                        </div>
                        <div className="mt-1 text-xs italic leading-snug text-slate-700">
                          {material?.title || activeSession?.title || 'Chưa có học liệu được gắn cho buổi này'}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">Buổi {session}</span>
                          {coverAssignment && <span className="font-bold text-purple-700">Dạy thay: {coverAssignment.teacherName}</span>}
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
                      type="button"
                      disabled={Boolean(selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id)}
                      onClick={handleEnterClassroom}
                      className="mt-3 w-full py-2.5 px-4 bg-[#FF5C00] hover:bg-[#E05200] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <span>{selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id ? 'CA ĐÃ ĐƯỢC COVER' : 'VÀO LỚP'}</span>
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu chí nhận xét · {subjects.find(subject => subject.abbr === selectedSubjectKey)?.name || selectedSubjectKey}
                </label>
                <div className="max-h-56 overflow-y-auto space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {reviewCriteria.length ? reviewCriteria.map(category => (
                    <section key={category.id} className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{category.name}</h4>
                      {category.criteria.map(criterion => (
                        <fieldset key={criterion.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <legend className="px-1 font-semibold text-slate-800">{criterion.name}</legend>
                          <div className="mt-1 space-y-1.5">
                            {criterion.options.map(option => (
                              <label key={option.id} className="flex cursor-pointer items-start gap-2 text-slate-600">
                                <input
                                  type="radio"
                                  name={`review-${criterion.id}`}
                                  value={option.id}
                                  checked={selectedCriterionOptions[criterion.id] === option.id}
                                  onChange={() => setSelectedCriterionOptions(previous => ({ ...previous, [criterion.id]: option.id }))}
                                  className="mt-0.5 accent-[#FF5C00]"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </section>
                  )) : (
                    <p className="py-3 text-center text-slate-500">
                      Chưa có tiêu chí cho môn này. Quản trị viên có thể cấu hình trong AI Studio.
                    </p>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Chọn một mức đánh giá cho từng tiêu chí. Danh sách này đồng bộ từ cấu hình AI Studio.
                </p>
                <p className="mt-1 text-[10px] text-indigo-600">
                  Giọng văn đang cấu hình: {toneDirectives[activeToneKey]?.name || 'Mặc định'} · Bản xem trước chưa gọi Gemini.
                </p>
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
            title="Bot chat AI tra cứu tài liệu tri thức"
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
            <span className="text-[9px] font-black tracking-wider text-orange-50 leading-none mt-0.5">AI</span>
            
            {/* Tooltip hiển thị khi hover */}
            <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700">
              Bot chat AI
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
                    <h3 className="font-bold text-xs text-white">Bot chat AI</h3>
                  </div>
                  <p className="text-[10px] text-orange-100">
                    Tra cứu trong tài liệu tri thức
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
                      {msg.sender === 'user' ? 'Thầy/Cô' : 'Bot chat AI'}
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
                placeholder="Đặt câu hỏi trong phạm vi tài liệu tri thức..."
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
