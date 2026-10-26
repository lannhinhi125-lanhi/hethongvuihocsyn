import { ReportSelect } from './ReportSelect';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {workbenchRange,shiftWorkbenchRange,type WorkbenchRange} from '../lib/workbenchTime';
import {reportToday} from '../lib/customReports';
import {VietnameseDatePicker} from './VietnameseDatePicker';

type MonitoringPeriod='day'|'week'|'month'|'custom';
export function MonitoringPeriodToolbar({range,period,onChange}:{range:WorkbenchRange;period:MonitoringPeriod;onChange:(range:WorkbenchRange,period:MonitoringPeriod)=>void}){
 const date=(value:string)=>value.split('-').reverse().join('/');
 const button='flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 hover:bg-slate-50';
 return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
  <button type="button" aria-label={period==='day'?'Ngày trước':period==='week'?'Tuần trước':'Tháng trước'} onClick={()=>onChange(shiftWorkbenchRange(range,period,-1),period)} className={button}><ChevronLeft className="h-4 w-4"/></button>
  <ReportSelect aria-label="Chế độ thời gian giám sát" value={period} onChange={e=>{const value=e.target.value as MonitoringPeriod;onChange(value==='custom'?range:workbenchRange(range.start,value),value);}} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-slate-700"><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option><option value="custom">Tùy chọn</option></ReportSelect>
  <label className="flex flex-wrap items-center gap-2 font-semibold text-slate-700"><VietnameseDatePicker aria-label="Chọn ngày giám sát" value={range.start} onChange={e=>{if(e.target.value)onChange(period==='custom'?{start:e.target.value,end:e.target.value>range.end?e.target.value:range.end}:workbenchRange(e.target.value,period),period);}} className="h-8 rounded-lg border border-slate-200 bg-white px-2"/>{period!=='day'&&period!=='custom'&&<span>– {date(range.end)}</span>}{period==='custom'&&<VietnameseDatePicker aria-label="Ngày kết thúc giám sát" value={range.end} onChange={e=>{if(e.target.value)onChange({start:e.target.value<range.start?e.target.value:range.start,end:e.target.value},period);}} className="h-8 rounded-lg border border-slate-200 bg-white px-2"/>}</label>
  <button type="button" aria-label={period==='day'?'Ngày sau':period==='week'?'Tuần sau':'Tháng sau'} onClick={()=>onChange(shiftWorkbenchRange(range,period,1),period)} className={button}><ChevronRight className="h-4 w-4"/></button>
  <button type="button" onClick={()=>onChange(workbenchRange(reportToday(),'day'),'day')} className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-3 font-semibold text-orange-700 hover:bg-orange-100">Hôm nay</button>
 </div>;
}
