import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

export interface WeekItem {
  id: string;
  name: string;
  range: string;
  start: string;
  end: string;
}

export interface StandardTimeFilterProps {
  label?: string;
  month?: string; // '2026-09', '2026-10', 'ALL'
  onMonthChange?: (month: string) => void;
  startDate: string; // 'YYYY-MM-DD'
  onStartDateChange: (date: string) => void;
  endDate: string; // 'YYYY-MM-DD'
  onEndDateChange: (date: string) => void;
  selectedWeek?: string; // 'W1', 'W2', 'ALL'
  onWeekChange?: (week: string) => void;
  accentColor?: 'indigo' | 'orange' | 'rose' | 'purple' | 'emerald';
}

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const weeksListFor = (month: string) => {
  if (month === 'ALL') return { start: '', end: '' };
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return { start: '', end: '' };
  return {
    start: `${month}-01`,
    end: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
  };
};

export const StandardTimeFilter: React.FC<StandardTimeFilterProps> = ({
  label = 'Mốc thời gian phân tích',
  month,
  onMonthChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedWeek,
  onWeekChange,
  accentColor = 'indigo'
}) => {
  // Tháng nội bộ nếu không truyền từ ngoài
  const [internalMonth, setInternalMonth] = useState<string>(month || '2026-10');
  const currentMonth = month !== undefined ? month : internalMonth;

  const [activeWeekId, setActiveWeekId] = useState<string>(selectedWeek || 'ALL');

  useEffect(() => {
    setActiveWeekId(selectedWeek || 'ALL');
  }, [selectedWeek]);

  const weeksList: WeekItem[] = useMemo(() => {
    if (currentMonth === 'ALL') {
      return [{ id: 'ALL', name: 'Tất cả các mốc', range: 'Toàn thời gian', start: '', end: '' }];
    }
    const [year, monthNumber] = currentMonth.split('-').map(Number);
    if (!year || !monthNumber) return [];
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const monthName = new Date(year, monthNumber - 1, 1).toLocaleDateString('vi-VN', { month: 'long' });
    const weeks: WeekItem[] = [{
      id: 'ALL',
      name: `Cả tháng ${monthNumber}`,
      range: `01/${String(monthNumber).padStart(2, '0')} - ${daysInMonth}/${String(monthNumber).padStart(2, '0')}`,
      start: `${currentMonth}-01`,
      end: `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`
    }];
    for (let startDay = 1, week = 1; startDay <= daysInMonth; startDay += 7, week += 1) {
      const endDay = Math.min(startDay + 6, daysInMonth);
      weeks.push({
        id: `W${week}`,
        name: `Tuần ${week}`,
        range: `${String(startDay).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')} - ${String(endDay).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}`,
        start: `${currentMonth}-${String(startDay).padStart(2, '0')}`,
        end: `${currentMonth}-${String(endDay).padStart(2, '0')}`
      });
    }
    return weeks.map(week => ({ ...week, name: week.id === 'ALL' ? `Cả ${monthName}` : week.name }));
  }, [currentMonth]);

  const monthOptions = useMemo(() => {
    const selectedParts = currentMonth === 'ALL' ? [] : currentMonth.split('-').map(Number);
    const anchor = selectedParts.length === 2 && selectedParts[0] && selectedParts[1]
      ? new Date(selectedParts[0], selectedParts[1] - 1, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const currentMonthValue = toDateInputValue(new Date()).slice(0, 7);
    const options = Array.from({ length: 13 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() + index - 6, 1);
      const value = toDateInputValue(date).slice(0, 7);
      return {
        value,
        label: `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}${value === currentMonthValue ? ' (Hiện tại)' : ''}`
      };
    });
    if (currentMonth !== 'ALL' && !options.some(option => option.value === currentMonth)) {
      const [year, monthNumber] = currentMonth.split('-').map(Number);
      options.push({
        value: currentMonth,
        label: `Tháng ${String(monthNumber).padStart(2, '0')}/${year}${currentMonth === currentMonthValue ? ' (Hiện tại)' : ''}`
      });
      options.sort((left, right) => left.value.localeCompare(right.value));
    }
    return options;
  }, [currentMonth]);

  const academicYearLabel = useMemo(() => {
    const monthDate = currentMonth === 'ALL' ? new Date() : new Date(`${currentMonth}-01T00:00:00`);
    const startYear = monthDate.getFullYear() - (monthDate.getMonth() + 1 < 8 ? 1 : 0);
    return `Năm học ${startYear} - ${startYear + 1}`;
  }, [currentMonth]);

  // Xử lý khi người dùng chọn tháng
  const handleMonthChange = (newMonth: string) => {
    if (onMonthChange) onMonthChange(newMonth);
    else setInternalMonth(newMonth);

    const selectedMonth = weeksListFor(newMonth);
    onStartDateChange(selectedMonth.start);
    onEndDateChange(selectedMonth.end);
    setActiveWeekId('ALL');
    if (onWeekChange) onWeekChange('ALL');
  };

  // Xử lý khi người dùng chọn tuần
  const handleWeekSelect = (week: WeekItem) => {
    setActiveWeekId(week.id);
    if (onWeekChange) onWeekChange(week.id);
    if (week.start) onStartDateChange(week.start);
    if (week.end) onEndDateChange(week.end);
  };

  // Xử lý chuyển sang Tuần Sau theo yêu cầu người dùng
  const handleNextWeek = () => {
    const baseStart = startDate || toDateInputValue(new Date());
    const nextWeekStart = new Date(`${baseStart}T00:00:00`);
    if (!startDate) nextWeekStart.setDate(nextWeekStart.getDate() - ((nextWeekStart.getDay() + 6) % 7));
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextStart = toDateInputValue(nextWeekStart);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    const nextEnd = toDateInputValue(nextWeekEnd);
    const nextMonth = nextStart.slice(0, 7);

    onMonthChange?.(nextMonth);
    if (!onMonthChange) setInternalMonth(nextMonth);
    onStartDateChange(nextStart);
    onEndDateChange(nextEnd);
    setActiveWeekId('NEXT_WEEK');
    if (onWeekChange) onWeekChange('NEXT_WEEK');
  };

  const handleThisWeek = () => {
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - ((weekStartDate.getDay() + 6) % 7));
    const weekStart = toDateInputValue(weekStartDate);
    weekStartDate.setDate(weekStartDate.getDate() + 6);
    const weekEnd = toDateInputValue(weekStartDate);
    onMonthChange?.(weekStart.slice(0, 7));
    if (!onMonthChange) setInternalMonth(weekStart.slice(0, 7));
    onStartDateChange(weekStart);
    onEndDateChange(weekEnd);
    setActiveWeekId('THIS_WEEK');
    if (onWeekChange) onWeekChange('THIS_WEEK');
  };

  // Tính toán nhãn tuần hiển thị
  const computedActiveWeekLabel = useMemo(() => {
    if (activeWeekId === 'NEXT_WEEK' || activeWeekId === 'THIS_WEEK') {
      const label = activeWeekId === 'THIS_WEEK' ? 'Tuần này' : 'Tuần sau';
      return `${label} (${startDate.slice(8, 10)}/${startDate.slice(5, 7)} - ${endDate.slice(8, 10)}/${endDate.slice(5, 7)})`;
    }
    const matched = weeksList.find(w => w.id === activeWeekId);
    if (matched && matched.id !== 'ALL') {
      return `${matched.name} (${matched.range})`;
    }
    if (startDate && endDate) {
      return `${startDate.slice(8, 10)}/${startDate.slice(5, 7)} - ${endDate.slice(8, 10)}/${endDate.slice(5, 7)}`;
    }
    return 'Tất cả các tuần';
  }, [weeksList, activeWeekId, startDate, endDate]);

  // Màu sắc chủ đạo linh hoạt
  const colorStyles = {
    indigo: {
      border: 'focus:border-indigo-600',
      activeBtn: 'bg-indigo-600 text-white border-indigo-600',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    orange: {
      border: 'focus:border-[#FF5C00]',
      activeBtn: 'bg-[#FF5C00] text-white border-[#FF5C00]',
      badge: 'text-[#FF5C00] bg-orange-50 border-orange-200'
    },
    rose: {
      border: 'focus:border-rose-600',
      activeBtn: 'bg-rose-600 text-white border-rose-600',
      badge: 'text-rose-700 bg-rose-50 border-rose-200'
    },
    purple: {
      border: 'focus:border-purple-600',
      activeBtn: 'bg-purple-600 text-white border-purple-600',
      badge: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    emerald: {
      border: 'focus:border-emerald-600',
      activeBtn: 'bg-emerald-600 text-white border-emerald-600',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }
  }[accentColor];

  return (
    <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3">
      {/* 1. CHỌN THÁNG */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Tháng:</span>
          </label>
          <span className="text-[10px] text-slate-400 font-semibold">{academicYearLabel}</span>
        </div>
        <select
          value={currentMonth}
          onChange={e => handleMonthChange(e.target.value)}
          className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 ${colorStyles.border} focus:outline-none cursor-pointer shadow-2xs`}
        >
          {monthOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
          <option value="ALL">Tất cả các tháng</option>
        </select>
      </div>

      {/* 2. NGÀY BẮT ĐẦU & NGÀY KẾT THÚC */}
      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-700">
          Ngày bắt đầu &amp; Ngày kết thúc:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Ngày bắt đầu</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                onStartDateChange(e.target.value);
                setActiveWeekId('CUSTOM');
              }}
              className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 ${colorStyles.border} focus:outline-none shadow-2xs`}
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Ngày kết thúc</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                onEndDateChange(e.target.value);
                setActiveWeekId('CUSTOM');
              }}
              className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 ${colorStyles.border} focus:outline-none shadow-2xs`}
            />
          </div>
        </div>

        {/* Nút tắt chọn nhanh: Tuần này, Tuần sau theo yêu cầu người dùng */}
        <div className="flex items-center gap-1.5 pt-1.5">
          <button
            type="button"
            onClick={handleThisWeek}
            className={`flex-1 py-1 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer text-center ${
              activeWeekId === 'THIS_WEEK'
                ? `${colorStyles.activeBtn} shadow-xs`
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className={`flex-1 py-1 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer text-center ${
              activeWeekId === 'NEXT_WEEK'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-extrabold'
            }`}
            title="Bấm để xem ngay Tuần sau"
          >
            👉 Tuần sau
          </button>
          <button
            type="button"
            onClick={() => handleMonthChange(currentMonth)}
            className={`py-1 px-2.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
              activeWeekId === 'ALL'
                ? `${colorStyles.activeBtn} shadow-xs font-bold`
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Cả tháng
          </button>
        </div>
      </div>

      {/* 3. HIỂN THỊ TUẦN SAU (theo yêu cầu của người dùng: "còn sẽ hiện tuần sau. như vậy tiện hơn") */}
      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Tuần tương ứng:</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorStyles.badge}`}>
            {computedActiveWeekLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
          {weeksList.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleWeekSelect(w)}
              className={`px-2 py-1.5 rounded-xl border text-left text-[11px] transition-all cursor-pointer ${
                activeWeekId === w.id
                  ? `${colorStyles.activeBtn} shadow-xs font-bold`
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 font-medium'
              }`}
            >
              <div className="truncate">{w.name}</div>
              <div className={`text-[10px] truncate ${activeWeekId === w.id ? 'opacity-90' : 'text-slate-400'}`}>
                {w.range}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
