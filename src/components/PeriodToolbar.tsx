import { VietnameseDatePicker } from './VietnameseDatePicker';
import { ReportSelect } from './ReportSelect';
import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import {workbenchRange,shiftWorkbenchRange,type WorkbenchRange,type WorkbenchPeriod} from '../lib/workbenchTime';
import {reportToday,validReportDate} from '../lib/customReports';

type Period=WorkbenchPeriod|'all'|'next30';
const nextThirtyDays=()=>{const start=reportToday(),end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);return {start,end:end.toISOString().slice(0,10)};};
export function PeriodToolbar({range,onChange,allowAll=true,allowUpcoming=false,initialPeriod,onRefresh,onPeriodChange,disabled=false,label='Thời gian'}:{
 range:WorkbenchRange;onChange:(range:WorkbenchRange)=>void;allowAll?:boolean;allowUpcoming?:boolean;initialPeriod?:Period;onRefresh?:()=>void;onPeriodChange?:(period:Period)=>void;disabled?:boolean;label?:string;
}){
 const [period,setPeriod]=useState<Period>(initialPeriod||(allowUpcoming&&range.start===nextThirtyDays().start&&range.end===nextThirtyDays().end?'next30':!range.start&&!range.end?'all':'custom'));
 const [draft,setDraft]=useState<WorkbenchRange>(range);
 useEffect(()=>{onPeriodChange?.(period);},[period]);
 useEffect(()=>{
  setDraft({...range});
  if(!range.start&&!range.end){setPeriod('all');return;}
  if(allowUpcoming&&range.start===nextThirtyDays().start&&range.end===nextThirtyDays().end){setPeriod('next30');return;}
  if(!allowUpcoming&&period==='next30'){setPeriod('custom');return;}
  if(period==='all'){setPeriod('custom');return;}
  if(period!=='custom'&&range.start){const expected=period==='next30'?nextThirtyDays():workbenchRange(range.start,period);if(expected.start!==range.start||expected.end!==range.end)setPeriod('custom');}
 },[range.start,range.end,allowUpcoming]);
 const changePeriod=(value:Period)=>{setPeriod(value);if(value==='all')onChange({start:'',end:''});else if(value==='next30')onChange(nextThirtyDays());else if(value!=='custom')onChange(workbenchRange(range.start||reportToday(),value));else setDraft(range.start&&range.end?{...range}:workbenchRange(reportToday(),'week'));};
 const shown=period==='custom'?draft:range;
 const valid=validReportDate(draft.start)&&validReportDate(draft.end)&&draft.start<=draft.end;
 const shift=(direction:-1|1)=>{if(period!=='all'&&shown.start&&shown.end){const next=shiftWorkbenchRange(shown,period==='next30'?'custom':period,direction);if(period==='custom')setDraft(next);else {if(period==='next30')setPeriod('custom');onChange(next);}}};
 const input='h-8 rounded-lg border border-slate-200 bg-white px-2 disabled:opacity-40';
 return <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-[11px]">
  <span className="px-1 font-semibold text-slate-600">{label}</span>
  <ReportSelect aria-label={`${label}: kỳ xem`} value={period} disabled={disabled} onChange={e=>changePeriod(e.target.value as Period)} className={input}>
   <option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option>{allowUpcoming&&<option value="next30">30 ngày tới</option>}<option value="custom">Tùy chọn</option>{allowAll&&<option value="all">Toàn bộ</option>}
  </ReportSelect>
  <button type="button" aria-label={`${label}: kỳ trước`} disabled={disabled||period==='all'||!shown.start||!shown.end} onClick={()=>shift(-1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
  <VietnameseDatePicker aria-label={`${label}: từ ngày`} value={shown.start} disabled={disabled||period==='all'} confirmSelection={period==='custom'} onChange={e=>{const value=e.target.value;if(!value)return;if(period==='day'||period==='week'||period==='month')onChange(workbenchRange(value,period));else {setPeriod('custom');setDraft(previous=>({start:value,end:previous.end&&previous.end>=value?previous.end:value}));}}} className={input}/>
  <span className="text-slate-400">–</span>
  <VietnameseDatePicker aria-label={`${label}: đến ngày`} value={shown.end} disabled={disabled||period==='all'} confirmSelection={period==='custom'} min={shown.start||undefined} onChange={e=>{const value=e.target.value;if(!value)return;setPeriod('custom');setDraft({start:shown.start&&shown.start<=value?shown.start:value,end:value});}} className={input}/>
  <button type="button" aria-label={`${label}: kỳ sau`} disabled={disabled||period==='all'||!shown.start||!shown.end} onClick={()=>shift(1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
  {period==='custom'&&<><button type="button" aria-label={`${label}: lưu khoảng ngày`} disabled={disabled||!valid} onClick={()=>onChange({...draft})} className="h-8 rounded-lg bg-orange-600 px-3 font-semibold text-white disabled:opacity-40">Lưu</button><button type="button" disabled={disabled} onClick={()=>{setDraft({...range});if(!range.start&&!range.end)setPeriod('all');}} className={input}>Hủy</button></>}
  <button type="button" disabled={disabled} onClick={()=>{if(period==='next30'){changePeriod('next30');return;}const value=period==='all'||period==='custom'?'week':period;setPeriod(value);onChange(workbenchRange(reportToday(),value));}} className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-2.5 font-semibold text-orange-700 disabled:opacity-40">Hiện tại</button>
  {onRefresh&&<button type="button" onClick={onRefresh} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600"><RefreshCw className="h-3.5 w-3.5"/>Làm mới</button>}
 </div>;
}
