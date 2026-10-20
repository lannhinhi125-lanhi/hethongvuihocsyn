import {availabilityWeeks} from '../lib/availabilityCalendar';
import {workbenchRange} from '../lib/workbenchTime';
import {reportToday} from '../lib/customReports';
import {moveCalendarDate} from '../lib/vietnameseCalendar';
import { ReportSelect } from '../components/ReportSelect';
import { usePermissions } from '../hooks/usePermissions';
import {useSaveConfirmation} from '../hooks/useSaveConfirmation';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ClassItem } from '../types';
import { canEditTeacherAvailability } from '../lib/teacherAvailability';
import { schedulesOverlap } from '../lib/workflow';

const RegisteredClassSummary: React.FC<{ item: Pick<ClassItem, 'code' | 'name' | 'model'> }> = ({ item }) => (
  <div className="min-w-0 space-y-1 text-left">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[11px] font-bold text-indigo-800 break-all">{item.code}</span>
      <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold" aria-label="Mô hình lớp">{item.model}</span>
    </div>
    <p className="text-[11px] leading-4 text-slate-700 line-clamp-2" title={item.name}>{item.name}</p>
  </div>
);

export const TeacherAvailabilityView: React.FC<{ initialTeacherId?: string; readOnly?: boolean }> = ({ initialTeacherId, readOnly = false }) => {
  const {confirmSave,isSavingChanges}=useSaveConfirmation();
  const { can, requirePermission } = usePermissions();
  const { currentUser, teachers, classes, timeSlots, updateTeacher, showToast } = useApp();

  const ownTeacher = teachers.find(t => canEditTeacherAvailability(currentUser, t));
  const activeTeacher = initialTeacherId ? teachers.find(t => t.id === initialTeacherId) : ownTeacher;
  const canEdit = !readOnly && can('Giáo viên đăng ký lịch rảnh theo tuần') && canEditTeacherAvailability(currentUser, activeTeacher);

  // BỘ LỌC THỜI GIAN THEO YÊU CẦU: Năm học hiện tại, Tháng, Tuần, Từ ngày - Đến ngày
  const initialWeek = workbenchRange(reportToday(), 'week');
  const [selectedMonth, setSelectedMonth] = useState(() => reportToday().slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState(initialWeek.start);
  const [fromDate, setFromDate] = useState(initialWeek.start);
  const [toDate, setToDate] = useState(initialWeek.end);
  const weekOptions = availabilityWeeks(selectedMonth);
  const showWeek = (from: string) => { const range = workbenchRange(from, 'week'); setSelectedMonth(from.slice(0,7)); setSelectedWeek(range.start); setFromDate(range.start); setToDate(range.end); };

  const handleWeekChange = (weekId: string) => {
    setSelectedWeek(weekId);
    const found = weekOptions.find(w => w.id === weekId);
    if (found) {
      setFromDate(found.from);
      setToDate(found.to);
    }
  };

  const days = [
    { key: 0, label: 'Thứ Hai', short: 'T2', sub: 'MON' },
    { key: 1, label: 'Thứ Ba', short: 'T3', sub: 'TUE' },
    { key: 2, label: 'Thứ Tư', short: 'T4', sub: 'WED' },
    { key: 3, label: 'Thứ Năm', short: 'T5', sub: 'THU' },
    { key: 4, label: 'Thứ Sáu', short: 'T6', sub: 'FRI' },
    { key: 5, label: 'Thứ Bảy', short: 'T7', sub: 'SAT' },
    { key: 6, label: 'Chủ Nhật', short: 'CN', sub: 'SUN' }
  ];

  // Danh mục ca học
  const activeSlots = timeSlots.filter(slot => slot.status !== false);

  // Bước 1: Thứ được chọn để cấu hình (0 = Thứ Hai, ..., 6 = Chủ Nhật)
  const [selectedDayKey, setSelectedDayKey] = useState<number>(0);

  // Chế độ xem: 'stepped' (Quy trình: Chọn Thứ -> Chọn Ca) hoặc 'matrix' (Bảng ma trận tuần tổng thể)
  const [viewMode, setViewMode] = useState<'stepped' | 'matrix'>('stepped');

  // Khởi tạo state từ activeTeacher.schedule
  const [scheduleState, setScheduleState] = useState<Record<string, ('free' | 'busy' | 'none')[]>>({});

  // Cập nhật scheduleState mỗi khi đổi giáo viên
  useEffect(() => {
    if (!activeTeacher) return;
    const initial: Record<string, ('free' | 'busy' | 'none')[]> = {};
    activeSlots.forEach(s => {
      if (activeTeacher?.schedule && activeTeacher.schedule[s.code]) {
        initial[s.code] = [...activeTeacher.schedule[s.code]];
      } else if (activeTeacher?.schedule && activeTeacher.schedule[s.id]) {
        initial[s.code] = [...activeTeacher.schedule[s.id]];
      } else {
        initial[s.code] = ['none', 'none', 'none', 'none', 'none', 'none', 'none'];
      }
    });
    setScheduleState(initial);
  }, [activeTeacher?.id, activeTeacher?.schedule]);

  // Helper tìm lớp học được gán cho giáo viên/gia sư tại thứ và khung giờ này
  const getAssignedClassForSlot = (dayKey: number, _slotCode: string, slotTimeRange: string) => {
    const dayShortMap: Record<number, string> = {
      0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN'
    };
    const targetDay = dayShortMap[dayKey];
    if (!activeTeacher) return undefined;
    const targetDate = new Date(`${workbenchRange(fromDate, 'week').start}T00:00:00`);
    targetDate.setDate(targetDate.getDate()+dayKey);
    const targetDateString=`${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;

    return classes.find(cls => {
      if(['Dừng lớp','Đã kết thúc'].includes(cls.status||''))return false;
      const isTeacherMatch = cls.teacherId === activeTeacher.id;
      if (!cls.schedule) return false;

      // Ví dụ: cls.schedule = 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)'
      const hasScheduledSlot = schedulesOverlap(cls.schedule,`${targetDay} (${slotTimeRange})`);
      if (!hasScheduledSlot) return false;
      if (isTeacherMatch) return true;

      const scheduledEntries = Array.from(
        cls.schedule.matchAll(/T([2-7])\s*\(([^)]+)\)|(CN|Chủ nhật)\s*\(([^)]+)\)/gi),
        match => ({ dayIndex: match[3] ? 6 : Number(match[1]) - 2, time: (match[2] || match[4] || '').trim() })
      ).sort((a, b) => a.dayIndex - b.dayIndex || a.time.localeCompare(b.time)).slice(0, 2);
      return cls.coverAssignments?.some(assignment => {
        const scheduledEntry = scheduledEntries[assignment.sessionNum - 1];
        return assignment.teacherId === activeTeacher.id &&
          assignment.dateStr === targetDateString &&
          scheduledEntry?.dayIndex === dayKey &&
          schedulesOverlap(`${targetDay} (${scheduledEntry.time})`,`${targetDay} (${slotTimeRange})`);
      }) || false;
    });
  };

  const toggleSlotStatus = (slotCode: string, dayIndex: number, assignedClass?: any) => {
    if (!canEdit) return;
    if (assignedClass) {
      showToast(`Ca này đã được gán Lớp học chính thức [${assignedClass.code}]! Không thể thay đổi trạng thái rảnh.`, 'warning');
      return;
    }

    setScheduleState(prev => {
      const currentArr = [...(prev[slotCode] || ['none', 'none', 'none', 'none', 'none', 'none', 'none'])];
      const currentVal = currentArr[dayIndex];
      if (currentVal === 'busy') {
        showToast('Ca này đang có lớp học chính thức do Vận hành xếp! Không thể hủy lịch rảnh.', 'warning');
        return prev;
      }
      currentArr[dayIndex] = currentVal === 'free' ? 'none' : 'free';
      return {
        ...prev,
        [slotCode]: currentArr
      };
    });
  };

  const setAllSlotsForDay = (dayIndex: number, setToFree: boolean) => {
    if (!canEdit) return;
    setScheduleState(prev => {
      const updated = { ...prev };
      activeSlots.forEach(s => {
        const arr = [...(updated[s.code] || ['none', 'none', 'none', 'none', 'none', 'none', 'none'])];
        const assigned = getAssignedClassForSlot(dayIndex, s.code, s.timeRange);
        if (arr[dayIndex] !== 'busy' && !assigned) {
          arr[dayIndex] = setToFree ? 'free' : 'none';
        }
        updated[s.code] = arr;
      });
      return updated;
    });
    showToast(setToFree ? `Đã bật rảnh tất cả ca cho ${days[dayIndex].label}` : `Đã xóa chọn tất cả ca cho ${days[dayIndex].label}`, 'info');
  };

  const setAllSlotsFree = () => {
    if (!canEdit || !activeSlots.length) return;
    setScheduleState(prev => {
      const updated = { ...prev };
      activeSlots.forEach(slot => {
        updated[slot.code] = days.map(day => {
          const current = prev[slot.code]?.[day.key] || 'none';
          const assigned = getAssignedClassForSlot(day.key, slot.code, slot.timeRange);
          return current === 'busy' || assigned ? current : 'free';
        });
      });
      return updated;
    });
    showToast('Đã bật rảnh tất cả ca từ Thứ Hai đến Chủ Nhật. Nhấn Lưu Lịch Rảnh để lưu đăng ký.', 'info');
  };
  const handleSaveAvailability = () => {
    if(isSavingChanges)return;
    if (!requirePermission("Giáo viên đăng ký lịch rảnh theo tuần")) return;
    if (!canEdit || !activeTeacher) return;
    const saved = updateTeacher(activeTeacher.id, {
      schedule: scheduleState
    });
    if (!saved) return;

    void confirmSave(()=>showToast(`Đã lưu lịch rảnh định kỳ cho ${activeTeacher.name}. Khoảng ngày chỉ dùng để đối chiếu lớp đang xếp lịch.`, 'success'));
  };

  const currentSelectedDay = days.find(d => d.key === selectedDayKey) || days[0];

  // Đếm tổng số ca rảnh toàn tuần
  const totalFreeSlots = activeSlots.reduce((count,slot)=>count+days.filter(day=>
    scheduleState[slot.code]?.[day.key]==='free'&&!getAssignedClassForSlot(day.key,slot.code,slot.timeRange)
  ).length,0);

  // Đếm số ca rảnh theo thứ
  const getFreeCountForDay = (dayIndex: number) => {
    return activeSlots.filter(s => {
      const assigned = getAssignedClassForSlot(dayIndex, s.code, s.timeRange);
      return (scheduleState[s.code] || [])[dayIndex] === 'free' && !assigned;
    }).length;
  };

  const getBusyCountForDay = (dayIndex: number) => {
    return activeSlots.filter(s => {
      const assigned = getAssignedClassForSlot(dayIndex, s.code, s.timeRange);
      return (scheduleState[s.code] || [])[dayIndex] === 'busy' || !!assigned;
    }).length;
  };

  if (!activeTeacher) return <div className="p-6 text-sm text-slate-500">Không tìm thấy hồ sơ giáo viên liên kết với tài khoản.</div>;

  return (
    <div className="space-y-5 font-infer">
      {!canEdit && <p className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs">Chỉ xem lịch giáo viên đã đăng ký. Chỉ giáo viên được thay đổi lựa chọn của mình.</p>}
      {/* Header Banner phong cách Figma tối giản */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider border border-slate-200">
              CỔNG GIẢNG DẠY &amp; GIA SƯ
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Lịch rảnh định kỳ
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-2">
            {canEdit ? 'Đăng Ký Khung Ca Dạy & Lịch Rảnh' : 'Lịch rảnh & Thời khóa biểu'}
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">{activeTeacher.name} • {activeTeacher.id}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chế độ xem */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-medium border border-slate-200">
            <button
              onClick={() => setViewMode('stepped')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'stepped'
                  ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quy trình Thứ &amp; Ca
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ma trận Tuần
            </button>
          </div>

          {canEdit && <button
            type="button"
            onClick={setAllSlotsFree}
            disabled={!activeSlots.length}
            title="Bật rảnh toàn bộ ca từ Thứ Hai đến Chủ Nhật, bỏ qua ca đã có lớp"
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bật rảnh tất cả (cả tuần)
          </button>}
          {/* Nút lưu */}
          {canEdit && <button
            disabled={isSavingChanges || !can("Giáo viên đăng ký lịch rảnh theo tuần")} onClick={handleSaveAvailability}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Lưu Lịch Rảnh ({totalFreeSlots} ca)
          </button>}
        </div>
      </div>

      {/* Bộ lọc thời gian gọn theo hàng ngang, dùng chung cho quản trị và giáo viên. */}
      <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-end gap-2 text-[11px]">

          <label className="flex-1 sm:flex-none min-w-[95px] text-slate-500">Tháng
            <input aria-label="Tháng" type="month" value={selectedMonth} onChange={event => { const value=event.target.value; if(value) { setSelectedMonth(value); const week=availabilityWeeks(value)[0]; if(week) {setSelectedWeek(week.id);setFromDate(week.from);setToDate(week.to);} } }} className="block w-full mt-1 h-8 px-2 rounded-lg border border-slate-200" />
          </label>
          <label className="flex-1 sm:flex-none min-w-[170px] text-slate-500">Tuần
            <ReportSelect aria-label="Tuần" value={selectedWeek} onChange={e => handleWeekChange(e.target.value)} className="block w-full sm:w-48 mt-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800">
              {weekOptions.map(week => <option key={week.id} value={week.id}>{week.label}</option>)}
            </ReportSelect>
          </label>
          <label className="flex-1 sm:flex-none text-slate-500">Từ ngày
            <input aria-label="Từ ngày" type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} className="block w-full sm:w-32 mt-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800" />
          </label>
          <label className="flex-1 sm:flex-none text-slate-500">Đến ngày
            <input aria-label="Đến ngày" type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} className="block w-full sm:w-32 mt-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800" />
          </label>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => showWeek(reportToday())} className={selectedWeek === workbenchRange(reportToday(),'week').start ? 'h-8 px-2 rounded-lg bg-indigo-600 text-white' : 'h-8 px-2 rounded-lg border border-slate-200 text-slate-600'}>Tuần này</button>
            <button type="button" onClick={() => showWeek(moveCalendarDate(reportToday(),7))} className={selectedWeek === workbenchRange(moveCalendarDate(reportToday(),7),'week').start ? 'h-8 px-2 rounded-lg bg-indigo-600 text-white' : 'h-8 px-2 rounded-lg border border-slate-200 text-slate-600'}>Tuần sau</button>
          </div>
        </div>
      </div>

      {/* ================= CHẾ ĐỘ QUY TRÌNH: CHỌN THỨ -> CHỌN CA ================= */}
      {viewMode === 'stepped' && (
        <div className="space-y-4">
          {/* BƯỚC 1: THANH CHỌN THỨ TRONG TUẦN */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  Bước 1: Chọn ngày trong tuần (Thứ Hai &rarr; Chủ Nhật)
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Hiệu lực: {fromDate} đến {toDate}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {days.map(d => {
                const isSelected = selectedDayKey === d.key;
                const freeCount = getFreeCountForDay(d.key);
                const busyCount = getBusyCountForDay(d.key);

                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDayKey(d.key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {d.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{d.sub}</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {freeCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                          {freeCount} ca rảnh
                        </span>
                      )}
                      {busyCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[10px] border border-indigo-200">
                          {busyCount} có lớp
                        </span>
                      )}
                      {freeCount === 0 && busyCount === 0 && (
                        <span className="text-[11px] text-slate-400">Chưa đăng ký</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BƯỚC 2: CHỌN CA CHO THỨ ĐANG CHỌN */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {canEdit ? 'Bước 2: Chọn Ca rảnh cho ' : 'Ca đã đăng ký cho '}<strong>{currentSelectedDay.label}</strong>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {canEdit ? 'Tick chọn ca Thầy/Cô và Gia sư sẵn sàng nhận lớp. Ca đã xếp lớp sẽ hiển thị mã lớp cố định.' : 'Xem trạng thái ca giáo viên đã đăng ký và các lớp đã được xếp.'}
                  </p>
                </div>
              </div>

              {/* Thao tác nhanh */}
              {canEdit && <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllSlotsForDay(selectedDayKey, true)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  Bật rảnh tất cả ca ngày này
                </button>
                <button
                  type="button"
                  onClick={() => setAllSlotsForDay(selectedDayKey, false)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 font-medium cursor-pointer"
                >
                  Xóa chọn ngày này
                </button>
              </div>}
            </div>

            {/* Danh sách các ca học */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeSlots.map(slot => {
                const currentArr = scheduleState[slot.code] || ['none', 'none', 'none', 'none', 'none', 'none', 'none'];
                const status = currentArr[selectedDayKey] || 'none';
                const assignedClass = getAssignedClassForSlot(selectedDayKey, slot.code, slot.timeRange);
                const hasAssignedClass = !!assignedClass;
                const isFree = status === 'free' && !hasAssignedClass;
                const isBusy = status === 'busy' || hasAssignedClass;

                return (
                  <div key={slot.code || slot.id} className="min-w-0 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-wrap justify-between gap-1 px-3 py-1.5 bg-slate-50 text-[10px] text-slate-500">
                      <span className="font-medium">{slot.name}</span>
                      <span className="font-mono whitespace-nowrap">{slot.timeRange}</span>
                    </div>
                    {assignedClass ? (
                      <div className="px-3 py-2 bg-indigo-50/60"><RegisteredClassSummary item={assignedClass} /></div>
                    ) : (
                      <button type="button" disabled={!canEdit || isBusy} onClick={() => toggleSlotStatus(slot.code, selectedDayKey)} aria-pressed={isFree}
                        className={isFree ? 'w-full px-3 py-2 flex items-center gap-2 text-left bg-emerald-50 text-emerald-700 text-xs font-semibold disabled:cursor-default' : 'w-full px-3 py-2 flex items-center gap-2 text-left bg-white text-slate-500 text-xs disabled:cursor-default'}>
                        <span className={isFree ? 'w-4 h-4 rounded bg-emerald-600 text-white text-center text-[11px]' : 'w-4 h-4 rounded border border-slate-300 text-center text-[11px]'}>{isFree ? '✓' : isBusy ? '●' : ''}</span>
                        <span>{isFree ? 'Đã đăng ký rảnh' : isBusy ? 'Có lớp' : canEdit ? 'Đăng ký rảnh' : 'Chưa đăng ký'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= CHẾ ĐỘ MA TRẬN: TỔNG THỂ TOÀN TUẦN ================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {/* Chú giải trạng thái */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-700">Trạng thái ô lịch:</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                  ✓ Rảnh
                </span>
                <span className="text-slate-600">Lịch Rảnh (Sẵn sàng nhận lớp)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-indigo-800 text-[10px] font-bold">
                  Mã Lớp
                </span>
                <span className="text-slate-600">Đã gán lớp học chính thức</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[10px]">
                  Trống
                </span>
                <span className="text-slate-600">Không rảnh / Bận</span>
              </div>
            </div>

            <div className="text-slate-500 text-[11px] italic">
              Khoảng thời gian: {fromDate} đến {toDate} (Lịch rảnh định kỳ)
            </div>
          </div>

          {/* Grid lịch biểu tuần phong cách Figma Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="p-3.5 w-52 border-r border-slate-800">Khung ca học</th>
                    {days.map(d => (
                      <th key={d.key} className="p-3.5 text-center border-r border-slate-800 last:border-r-0">
                        <div className="font-bold text-xs">{d.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{d.sub}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeSlots.map(s => {
                    const currentArr = scheduleState[s.code] || ['none', 'none', 'none', 'none', 'none', 'none', 'none'];
                    return (
                      <tr key={s.code || s.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 bg-slate-50 border-r border-slate-200 font-medium">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{s.timeRange}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.code}</div>
                        </td>
                        {days.map(d => {
                          const status = currentArr[d.key] || 'none';
                          const assignedClass = getAssignedClassForSlot(d.key, s.code, s.timeRange);
                          const hasAssignedClass = !!assignedClass;
                          const isFree = status === 'free' && !hasAssignedClass;
                          const isBusy = status === 'busy' || hasAssignedClass;

                          return (
                            <td
                              key={d.key}
                              onClick={canEdit ? () => toggleSlotStatus(s.code, d.key, assignedClass) : undefined}
                              className={`p-2 border-r border-slate-200 last:border-r-0 text-center transition-all ${
                                !canEdit ? 'cursor-default ' + (isFree ? 'bg-emerald-50/70' : 'bg-slate-50') : hasAssignedClass
                                  ? 'bg-indigo-50/80 cursor-default'
                                  : isFree
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer'
                                  : isBusy
                                  ? 'bg-indigo-50/60 cursor-not-allowed'
                                  : 'bg-white hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <div
                                className={`min-h-[48px] p-1.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                  hasAssignedClass
                                    ? 'border-indigo-300 bg-white shadow-2xs text-indigo-900'
                                    : isFree
                                    ? 'border-emerald-300 bg-emerald-100/60 text-emerald-800'
                                    : isBusy
                                    ? 'border-indigo-200 bg-indigo-100/60 text-indigo-800'
                                    : 'border-dashed border-slate-200 text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                {hasAssignedClass ? (
                                  <RegisteredClassSummary item={assignedClass} />
                                ) : isFree ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-bold text-emerald-600">✓</span>
                                    <span className="text-[10px] font-bold text-emerald-700">Rảnh</span>
                                  </div>
                                ) : isBusy ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                    <span className="text-[10px] font-bold text-indigo-700">Có lớp</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium">{canEdit ? '+ Bật rảnh' : 'Chưa đăng ký'}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
