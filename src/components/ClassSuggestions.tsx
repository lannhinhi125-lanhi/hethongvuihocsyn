import React from 'react';
import type { ClassItem } from '../types';
export const ClassSuggestions: React.FC<{ items: ClassItem[]; model: string; schedule: string[]; isChanging?: boolean; onAssign: (item: ClassItem) => void }> = ({ items, model, schedule, isChanging = false, onAssign }) => <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
  <div className="flex justify-between gap-2"><h4 className="font-semibold text-emerald-800">{isChanging ? "Ghép lớp / Đổi lớp" : "Đề xuất ghép lớp"}</h4><span className="text-[11px] text-slate-500">{model} · {items.length} lớp còn chỗ</span></div>
  {!items.length ? <p className="text-xs text-slate-500">{isChanging ? "Chưa có lớp khác cùng môn, khối, trình độ và mô hình còn chỗ. Bạn có thể thay đổi tiêu chí học tập phía trên để tìm lớp phù hợp." : "Chưa có lớp cùng môn, khối, trình độ và mô hình còn chỗ. Có thể tạo lớp mới."}</p> : <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">{items.map(item => {
    const matches = Boolean(schedule.length && item.schedule && item.schedule.split(',').map(slot => slot.trim()).filter(Boolean).every(slot => schedule.includes(slot)));
    return <div key={item.id} className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 space-y-0.5"><p className="text-xs text-slate-800"><span className="font-mono font-semibold text-[#FF5C00]">{item.code}</span> · {item.name}</p>
        <p className="text-[11px] text-slate-500">GV: {item.teacherName || 'Chưa phân công'} · Sĩ số {item.studentIds.length}/{item.maxStudents} · Còn {Math.max(0, item.maxStudents - item.studentIds.length)} chỗ</p>
        <p className="text-[11px] text-slate-500">{item.schedule || 'Chưa có lịch'} · {matches ? 'Khớp lịch đăng ký' : 'Cần đối chiếu lịch đăng ký'}</p>
      </div>
      <button type="button" onClick={() => onAssign(item)} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium">{isChanging ? "Chuyển lớp" : "Ghép lớp"}</button>
    </div>;
  })}</div>}
</section>;
