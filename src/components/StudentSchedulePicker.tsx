import React from 'react';
import type { TimeSlotItem } from '../types';
const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const StudentSchedulePicker: React.FC<{ slots: TimeSlotItem[]; selected: string[]; onToggle: (day: string, range: string) => void; onRemove: (slot: string) => void; onClear: () => void }> = ({ slots, selected, onToggle, onRemove, onClear }) => <fieldset className="space-y-2">
  <div className="flex justify-between gap-2"><h4 className="font-semibold text-[#FF5C00]">Khung giờ học mong muốn</h4><button type="button" onClick={onClear} className="text-slate-500 hover:text-slate-800 text-[11px]">Bỏ chọn tất cả</button></div>
  <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[480px] text-xs"><thead className="bg-slate-50"><tr><th className="text-left px-3 py-2 font-medium">Ca học</th>{days.map(day => <th key={day} className="px-2 py-2 font-medium">{day}</th>)}</tr></thead><tbody>
    {slots.map(slot => <tr key={slot.id} className="border-t border-slate-100"><td className="px-3 py-2"><span className="block text-slate-700">{slot.name}</span><span className="text-[10px] text-slate-500">{slot.timeRange}</span></td>{days.map(day => <td key={day} className="text-center p-2"><input type="checkbox" aria-label={day + ' ' + slot.name + ' ' + slot.timeRange} checked={selected.includes(day + ' (' + slot.timeRange + ')')} onChange={() => onToggle(day, slot.timeRange)} className="w-4 h-4 accent-[#FF5C00] cursor-pointer" /></td>)}</tr>)}
    {!slots.length && <tr><td colSpan={8} className="p-3 text-slate-500">Chưa có ca học đang hoạt động trong danh mục.</td></tr>}
  </tbody></table></div>
  <div className="flex flex-wrap gap-1.5">{selected.map(slot => <button key={slot} type="button" onClick={() => onRemove(slot)} title="Bỏ ca này" className="px-2 py-1 rounded border border-orange-200 bg-orange-50 text-[10px] text-[#FF5C00]">{slot} ×</button>)}{!selected.length && <span className="text-slate-400 text-[11px]">Chưa chọn khung giờ.</span>}</div>
</fieldset>;
