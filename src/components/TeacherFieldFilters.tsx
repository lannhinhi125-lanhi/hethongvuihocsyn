import React from 'react';
import type { TeacherProfile } from '../types';
import type { CategoryGroup } from './CategoryMultiFilter';
export const emptyTeacherFields = { id: '', name: '', phone: '', email: '', minFree: '', maxFree: '', minBusy: '', maxBusy: '' };
export type TeacherFields = typeof emptyTeacherFields;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
export function matchesTeacherFields(teacher: TeacherProfile, fields: TeacherFields): boolean {
  const textMatches = (['id', 'name', 'phone', 'email'] as const).every(key => !fields[key].trim() || normalize(teacher[key] || '').includes(normalize(fields[key])));
  const inRange = (count: number, min: string, max: string) => (!min || count >= Number(min)) && (!max || count <= Number(max));
  return textMatches && inRange(teacher.freeSlots, fields.minFree, fields.maxFree) && inRange(teacher.busySlots, fields.minBusy, fields.maxBusy);
}
export const TeacherFieldInputs: React.FC<{ prefix: string; value: TeacherFields; onChange: (value: TeacherFields) => void; showCounts?: boolean }> = ({ prefix, value, onChange, showCounts = false }) => <>
  {(['id', 'name', 'phone', 'email'] as const).map(key => <label key={key} className="block font-bold text-slate-700">{{id: 'Mã giáo viên', name: 'Họ và tên', phone: 'Số điện thoại', email: 'Email'}[key]}
    <input id={prefix + '-' + key} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} placeholder="Nhập giá trị cần lọc..." className="block w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 font-normal" />
  </label>)}
  {showCounts && (['Free', 'Busy'] as const).map(kind => <fieldset key={kind} id={prefix + '-' + kind.toLowerCase()} tabIndex={-1} className="space-y-2">
    <legend className="font-bold text-slate-700">{kind === 'Free' ? 'Số ca đăng ký rảnh' : 'Số ca đã xếp lớp'}</legend>
    <div className="grid grid-cols-2 gap-2">{(['min', 'max'] as const).map(bound => { const key = (bound + kind) as keyof TeacherFields; return <label key={bound} className="text-slate-500">{bound === 'min' ? 'Tối thiểu' : 'Tối đa'}<input aria-label={(kind === 'Free' ? 'Ca rảnh ' : 'Ca đã xếp lớp ') + (bound === 'min' ? 'tối thiểu' : 'tối đa')} type="number" min="0" step="1" value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} className="block w-full mt-1 p-2 rounded-xl border border-slate-200 text-slate-800" /></label>; })}</div>
  </fieldset>)}
</>;
export const TeacherCategoryFields: React.FC<{ prefix: string; categories: CategoryGroup[]; category: string; grades: string[]; onCategory: (value: string) => void; onGrades: (value: string[]) => void }> = ({ prefix, categories, category, grades, onCategory, onGrades }) => {
  const options = Array.from(new Map(categories.filter(item => category === 'ALL' || item.id === category).flatMap(item => item.options).map(option => [option.id, option])).values());
  return <>
    <label className="block font-bold text-slate-700">Cấp học / Danh mục
      <select id={prefix + '-level'} value={category} onChange={e => { onCategory(e.target.value); onGrades([]); }} className="block w-full mt-1 p-2 rounded-xl border border-slate-200">
        <option value="ALL">Tất cả cấp học</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <details id={prefix + '-grades'} tabIndex={-1} className="border border-slate-200 rounded-xl p-3">
      <summary className="font-bold text-slate-700 cursor-pointer">Khối / Lớp dạy ({grades.length ? grades.length + ' đã chọn' : 'Tất cả'})</summary>
      <div className="flex justify-between mt-3 mb-2"><button type="button" onClick={() => onGrades(options.map(option => option.id))} className="text-orange-600">Chọn tất cả</button><button type="button" onClick={() => onGrades([])}>Bỏ chọn</button></div>
      <div className="max-h-48 overflow-y-auto space-y-1">{options.map(option => <label key={option.id} className="flex items-center gap-2 p-1.5"><input type="checkbox" checked={grades.includes(option.id)} onChange={() => onGrades(grades.includes(option.id) ? grades.filter(id => id !== option.id) : [...grades, option.id])} className="accent-orange-600" />{option.label}</label>)}</div>
    </details>
  </>;
};
