import type {DashboardSelection} from '../lib/dashboardNavigation';

export function DashboardFilterNotice({selection,onClear}:{selection:DashboardSelection|null;onClear:()=>void}) {
 if(!selection)return null;
 const date=(value:string)=>value.split('-').reverse().join('/');
 return <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-800">
  <span>Từ Bàn làm việc: <strong>{selection.label}</strong>{selection.range&&` · ${date(selection.range.start)} – ${date(selection.range.end)}`}</span>
  <button type="button" onClick={onClear} className="font-semibold underline">Bỏ lọc từ Bàn làm việc</button>
 </div>;
}
