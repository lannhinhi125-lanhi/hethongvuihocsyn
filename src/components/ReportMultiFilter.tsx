import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { reportFilterValues, type ReportChoice, type ReportFilterValue } from '../lib/customReports';

export function ReportMultiFilter({ label, choices, value, onChange }: {
  label: string; choices: ReportChoice[]; value?: ReportFilterValue; onChange: (value: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const selected = reportFilterValues(value);
  const allChoices: ReportChoice[] = [...choices, ...selected.filter(key => !choices.some(item => item.value === key)).map(key => ({ value: key, label: key + ' (không còn trong danh mục)' }))];
  const visible = allChoices.filter(item => (item.label + ' ' + (item.group || '')).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <details name="report-catalog-filter" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }} className="report-multi-filter group relative mt-1 text-xs text-slate-700">
    <summary aria-label={'Lọc ' + label.toLocaleLowerCase('vi')} className={'flex cursor-pointer list-none items-center gap-2 rounded-xl border bg-white px-3 py-2.5 font-medium shadow-xs transition-colors hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 [&::-webkit-details-marker]:hidden ' + (selected.length ? 'border-orange-200 text-orange-700' : 'border-slate-200 text-slate-700')}>
      <span className="min-w-0 flex-1 truncate">{selected.length ? allChoices.filter(item => selected.includes(item.value)).map(item => item.label).join(', ') : 'Tất cả'}</span>
      {selected.length > 0 && <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">{selected.length}</span>}
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    <div className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[80vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10">
      <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input aria-label={'Tìm ' + label.toLocaleLowerCase('vi')} value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm trong danh mục…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" /></div>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2"><button type="button" className="rounded-md px-1 py-1 font-medium text-orange-600 hover:bg-orange-50" onClick={() => onChange([...new Set([...selected, ...visible.map(item => item.value)])])}>Chọn mục đang hiện</button><button type="button" className="rounded-md px-1 py-1 text-slate-500 hover:bg-slate-100" onClick={() => onChange([])}>Bỏ chọn tất cả</button></div>
      <div className="max-h-60 space-y-1 overflow-y-auto">{visible.map(item => <label key={item.value} className={'flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors ' + (selected.includes(item.value) ? 'bg-orange-50 text-orange-800' : 'hover:bg-slate-50')}>
        <input className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-600" style={{ marginLeft: (item.depth || 0) * 12 }} type="checkbox" checked={selected.includes(item.value)} onChange={event => onChange(event.target.checked ? [...selected, item.value] : selected.filter(key => key !== item.value))} />
        <span className="min-w-0 leading-5">{item.label}{item.group && <small className="block text-[10px] text-slate-400">{item.group}</small>}</span>
      </label>)}{!visible.length && <p className="py-3 text-slate-400">Không có mục phù hợp.</p>}</div>
      <p className="mt-2 border-t border-slate-100 pt-2 text-slate-400">Không tick mục nào: xem tất cả.</p>
    </div>
  </details>;
}
