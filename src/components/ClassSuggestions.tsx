import { recordSortTime } from '../lib/listOrder';
import { PaginatedList } from './Pagination';
import React, { useState } from 'react';
import { matchesSearch } from '../lib/textSearch';
import type { ClassItem } from '../types';
export const ClassSuggestions: React.FC<{ items: ClassItem[]; model: string; schedule: string[]; isChanging?: boolean; onAssign: (item: ClassItem) => void }> = ({ items, model, schedule, isChanging = false, onAssign }) => {
  const [query, setQuery] = useState('');
  const visible = items.filter(item => matchesSearch(query, item.name, item.code, item.teacherName, item.teacherId));
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
  <div className="flex justify-between gap-2"><h4 className="font-semibold text-emerald-800">{isChanging ? "Ghép lớp / Đổi lớp" : "Đề xuất ghép lớp"}</h4><span className="text-[11px] text-slate-500">{model} · {items.length} lớp còn chỗ</span></div>
  <input type="search" aria-label="Tìm lớp ghép theo tên, mã lớp hoặc giáo viên" placeholder="Tìm tên, mã lớp hoặc giáo viên..." value={query} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} onChange={event => setQuery(event.target.value)} className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500" />
  {!items.length ? <p className="text-xs text-slate-500">{isChanging ? "Chưa có lớp khác cùng môn, khối, trình độ và mô hình còn chỗ. Bạn có thể thay đổi tiêu chí học tập phía trên để tìm lớp phù hợp." : "Chưa có lớp cùng môn, khối, trình độ và mô hình còn chỗ. Có thể tạo lớp mới."}</p> : !visible.length ? <p role="status" className="text-xs text-slate-500">Không tìm thấy lớp phù hợp.</p> : <PaginatedList className="max-h-56 overflow-y-auto divide-y divide-slate-100">{visible.map(item => {
    const matches = Boolean(schedule.length && item.schedule && item.schedule.split(',').map(slot => slot.trim()).filter(Boolean).every(slot => schedule.includes(slot)));
    return <div key={item.id} className="flex items-center justify-between gap-3 py-2" data-sort-time={recordSortTime(item)}>
      <div className="min-w-0 space-y-0.5"><p className="text-xs text-slate-800"><span className="font-mono font-semibold text-[#FF5C00]">{item.code}</span> · {item.name}</p>
        <p className="text-[11px] text-slate-500">GV: {item.teacherName || 'Chưa phân công'} · Sĩ số {item.studentIds.length}/{item.maxStudents} · Còn {Math.max(0, item.maxStudents - item.studentIds.length)} chỗ</p>
        <p className="text-[11px] text-slate-500">{item.schedule || 'Chưa có lịch'} · {matches ? 'Khớp lịch đăng ký' : 'Cần đối chiếu lịch đăng ký'}</p>
      </div>
      <button type="button" onClick={() => onAssign(item)} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium">{isChanging ? "Chuyển lớp" : "Ghép lớp"}</button>
    </div>;
  })}</PaginatedList>}
</section>;
};
