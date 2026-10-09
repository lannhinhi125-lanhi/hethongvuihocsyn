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

  // Sinh danh sách các tuần dựa theo Tháng được chọn
  const weeksList: WeekItem[] = useMemo(() => {
    if (currentMonth === '2026-09') {
      return [
        { id: 'ALL', name: 'Cả tháng 9', range: '01/09 - 30/09', start: '2026-09-01', end: '2026-09-30' },
        { id: 'W1', name: 'Tuần 1', range: '01/09 - 07/09', start: '2026-09-01', end: '2026-09-07' },
        { id: 'W2', name: 'Tuần 2', range: '08/09 - 14/09', start: '2026-09-08', end: '2026-09-14' },
        { id: 'W3', name: 'Tuần 3', range: '15/09 - 21/09', start: '2026-09-15', end: '2026-09-21' },
        { id: 'W4', name: 'Tuần 4', range: '22/09 - 28/09', start: '2026-09-22', end: '2026-09-28' },
        { id: 'W5', name: 'Tuần 5', range: '29/09 - 30/09', start: '2026-09-29', end: '2026-09-30' }
      ];
    } else if (currentMonth === '2026-10') {
      return [
        { id: 'ALL', name: 'Cả tháng 10', range: '01/10 - 31/10', start: '2026-10-01', end: '2026-10-31' },
        { id: 'W1', name: 'Tuần 1', range: '01/10 - 07/10', start: '2026-10-01', end: '2026-10-07' },
        { id: 'W2', name: 'Tuần 2', range: '08/10 - 14/10', start: '2026-10-08', end: '2026-10-14' },
        { id: 'W3', name: 'Tuần 3', range: '15/10 - 21/10', start: '2026-10-15', end: '2026-10-21' },
        { id: 'W4', name: 'Tuần 4', range: '22/10 - 28/10', start: '2026-10-22', end: '2026-10-28' },
        { id: 'W5', name: 'Tuần 5', range: '29/10 - 31/10', start: '2026-10-29', end: '2026-10-31' }
      ];
    } else if (currentMonth === '2026-11') {
      return [
        { id: 'ALL', name: 'Cả tháng 11', range: '01/11 - 30/11', start: '2026-11-01', end: '2026-11-30' },
        { id: 'W1', name: 'Tuần 1', range: '01/11 - 07/11', start: '2026-11-01', end: '2026-11-07' },
        { id: 'W2', name: 'Tuần 2', range: '08/11 - 14/11', start: '2026-11-08', end: '2026-11-14' },
        { id: 'W3', name: 'Tuần 3', range: '15/11 - 21/11', start: '2026-11-15', end: '2026-11-21' },
        { id: 'W4', name: 'Tuần 4', range: '22/11 - 28/11', start: '2026-11-22', end: '2026-11-28' },
        { id: 'W5', name: 'Tuần 5', range: '29/11 - 30/11', start: '2026-11-29', end: '2026-11-30' }
      ];
    } else {
      return [
        { id: 'ALL', name: 'Tất cả các mốc', range: 'Toàn thời gian', start: '', end: '' },
        { id: 'W1', name: 'Tuần 1', range: '01 - 07', start: '2026-10-01', end: '2026-10-07' },
        { id: 'W2', name: 'Tuần 2', range: '08 - 14', start: '2026-10-08', end: '2026-10-14' },
        { id: 'W3', name: 'Tuần 3', range: '15 - 21', start: '2026-10-15', end: '2026-10-21' },
        { id: 'W4', name: 'Tuần 4', range: '22 - 28', start: '2026-10-22', end: '2026-10-28' }
      ];
    }
  }, [currentMonth]);

  // Xử lý khi người dùng chọn tháng
  const handleMonthChange = (newMonth: string) => {
    if (onMonthChange) onMonthChange(newMonth);
    else setInternalMonth(newMonth);

    if (newMonth === '2026-09') {
      onStartDateChange('2026-09-01');
      onEndDateChange('2026-09-30');
      setActiveWeekId('ALL');
      if (onWeekChange) onWeekChange('ALL');
    } else if (newMonth === '2026-10') {
      onStartDateChange('2026-10-01');
      onEndDateChange('2026-10-31');
      setActiveWeekId('ALL');
      if (onWeekChange) onWeekChange('ALL');
    } else if (newMonth === '2026-11') {
      onStartDateChange('2026-11-01');
      onEndDateChange('2026-11-30');
      setActiveWeekId('ALL');
      if (onWeekChange) onWeekChange('ALL');
    } else if (newMonth === 'ALL') {
      onStartDateChange('');
      onEndDateChange('');
      setActiveWeekId('ALL');
      if (onWeekChange) onWeekChange('ALL');
    }
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
    // Nếu đang ở W1 -> sang W2 (12/10 - 18/10), nếu đang có startDate -> cộng 7 ngày
    if (startDate) {
      const dStart = new Date(startDate);
      dStart.setDate(dStart.getDate() + 7);
      const nextStartStr = dStart.toISOString().slice(0, 10);

      const dEnd = new Date(endDate || startDate);
      dEnd.setDate(dEnd.getDate() + 7);
      const nextEndStr = dEnd.toISOString().slice(0, 10);

      onStartDateChange(nextStartStr);
      onEndDateChange(nextEndStr);
      setActiveWeekId('NEXT_WEEK');
      if (onWeekChange) onWeekChange('NEXT_WEEK');
    } else {
      // Mặc định tuần sau tháng 10: 12/10 - 18/10
      onStartDateChange('2026-10-12');
      onEndDateChange('2026-10-18');
      setActiveWeekId('W2');
      if (onWeekChange) onWeekChange('W2');
    }
  };

  const handleThisWeek = () => {
    onStartDateChange('2026-10-05');
    onEndDateChange('2026-10-11');
    setActiveWeekId('W1');
    if (onWeekChange) onWeekChange('W1');
  };

  // Tính toán nhãn tuần hiển thị
  const computedActiveWeekLabel = useMemo(() => {
    if (activeWeekId === 'NEXT_WEEK') {
      return `Tuần sau (${startDate.slice(8, 10)}/${startDate.slice(5, 7)} - ${endDate.slice(8, 10)}/${endDate.slice(5, 7)})`;
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
          <span className="text-[10px] text-slate-400 font-semibold">Năm học 2026 - 2027</span>
        </div>
        <select
          value={currentMonth}
          onChange={e => handleMonthChange(e.target.value)}
          className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 ${colorStyles.border} focus:outline-none cursor-pointer shadow-2xs`}
        >
          <option value="2026-10">Tháng 10/2026 (Hiện tại)</option>
          <option value="2026-09">Tháng 09/2026</option>
          <option value="2026-11">Tháng 11/2026</option>
          <option value="2026-12">Tháng 12/2026</option>
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
              activeWeekId === 'W1'
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
              activeWeekId === 'W2' || activeWeekId === 'NEXT_WEEK'
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
