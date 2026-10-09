import React, { useState } from 'react';
import { ColumnFilter } from './ColumnFilter';
export type FilterOption = { value: string; label: string };
type Props = { label: string; values: string[]; options: FilterOption[]; onChange: (values: string[]) => void };
export const CheckboxFilterOptions: React.FC<Props> = ({ label, values, options, onChange }) => {
  const [search, setSearch] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const visible = options.filter(option => normalize(option.label).includes(normalize(search)));
  return <div className="space-y-2">
    <input aria-label={'Tìm lựa chọn ' + label} placeholder="Tìm lựa chọn..." value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-normal" />
    <div className="flex justify-between text-[11px]"><span>{values.length ? values.length + ' đã chọn' : 'Tất cả'}</span><button type="button" className="text-[#FF5C00]" onClick={() => onChange(Array.from(new Set([...values, ...visible.map(option => option.value)])))}>Chọn tất cả kết quả</button></div>
    <div className="max-h-44 overflow-y-auto space-y-1">{visible.map(option => <label key={option.value} className="flex items-center gap-2 rounded px-1 py-1.5 hover:bg-orange-50 cursor-pointer font-normal normal-case"><input type="checkbox" className="accent-[#FF5C00]" checked={values.includes(option.value)} onChange={event => onChange(event.target.checked ? [...values, option.value] : values.filter(value => value !== option.value))} /><span>{option.label}</span></label>)}{!visible.length && <p className="text-slate-400">Không có lựa chọn phù hợp.</p>}</div>
  </div>;
};
export const MultiSelectColumnFilter: React.FC<Props> = props => <ColumnFilter label={props.label} active={props.values.length > 0} onReset={() => props.onChange([])}><CheckboxFilterOptions {...props} /></ColumnFilter>;
