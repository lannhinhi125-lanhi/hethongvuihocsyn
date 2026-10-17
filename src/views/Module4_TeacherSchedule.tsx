import { canReviewSession, isEarlyCheckout } from '../lib/sessionAlerts';
import { GeminiConnectionStatus } from '../components/GeminiConnectionStatus';
import { ChatMessageText } from '../components/ChatMessageText';
import { ASSISTANT_QUICK_PROMPTS } from '../lib/assistantPrompts';
import { TeachingSessionDetails } from '../components/TeachingSessionDetails';
import { teachingSessionDetails, teachingScheduleEntries, type TeachingLesson } from '../lib/teachingSessionDetails';
import { useBusinessValue, useBusinessStatus, waitForBusinessSave, refreshBusinessData } from '../lib/businessPersistence';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { resolveAccountTeacher } from '../lib/evaluation';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ClassItem } from '../types';
import { useKnowledgeChat } from '../hooks/useKnowledgeChat';
import { materialForSessionDate, teachingWeekForDate } from '../lib/teacherScheduleMaterials';
import { scheduledClassStart } from '../lib/classSessionTiming';
import {
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export const Module4_TeacherSchedule: React.FC = () => {
  const businessStatus=useBusinessStatus();
  const [datedLessons] = useBusinessValue<TeachingLesson[]>('dated_lessons');
  const initialWeek = teachingWeekForDate(new Date());
  const { can, requirePermission } = usePermissions();
  const {
    incidents, classes, setClasses, students, teachers, reportIncidentToSession, showToast, currentUser,
    timeSlots, subjects, sopDocuments, ragBotConfig, users
  } = useApp();

  const [reportedIncidentCode,setReportedIncidentCode]=useState('');
  const reportableIncidents=incidents.flatMap(group=>group.subIncidents.filter(item=>item.status));
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2026 - 2027');
  const [fromDate, setFromDate] = useState(initialWeek.from);
  const [toDate, setToDate] = useState(initialWeek.to);
  const [currentWeekLabel, setCurrentWeekLabel] = useState(initialWeek.label);

  // Chat is kept in memory; Gemini answers using enabled knowledge documents.
  const [isKnowledgeBotOpen, setIsKnowledgeBotOpen] = useState(false);
  const [isCloseChatConfirmOpen, setIsCloseChatConfirmOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: ragBotConfig.welcomeGreeting,
      time: 'Vừa xong'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const knowledgeChat=useKnowledgeChat(sopDocuments,ragBotConfig.personaTone,ragBotConfig.fallbackResponse,ragBotConfig.systemPrompt);

  // Hàm xóa đoạn chat làm mới theo yêu cầu
  const handleClearChat = () => {
    knowledgeChat.reset();
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

  const handleConfirmCloseChat = () => {
    setIsKnowledgeBotOpen(false);
    setIsCloseChatConfirmOpen(false);
    handleClearChat();
  };

  // Trạng thái buổi học: CHUA_DIEN_RA (chưa diễn ra), DANG_HOC (đang học), DA_HOAN_THANH (đã hoàn thành)
  const [classLiveStatus, setClassLiveStatus] = useState<'CHUA_DIEN_RA' | 'DANG_HOC' | 'DA_HOAN_THANH'>('CHUA_DIEN_RA');

  const quickQuestions = ASSISTANT_QUICK_PROMPTS;

  const handleSendQuestion = async (questionText?: string) => {
    if (!requirePermission("Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy")) return;
    const q = (questionText || chatInput).trim();
    if (!q || knowledgeChat.isAnswering) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: q, time: timeStr };

    setBotMessages(prev => [...prev, userMsg]);
    setChatInput('');
    try{
      const text=await knowledgeChat.answer(q);
      if(text!==null)setBotMessages(prev=>[...prev,{sender:'bot',text,time:new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}]);
    }catch(error){
      setBotMessages(prev=>prev.slice(0,-1));setChatInput(q);
      showToast(error instanceof Error ? error.message : 'Chưa nhận được câu trả lời từ AI.','error');
    }
  };

  const [selectedClassId, setSelectedClass] = useState<string | null>(null);
  const selectedClass = classes.find(cls => cls.id === selectedClassId) || null;
  const [selectedSessionNum, setSelectedSessionNum] = useState<number>(1);
  const [selectedSessionDate, setSelectedSessionDate] = useState('');

  // Nhận xét do giáo viên nhập
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewStudentName, setReviewStudentName] = useState('');
  const [reviewStudentId, setReviewStudentId] = useState('');
  const [reviewText, setReviewText] = useState('');

  const handleOpenClassModal = (cls: ClassItem, sessionNum: number = 1, sessionDate = fromDate) => {
    if (!requirePermission('Vào phòng học và xem học liệu lớp được giao')) return;
    setSelectedClass(cls.id);
    setSelectedSessionNum(sessionNum);
    setSelectedSessionDate(sessionDate);
    const storedSession = cls.activeSessions?.[sessionNum];
    const currStatus = storedSession?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === sessionDate
      ? storedSession.status
      : undefined;
    if (currStatus === 'Đã hoàn thành') {
      setClassLiveStatus('DA_HOAN_THANH');
    } else if (currStatus === 'Đang học' || (
      storedSession?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === sessionDate && storedSession.checkinTime
    )) {
      setClassLiveStatus('DANG_HOC');
    } else {
      setClassLiveStatus('CHUA_DIEN_RA');
    }
  };

  const handleEnterClassroom = () => {
    if (!requirePermission('Vào phòng học và xem học liệu lớp được giao')) return;
    if (!requirePermission("Giáo viên Check-in / Check-out vào ca dạy")) return;
    if (selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id) {
      showToast(`Ca này đang được dạy thay bởi ${selectedClassCoverAssignment.teacherName}.`, 'warning');
      return;
    }
    if (!selectedClass) return;
    const classroom = teachingSessionDetails(selectedClass, selectedSessionNum, selectedSessionDate || fromDate, selectedClassSchedule.find(entry => entry.session === selectedSessionNum)?.time || '', datedLessons, timeSlots, new Date());
    if (!classroom.roomUrl) {
      showToast('Lớp học này chưa có link phòng Zoom/ClassIn do Vận hành gán!', 'warning');
      return;
    }
    const schedule = selectedClassSchedule.find(entry => entry.session === selectedSessionNum);
    const sessionDate = schedule ? weekDates.find(date => {
      const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return dateValue === selectedSessionDate;
    }) || weekDates[schedule.dayIndex] : new Date(`${selectedSessionDate || fromDate}T00:00:00`);
    const dateStr = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
    const scheduledStart = schedule ? scheduledClassStart(dateStr, schedule.time) : null;
    if (!scheduledStart) {
      showToast('Chưa xác định được giờ bắt đầu của buổi học.', 'warning');
      return;
    }
    const now = new Date();
    const storedSession = selectedClass.activeSessions?.[selectedSessionNum];
    const activeSession = storedSession?.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] === dateStr
      ? storedSession
      : undefined;
    if (activeSession?.checkoutAt || classroom.lesson?.checkoutAt || activeSession?.status === 'Đã hoàn thành') {
      window.open(classroom.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (activeSession?.status === 'Đang học' && (activeSession.checkinAt || activeSession.checkinTime)) {
      window.open(classroom.roomUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (classroom.status !== 'DANG_HOC') {
      window.open(classroom.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const checkinTime = now.toTimeString().slice(0, 8);
    const teacherAttendance = now.getTime() >= scheduledStart.getTime() + 60_000 ? 'LATE' : 'ATTENDED';
    setClasses(previous => previous.map(cls => cls.id === selectedClass.id ? {
      ...cls,
      activeSessions: {
        ...(cls.activeSessions || {}),
        [selectedSessionNum]: {
          ...(activeSession || {}),
          sessionNum: selectedSessionNum,
          dateStr: `${dateStr} ${schedule?.time || activeSession?.dateStr.split(' ').slice(1).join(' ') || ''}`.trim(),
          title: selectedClassMaterial?.title || activeSession?.title || `Buổi ${selectedSessionNum}`,
          status: 'Đang học',
          materialGv: selectedClassMaterial?.slide || activeSession?.materialGv || '',
          materialHs: activeSession?.materialHs || '',
          exerciseLms: selectedClassMaterial?.lms || activeSession?.exerciseLms || '',
          checkinTime,
          checkinAt: now.toISOString(),
          checkinUserId: currentUser.id,
          teacherAttendance,
          checkinBy: currentUser.name
        }
      }
    } : cls));
    setClassLiveStatus('DANG_HOC');
    showToast(`Đã ghi nhận ${currentUser.name} vào lớp lúc ${checkinTime}. Chuyên cần: ${teacherAttendance === 'ATTENDED' ? 'Có mặt' : 'Đi muộn'}.`, teacherAttendance === 'ATTENDED' ? 'success' : 'warning');
    window.open(classroom.roomUrl, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmCompleteSession = async () => {
    if (!requirePermission('Giáo viên Check-in / Check-out vào ca dạy') || !selectedClass || businessStatus.saving) return;
    if (selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id) return;
    if (!checkoutFacts.checkinAt || checkoutFacts.checkoutAt || ['HUY','NGHI_HOC'].includes(checkoutFacts.status || '')) {
      showToast('Chỉ kết thúc buổi đã check-in và chưa checkout.', 'warning'); return;
    }
    if (!window.confirm('Kết thúc lớp và ghi nhận checkout? Kết thúc sớm hơn 5 phút sẽ cảnh báo Chưa hoàn tất.')) return;
    const checkoutAt=new Date().toISOString();
    const time=selectedClassSchedule.find(entry=>entry.session===selectedSessionNum)?.time;
    if(!time){showToast('Chưa xác định được khung giờ buổi học.', 'error');return;}
    setClasses(previous=>previous.map(cls=>{
      if(cls.id!==selectedClass.id)return cls;
      const active=selectedDetail?.active;
      return {...cls,activeSessions:{...cls.activeSessions,[selectedSessionNum]:{
        ...(active || {sessionNum:selectedSessionNum,dateStr:selectedSessionDate+' '+time,title:selectedDetail?.title || '',materialGv:selectedDetail?.slide || '',materialHs:selectedDetail?.studentMaterial || '',exerciseLms:selectedDetail?.exercise || ''}),
        status:'Đã hoàn thành',checkinAt:checkoutFacts.checkinAt!,checkoutAt,checkoutUserId:currentUser.id
      }}};
    }));
    try {await waitForBusinessSave();setClassLiveStatus('DA_HOAN_THANH');showToast('Đã lưu checkout. Có thể nhập nhận xét học sinh.', 'success');}
    catch(error){showToast(error instanceof Error ? error.message : 'Chưa lưu được giờ kết thúc.', 'error');}
  };

  const handleOpenReview = (studentId: string, studentName: string) => {
    if (!requirePermission('Giáo viên Check-in / Check-out vào ca dạy')) return;
    if (!reviewUnlocked) { showToast('Cần kết thúc lớp hoặc chờ hệ thống ghi nhận checkout đúng giờ trước khi nhận xét.', 'warning'); return; }
    setReviewStudentName(studentName); setReviewStudentId(studentId);
    setReviewText(selectedClass?.activeSessions?.[selectedSessionNum]?.feedback?.[studentId] || '');
    setIsReviewModalOpen(true);
  };
  const handleSaveReview = async () => {
    if (!requirePermission('Giáo viên Check-in / Check-out vào ca dạy')) return;
    if (!selectedClass || !reviewUnlocked || !reviewText.trim()) {
      showToast('Chỉ nhập nhận xét sau khi buổi học đã ghi nhận checkout.', 'warning'); return;
    }
    setClasses(previous => previous.map(cls => {
      if (cls.id !== selectedClass.id) return cls;
      const session=cls.activeSessions?.[selectedSessionNum];
      if (!session || session.dateStr.match(/\d{4}-\d{2}-\d{2}/)?.[0] !== selectedSessionDate) return cls;
      return {...cls,activeSessions:{...cls.activeSessions,[selectedSessionNum]:{...session,feedback:{...session.feedback,[reviewStudentId]:reviewText.trim()}}}};
    }));
    try { await waitForBusinessSave(); setIsReviewModalOpen(false); showToast('Đã lưu nhận xét.', 'success'); }
    catch(error) { showToast(error instanceof Error ? error.message : 'Chưa lưu được nhận xét.', 'error'); }
  };

  const isTeacherAccount = currentUser.role === 'Giáo viên Giảng dạy';
  const ownTeacher = resolveAccountTeacher(currentUser, teachers, users);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(ownTeacher?.id || teachers[0]?.id || '');
  const currentTeacher = isTeacherAccount ? ownTeacher : teachers.find(t => t.id === selectedTeacherId);

  const isPrimaryTeacherForClass = (cls: ClassItem) => Boolean(currentTeacher && cls.teacherId === currentTeacher.id);
  const teacherClasses = classes.filter(cls =>
    isPrimaryTeacherForClass(cls) ||
    cls.coverAssignments?.some(assignment =>
      assignment.teacherId === currentTeacher?.id &&
      assignment.dateStr >= fromDate &&
      assignment.dateStr <= toDate
    )
  );

  const scheduleEntriesForClass = teachingScheduleEntries;

  const selectedWeekMaterial = (cls: ClassItem, session: number, date: string) =>
    materialForSessionDate(cls.materials || [], session, date);

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
  const timetableSlots = Array.from(new Set(teacherClasses.flatMap(cls => scheduleEntriesForClass(cls)
    .filter(entry => !cls.startDate || dateStringForWeekDay(entry.dayIndex) >= cls.startDate)
    .map(entry => entry.time)))).sort((a, b) => a.localeCompare(b));
  const teacherScheduleRows = timetableSlots.map(time => ({
    time,
    days: weekDates.map((_, dayIndex) => teacherClasses.flatMap(cls =>
      scheduleEntriesForClass(cls)
        .filter(entry => entry.time === time && entry.dayIndex === dayIndex)
        .flatMap(entry => {
          if (cls.startDate && dateStringForWeekDay(dayIndex) < cls.startDate) return [];
          if (['Tạm dừng','Đã kết thúc'].includes(cls.status || '') && !datedLessons.some(lesson=>lesson.classId===cls.id&&lesson.date===dateStringForWeekDay(dayIndex)&&timeSlots.find(slot=>slot.id===lesson.timeSlotId)?.timeRange===entry.time)) return [];
          const coverAssignment = cls.coverAssignments?.find(assignment =>
            assignment.sessionNum === entry.session && assignment.dateStr === dateStringForWeekDay(dayIndex)
          );
          const isPrimary = isPrimaryTeacherForClass(cls);
          if (!isPrimary && coverAssignment?.teacherId !== currentTeacher?.id) return [];
          return [{
            cls,
            session: entry.session,
            material: selectedWeekMaterial(cls, entry.session, dateStringForWeekDay(dayIndex)),
            coverAssignment,
            sessionDate: dateStringForWeekDay(dayIndex)
          }];
        })
    ))
  }));
  const selectedClassSchedule = selectedClass ? scheduleEntriesForClass(selectedClass) : [];
  const selectedClassMaterial = selectedClass
    ? selectedWeekMaterial(selectedClass, selectedSessionNum, selectedSessionDate || fromDate)
    : undefined;
  const selectedDetail=selectedClass ? teachingSessionDetails(selectedClass,selectedSessionNum,selectedSessionDate,selectedClassSchedule.find(entry=>entry.session===selectedSessionNum)?.time || '',datedLessons,timeSlots,new Date()) : undefined;
  const selectedLesson=selectedDetail?.lesson;
  const checkoutFacts={checkinAt:selectedLesson?.checkinAt || selectedDetail?.active?.checkinAt,checkoutAt:selectedLesson?.checkoutAt || selectedDetail?.active?.checkoutAt,status:selectedLesson?.status};
  const reviewUnlocked=canReviewSession(checkoutFacts) && !businessStatus.saving;
  const endedEarly=isEarlyCheckout(selectedSessionDate,selectedClassSchedule.find(entry=>entry.session===selectedSessionNum)?.time || '',checkoutFacts.checkoutAt);
  useEffect(()=>{
    if(!selectedClassId)return;
    setClassLiveStatus(canReviewSession(checkoutFacts) ? 'DA_HOAN_THANH' : checkoutFacts.checkinAt ? 'DANG_HOC' : 'CHUA_DIEN_RA');
  },[selectedClassId,selectedSessionDate,reviewUnlocked,checkoutFacts.checkinAt]);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void refreshBusinessData();};
    const timer=window.setInterval(refresh,15_000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const selectedStudentIds=selectedLesson?.feedbackProgress?.studentIds ?? selectedClass?.studentIds ?? [];
  const selectedSubjectKey = selectedClass
    ? subjects.find(subject => subject.code === selectedClass.subject)?.code ||
      (selectedClass.subject === 'SUB-ENG' ? 'ENG' : 'TOAN')
    : '';

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
    setCurrentWeekLabel(`Tuần: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`);
  };

  if (isTeacherAccount && !ownTeacher) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
      Chưa có hồ sơ giáo viên liên kết với tài khoản này. Vui lòng liên hệ quản trị viên.
    </div>;
  }

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
          </div>
          <p className="text-xs text-slate-500 mt-1">
          Chọn ca dạy để xem thông tin lớp và học liệu; nhấn “Vào lớp” để mở phòng học.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Đã gửi yêu cầu hỗ trợ ca dạy đến bộ phận Vận hành!', 'info')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Yêu cầu hỗ trợ (Support)</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc thời gian gọn: năm học và khoảng ngày */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-2xs">
        <label className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Năm học</span>
          <select
            value={selectedSchoolYear}
            onChange={event => setSelectedSchoolYear(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-medium text-slate-800"
          >
            <option value="2026 - 2027">2026 - 2027</option>
            <option value="2025 - 2026">2025 - 2026</option>
            <option value="2027 - 2028">2027 - 2028</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600">Khoảng thời gian</span>
          <input
            aria-label="Từ ngày"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={event => {
              if (!event.target.value) return;
              setFromDate(event.target.value);
              setCurrentWeekLabel(`Từ: ${event.target.value} đến: ${toDate}`);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
          />
          <span className="text-slate-400">–</span>
          <input
            aria-label="Đến ngày"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={event => {
              if (!event.target.value) return;
              setToDate(event.target.value);
              setCurrentWeekLabel(`Từ: ${fromDate} đến: ${event.target.value}`);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
          />
        </div>
        {!isTeacherAccount && (
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Giáo viên</span>
            <select
              value={selectedTeacherId}
              onChange={event => setSelectedTeacherId(event.target.value)}
              className="max-w-56 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
            >
              {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
        )}
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
                <th className="p-3 w-32 border-r border-slate-700 bg-slate-900 font-bold">Khung giờ</th>
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
                        {(() => {
                          const detail=teachingSessionDetails(cls,session,sessionDate,row.time,datedLessons,timeSlots,new Date());
                          const ids=detail.lesson?.feedbackProgress?.studentIds ?? cls.studentIds;
                          const total=detail.lesson?.feedbackProgress?.total ?? ids.length;
                          const completed=detail.lesson?.feedbackProgress?.completed ?? ids.filter(id=>detail.active?.feedback?.[id]?.trim()).length;
                          const done=total>0 && completed===total;
                          return <span title={completed+'/'+total+' học sinh đã được nhận xét'} className={`mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-700'}`}>{done ? 'Đã nhận xét' : 'Chưa nhận xét'}</span>;
                        })()}

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
            <TeachingSessionDetails cls={selectedClass} session={selectedSessionNum} date={selectedSessionDate || fromDate} time={selectedClassSchedule.find(entry => entry.session === selectedSessionNum)?.time || ''}
              onSelect={(session, date) => handleOpenClassModal(selectedClass, session, date)}
              onEnter={handleEnterClassroom}
              enterDisabled={Boolean(selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id)}
              endControl={<button type="button" onClick={handleConfirmCompleteSession}
                disabled={!checkoutFacts.checkinAt || Boolean(checkoutFacts.checkoutAt) || businessStatus.saving || ['HUY','NGHI_HOC'].includes(checkoutFacts.status || '') || !can('Giáo viên Check-in / Check-out vào ca dạy') || Boolean(selectedClassCoverAssignment && selectedClassCoverAssignment.teacherId !== currentTeacher?.id)}
                title={checkoutFacts.checkoutAt ? 'Buổi học đã ghi nhận checkout' : !checkoutFacts.checkinAt ? 'Vào lớp để ghi nhận check-in trước khi kết thúc' : 'Ghi nhận checkout và mở nhận xét học sinh'}
                className="w-full mt-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 inline-flex justify-center items-center gap-2">
                <CheckCircle className="h-4 w-4" />{checkoutFacts.checkoutAt ? 'Đã kết thúc lớp' : businessStatus.saving ? 'Đang lưu...' : 'Kết thúc lớp'}
              </button>}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-8 text-xs font-bold">
                      <span className="text-slate-800 border-b-2 border-[#FF5C00] pb-2.5 -mb-3">
                        Danh sách Học viên ({selectedClass.studentIds.length} HS)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${selectedDetail?.lifecycleStatus==='CHUA_HOC' ? 'bg-red-100 text-red-800' : selectedDetail?.lifecycleStatus==='CHUA_HOAN_TAT' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>
                        Trạng thái: {selectedDetail && {CHUA_DIEN_RA:'Chưa diễn ra',CHUA_HOC:'Chưa học',DANG_HOC:'Đang học',CHUA_HOAN_TAT:'Chưa hoàn tất',DA_HOC:'Đã học',NGHI_HOC:'Nghỉ học'}[selectedDetail.lifecycleStatus]}
                      </span>
                      {endedEarly && <span className="rounded-full px-2 py-1 text-xs font-bold bg-orange-100 text-orange-800">Chưa hoàn tất — kết thúc sớm hơn 5 phút</span>}
                      <span className="text-xs text-slate-500">Nhận xét: {selectedLesson?.feedbackProgress?.completed ?? selectedStudentIds.filter(id=>selectedClass.activeSessions?.[selectedSessionNum]?.feedback?.[id]?.trim()).length}/{selectedStudentIds.length}</span>
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
                      <PaginatedTableBody className="divide-y divide-slate-100">
                        {selectedStudentIds.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              Lớp chưa được ghép học sinh nào.
                            </td>
                          </tr>
                        ) : (
                          selectedStudentIds.map(sid => {
                            const studentItem = students.find(s => s.id === sid);
                            const studentDisplayName = studentItem ? studentItem.name : sid;
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
                                  <select disabled={classLiveStatus === 'CHUA_DIEN_RA'} value={selectedClass.activeSessions?.[selectedSessionNum]?.attendance?.[sid] || ''}
                                    onChange={event => { const value=event.target.value as 'present'|'late'|'absent';
                                      if (!requirePermission('Giáo viên Check-in / Check-out vào ca dạy')) return;
                                      setClasses(previous=>previous.map(cls=>{const active=cls.activeSessions?.[selectedSessionNum];
                                        return cls.id===selectedClass.id && active ? {...cls,activeSessions:{...cls.activeSessions,[selectedSessionNum]:{...active,attendance:{...active.attendance,[sid]:value}}}} : cls;
                                      }));
                                    }} className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:border-[#FF5C00]">
                                    <option value="" disabled>Chưa điểm danh</option>
                                    <option value="present">Có mặt</option>
                                    <option value="late">Đi muộn</option>
                                    <option value="absent">Vắng mặt</option>
                                  </select>
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReview(sid, studentDisplayName)}
                                    disabled={!reviewUnlocked}
                                    title={!reviewUnlocked ? 'Nhận xét mở sau khi đã ghi nhận checkout.' : undefined}
                                    className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs border border-orange-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{selectedClass.activeSessions?.[selectedSessionNum]?.feedback?.[sid]?.trim() ? 'Sửa nhận xét' : 'Nhận xét'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </PaginatedTableBody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 italic">
                      * Đến giờ kết thúc, hệ thống tự ghi checkout và mở nhận xét. Muốn kết thúc sớm, bấm Kết thúc lớp.
                    </div>
                    <div className="flex items-center gap-2">
                      <select aria-label="Loại sự cố ca học" className="rounded-lg border border-amber-200 p-2 text-xs" value={reportedIncidentCode||reportableIncidents[0]?.code||''} onChange={event=>setReportedIncidentCode(event.target.value)}>
                        {reportableIncidents.map(item=><option key={item.id} value={item.code}>{item.name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('Nhập lý do sự cố (mất điện, hỏng mạng, vắng đột xuất):', 'Mất kết nối Internet đột xuất');
                          if (reason) {
                            const schedule=selectedClassSchedule.find(entry=>entry.session===selectedSessionNum);
                            if(!schedule){showToast('Chưa xác định được ngày/khung giờ ca học.','error');return;}
                            void reportIncidentToSession(selectedClass.code,reportedIncidentCode||reportableIncidents[0]?.code||'',reason,dateStringForWeekDay(schedule.dayIndex),schedule.time);
                          }
                        }}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Báo Sự Cố Ca Học</span>
                      </button>

                    </div>
                  </div>
                </div>
            </TeachingSessionDetails>
          </div>
        </div>
      )}

      {/* ================= MODAL: NHẬN XÉT HỌC SINH ================= */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-4">
            <h3 className="font-bold text-lg">Nhận xét buổi học — {reviewStudentName}</h3>
            <p className="text-sm text-slate-500">Giáo viên nhập nhận xét sau checkout; cần nhận xét đủ học sinh để tính công.</p>
            <textarea className="w-full border rounded-xl p-3 min-h-48" value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="Nhập nhận xét cho học sinh..." />
            <div className="flex justify-end gap-3"><button onClick={()=>setIsReviewModalOpen(false)}>Đóng</button><button className="bg-orange-500 text-white rounded-lg px-4 py-2" onClick={handleSaveReview}>Lưu nhận xét</button></div>
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
                  onClick={() => setIsCloseChatConfirmOpen(true)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer font-bold text-xs transition-colors"
                  title="Thoát cuộc trò chuyện"
                  aria-label="Thoát cuộc trò chuyện"
                >
                  ✕
                </button>
              </div>
            </div>

            <GeminiConnectionStatus />
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
                    <ChatMessageText text={msg.text} format={msg.sender==='bot'} />
                  </div>
                </div>
              ))}
              {knowledgeChat.isAnswering && <p role="status" className="text-slate-500 animate-pulse">AI đang soạn câu trả lời…</p>}
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
                disabled={!chatInput.trim() || knowledgeChat.isAnswering}
                className="px-3.5 py-1.5 bg-[#FF5C00] hover:bg-[#E05200] disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

        {isCloseChatConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-chat-title"
              className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="close-chat-title" className="text-sm font-bold text-slate-800">
                    Đóng trợ lý AI và xóa cuộc trò chuyện?
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Nếu thoát, nội dung cuộc trò chuyện hiện tại sẽ bị xóa và không thể khôi phục.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseChatConfirmOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Ở lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseChat}
                  className="rounded-lg bg-[#FF5C00] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#E05200]"
                >
                  Thoát và xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
