import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const TeacherAvailabilityView: React.FC<{ initialTeacherId?: string }> = ({ initialTeacherId }) => {
  const { currentUser, teachers, classes, timeSlots, updateTeacher, showToast } = useApp();

  // Tìm giáo viên/gia sư mặc định theo initialTeacherId hoặc người dùng đăng nhập hoặc người đầu tiên
  const initialTeacher = teachers.find(
    t => t.id === initialTeacherId || t.id === currentUser.id || t.email === currentUser.email || t.name.includes(currentUser.name.replace('Thầy ', '').replace('Cô ', ''))
  ) || teachers[0];

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || initialTeacher?.id || teachers[0]?.id || 'GV-001');

  // Giáo viên hoặc Gia sư đang được chọn xem và chỉnh sửa lịch rảnh
  const activeTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];

  // BỘ LỌC THỜI GIAN THEO YÊU CẦU: Năm học hiện tại, Tháng, Tuần, Từ ngày - Đến ngày
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2026 - 2027');
  const [selectedMonth, setSelectedMonth] = useState('10/2026');
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [fromDate, setFromDate] = useState('2026-10-05');
  const [toDate, setToDate] = useState('2026-10-11');

  // Danh sách các tuần mẫu trong tháng
  const weekOptions = [
    { id: 'W1', label: 'Tuần 1 (05/10/2026 - 11/10/2026)', from: '2026-10-05', to: '2026-10-11' },
    { id: 'W2', label: 'Tuần 2 (12/10/2026 - 18/10/2026)', from: '2026-10-12', to: '2026-10-18' },
    { id: 'W3', label: 'Tuần 3 (19/10/2026 - 25/10/2026)', from: '2026-10-19', to: '2026-10-25' },
    { id: 'W4', label: 'Tuần 4 (26/10/2026 - 01/11/2026)', from: '2026-10-26', to: '2026-11-01' }
  ];

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
  const activeSlots = (timeSlots && timeSlots.length > 0)
    ? timeSlots.filter(s => s.status !== false)
    : [
        { id: 'SLOT-1250', code: 'SLOT-1250', name: 'Ca Trưa Thử Nghiệm (12:50 - 13:50)', timeRange: '12:50 - 13:50', durationMinutes: 60, status: true },
        { id: 'SLOT-1', code: 'SLOT-E1', name: 'Ca Tối 1 (Giờ vàng)', timeRange: '18:00 - 19:30', durationMinutes: 90, status: true },
        { id: 'SLOT-2', code: 'SLOT-E2', name: 'Ca Tối 2', timeRange: '19:45 - 21:15', durationMinutes: 90, status: true },
        { id: 'SLOT-3', code: 'SLOT-A1', name: 'Ca Chiều', timeRange: '16:15 - 17:45', durationMinutes: 90, status: true }
      ];

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
  }, [selectedTeacherId, activeTeacher?.id]);

  // Helper tìm lớp học được gán cho giáo viên/gia sư tại thứ và khung giờ này
  const getAssignedClassForSlot = (dayKey: number, slotCode: string, slotTimeRange: string) => {
    const dayShortMap: Record<number, string> = {
      0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN'
    };
    const targetDay = dayShortMap[dayKey];

    return classes.find(cls => {
      const isTeacherMatch =
        cls.teacherId === activeTeacher.id ||
        (cls.teacherName && activeTeacher.name && (
          cls.teacherName.includes(activeTeacher.name) ||
          activeTeacher.name.includes(cls.teacherName)
        ));
      if (!isTeacherMatch) return false;
      if (!cls.schedule) return false;

      // Ví dụ: cls.schedule = 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)'
      const parts = cls.schedule.split(',').map(p => p.trim());
      return parts.some(part => {
        const hasDay = part.startsWith(targetDay) || part.includes(targetDay);
        const startTime = slotTimeRange ? slotTimeRange.split(' - ')[0] : '';
        const hasTime = (startTime && part.includes(startTime)) || (slotCode && part.includes(slotCode));
        return hasDay && hasTime;
      });
    });
  };

  const toggleSlotStatus = (slotCode: string, dayIndex: number, assignedClass?: any) => {
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

  const handleSaveAvailability = () => {
    if (!activeTeacher) return;
    let freeCount = 0;
    Object.values(scheduleState).forEach(arr => {
      arr.forEach(val => {
        if (val === 'free') freeCount++;
      });
    });

    updateTeacher(activeTeacher.id, {
      schedule: scheduleState,
      freeSlots: freeCount
    });

    showToast(`Đã lưu lịch rảnh (Hiệu lực: ${fromDate} đến ${toDate}, Năm học ${selectedSchoolYear}) cho ${activeTeacher.name}!`, 'success');
  };

  const currentSelectedDay = days.find(d => d.key === selectedDayKey) || days[0];

  // Đếm tổng số ca rảnh toàn tuần
  const totalFreeSlots = Object.values(scheduleState).reduce((acc, arr) => {
    return acc + arr.filter(v => v === 'free').length;
  }, 0);

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

  return (
    <div className="space-y-5 font-infer">
      {/* Header Banner phong cách Figma tối giản */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider border border-slate-200">
              CỔNG GIẢNG DẠY &amp; GIA SƯ
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Năm học {selectedSchoolYear}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-2">
            Đăng Ký Khung Ca Dạy &amp; Lịch Rảnh
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký thời gian rảnh theo từng khoảng hiệu lực. Ca đã ghép lớp sẽ hiển thị mã lớp và được lưu lịch sử đầy đủ.
          </p>
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

          {/* Nút lưu */}
          <button
            onClick={handleSaveAvailability}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Lưu Lịch Rảnh ({totalFreeSlots} ca)
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

            {/* Tuần học & Phím tắt Tuần sau */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-600">Tuần học:</span>
              <select
                value={selectedWeek}
                onChange={e => handleWeekChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {weekOptions.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleWeekChange('W1')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedWeek === 'W1'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => handleWeekChange('W2')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedWeek === 'W2'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-extrabold'
                }`}
                title="Bấm để xem & đăng ký lịch rảnh Tuần sau"
              >
                👉 Tuần sau
              </button>
            </div>
          </div>

          {/* Khoảng ngày hiệu lực Từ ngày - Đến ngày */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <span className="font-semibold text-slate-600">Thời gian hiệu lực:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400">&rarr;</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
              Đang áp dụng
            </span>
          </div>
        </div>

        {/* Thanh ghi chú lịch sử và tài khoản */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tài khoản:</span>
            <span className="font-bold text-indigo-700">{activeTeacher?.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {activeTeacher?.id}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeTeacher?.name.includes('Gia sư') ? 'Gia sư chuyên đề' : 'Giáo viên'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Đổi tài khoản:</span>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Bước 2: Chọn Ca rảnh cho <strong>{currentSelectedDay.label}</strong>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tick chọn ca Thầy/Cô và Gia sư sẵn sàng nhận lớp. Ca đã xếp lớp sẽ hiển thị mã lớp cố định.
                  </p>
                </div>
              </div>

              {/* Thao tác nhanh */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllSlotsForDay(selectedDayKey, true)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  Bật rảnh tất cả ca
                </button>
                <button
                  type="button"
                  onClick={() => setAllSlotsForDay(selectedDayKey, false)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 font-medium cursor-pointer"
                >
                  Xóa chọn ngày này
                </button>
              </div>
            </div>

            {/* Danh sách các ca học */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {activeSlots.map(slot => {
                const currentArr = scheduleState[slot.code] || ['none', 'none', 'none', 'none', 'none', 'none', 'none'];
                const status = currentArr[selectedDayKey] || 'none';
                const assignedClass = getAssignedClassForSlot(selectedDayKey, slot.code, slot.timeRange);
                const hasAssignedClass = !!assignedClass;
                const isFree = status === 'free' && !hasAssignedClass;
                const isBusy = status === 'busy' || hasAssignedClass;

                return (
                  <div
                    key={slot.code || slot.id}
                    onClick={() => toggleSlotStatus(slot.code, selectedDayKey, assignedClass)}
                    className={`p-4 rounded-xl border transition-all select-none flex flex-col justify-between ${
                      hasAssignedClass
                        ? 'border-indigo-400 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-400/30 cursor-default'
                        : isFree
                        ? 'border-emerald-400 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-400/30 cursor-pointer'
                        : isBusy
                        ? 'border-indigo-200 bg-indigo-50/50 cursor-not-allowed opacity-90'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-semibold text-slate-500 uppercase">
                              {slot.code}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                              {slot.durationMinutes || 90} phút
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{slot.name}</h4>
                        </div>

                        {/* Chỉ báo trạng thái */}
                        <div className="pt-0.5">
                          {hasAssignedClass ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white tracking-wide">
                              ĐÃ GÁN LỚP
                            </span>
                          ) : isFree ? (
                            <span className="w-5 h-5 rounded bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                              ✓
                            </span>
                          ) : isBusy ? (
                            <span className="w-5 h-5 rounded bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                              ●
                            </span>
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-slate-300 hover:border-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs font-mono font-medium text-slate-600">
                        <span>Khung giờ: {slot.timeRange}</span>
                      </div>

                      {/* KHỐI HIỂN THỊ MÃ LỚP ĐƯỢC GÁN VÀO CA HỌC */}
                      {hasAssignedClass && (
                        <div className="mt-3 p-2.5 rounded-lg bg-white border border-indigo-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                              MÃ LỚP HỌC:
                            </span>
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                              {assignedClass.code}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {assignedClass.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-100">
                            <span>Mô hình: {assignedClass.model}</span>
                            <span>Sĩ số: {assignedClass.studentIds?.length || 0}/{assignedClass.maxStudents} HS</span>
                          </div>
                          {assignedClass.roomLink && (
                            <div className="pt-1">
                              <a
                                href={assignedClass.roomLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline truncate block"
                              >
                                Vào phòng Zoom lớp học &rarr;
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {hasAssignedClass ? (
                        <span className="font-bold text-indigo-800">
                          Đã xếp lớp chính thức (Cố định ca)
                        </span>
                      ) : isFree ? (
                        <span className="font-bold text-emerald-700">
                          ✓ Đã chọn RẢNH (Sẵn sàng nhận lớp)
                        </span>
                      ) : isBusy ? (
                        <span className="font-semibold text-indigo-700">
                          Đã có lịch bận / ghép lớp
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Bấm để đánh dấu Thầy/Cô rảnh nhận lớp
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentSelectedDay.short}
                      </span>
                    </div>
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
              Khoảng thời gian: {fromDate} đến {toDate} (Năm học {selectedSchoolYear})
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
                              onClick={() => toggleSlotStatus(s.code, d.key, assignedClass)}
                              className={`p-2 border-r border-slate-200 last:border-r-0 text-center transition-all ${
                                hasAssignedClass
                                  ? 'bg-indigo-50/80 cursor-default'
                                  : isFree
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer'
                                  : isBusy
                                  ? 'bg-indigo-50/60 cursor-not-allowed'
                                  : 'bg-white hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <div
                                className={`min-h-[64px] p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
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
                                  <div className="w-full text-center space-y-0.5">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block">
                                      ĐÃ XẾP LỚP
                                    </span>
                                    <span className="font-mono font-bold text-[11px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-900 block truncate">
                                      {assignedClass.code}
                                    </span>
                                    <span className="text-[10px] text-slate-600 truncate block font-medium max-w-[110px] mx-auto">
                                      {assignedClass.name}
                                    </span>
                                  </div>
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
                                  <span className="text-[11px] text-slate-400 font-medium">+ Bật rảnh</span>
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
