import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import {workbenchRange,shiftWorkbenchRange,type WorkbenchRange,type WorkbenchPeriod} from '../lib/workbenchTime';
import {reportToday} from '../lib/customReports';

type Period=WorkbenchPeriod|'all';
export function PeriodToolbar({range,onChange,allowAll=true,initialPeriod,onRefresh,disabled=false,label='Thời gian'}:{
 range:WorkbenchRange;onChange:(range:WorkbenchRange)=>void;allowAll?:boolean;initialPeriod?:Period;onRefresh?:()=>void;disabled?:boolean;label?:string;
}){
 const [period,setPeriod]=useState<Period>(initialPeriod||(!range.start&&!range.end?'all':'custom'));
 useEffect(()=>{
  if(!range.start&&!range.end){setPeriod('all');return;}
  if(period==='all'){setPeriod('custom');return;}
  if(period!=='custom'&&range.start){const expected=workbenchRange(range.start,period);if(expected.start!==range.start||expected.end!==range.end)setPeriod('custom');}
 },[range.start,range.end]);
 const changePeriod=(value:Period)=>{setPeriod(value);if(value==='all')onChange({start:'',end:''});else if(value!=='custom')onChange(workbenchRange(range.start||reportToday(),value));else if(!range.start||!range.end)onChange(workbenchRange(reportToday(),'week'));};
 const shift=(direction:-1|1)=>{if(period!=='all'&&range.start&&range.end)onChange(shiftWorkbenchRange(range,period,direction));};
 const input='h-8 rounded-lg border border-slate-200 bg-white px-2 disabled:opacity-40';
 return <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-[11px]">
  <span className="px-1 font-semibold text-slate-600">{label}</span>
  <select aria-label={`${label}: kỳ xem`} value={period} disabled={disabled} onChange={e=>changePeriod(e.target.value as Period)} className={input}>
   <option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option><option value="custom">Tùy chọn</option>{allowAll&&<option value="all">Toàn bộ</option>}
  </select>
  <button type="button" aria-label={`${label}: kỳ trước`} disabled={disabled||period==='all'||!range.start||!range.end} onClick={()=>shift(-1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
  <input type="date" aria-label={`${label}: từ ngày`} value={range.start} disabled={disabled||period==='all'} max={period==='custom'?range.end||undefined:undefined} onChange={e=>{const value=e.target.value;if(!value)return;if(period==='day'||period==='week'||period==='month')onChange(workbenchRange(value,period));else onChange({start:value,end:range.end&&range.end>=value?range.end:value});}} className={input}/>
  <span className="text-slate-400">–</span>
  <input type="date" aria-label={`${label}: đến ngày`} value={range.end} disabled={disabled||period==='all'} min={range.start||undefined} onChange={e=>{const value=e.target.value;if(!value)return;setPeriod('custom');onChange({start:range.start&&range.start<=value?range.start:value,end:value});}} className={input}/>
  <button type="button" aria-label={`${label}: kỳ sau`} disabled={disabled||period==='all'||!range.start||!range.end} onClick={()=>shift(1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
  <button type="button" disabled={disabled} onClick={()=>{const value=period==='all'||period==='custom'?'week':period;setPeriod(value);onChange(workbenchRange(reportToday(),value));}} className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-2.5 font-semibold text-orange-700 disabled:opacity-40">Hiện tại</button>
  {onRefresh&&<button type="button" onClick={onRefresh} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600"><RefreshCw className="h-3.5 w-3.5"/>Làm mới</button>}
 </div>;
}
