import React,{useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import {WorkbenchOperations} from '../components/WorkbenchOperations';
import {WorkbenchAnalytics} from '../components/WorkbenchAnalytics';
import {ReportDataStatus} from '../components/ReportDataStatus';
import {localDay} from '../lib/workbench';
import {workbenchRange,shiftWorkbenchRange,type WorkbenchPeriod} from '../lib/workbenchTime';
import {refreshBusinessData,useBusinessStatus} from '../lib/businessPersistence';
const sections=[{id:'operations',label:'Ca dạy',description:'Xem lịch học, trạng thái ca và phân bổ giáo viên.'},
 {id:'tasks',label:'Việc cần xử lý',description:'Theo dõi sự cố, giải trình, học liệu và nhận xét còn thiếu.'},
 {id:'enrollment',label:'Học sinh & lớp học',description:'Xem tổng học sinh, lớp học hiện tại và số hồ sơ mới trong kỳ.'},
 {id:'quality',label:'Chất lượng đào tạo',description:'Đánh giá tình hình sự cố và kết quả dự giờ đã duyệt.'}] as const;
export function Workbench(){
 const {loadedAt}=useBusinessStatus();
 const [section,setSection]=useState<typeof sections[number]['id']>('operations');
 const [period,setPeriod]=useState<WorkbenchPeriod>('week');
 const [range,setRange]=useState(()=>workbenchRange(localDay(new Date()),'week'));
 const selected=sections.find(s=>s.id===section)!;
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void refreshBusinessData();};refresh();const timer=window.setInterval(refresh,30_000);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};},[section]);
 return <div className="space-y-4">
  <header className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-lg font-bold text-slate-900">Bàn làm việc</h1><p className="mt-1 text-xs text-slate-500">{selected.description}</p></div><button type="button" onClick={()=>void refreshBusinessData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"><RefreshCw className="h-3.5 w-3.5"/>Làm mới</button></div>
   <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-[11px]">
    <span className="px-1 font-semibold text-slate-600">Thời gian</span><select aria-label="Kỳ xem Bàn làm việc" value={period} onChange={e=>{const value=e.target.value as WorkbenchPeriod;setPeriod(value);if(value!=='custom')setRange(workbenchRange(range.start,value));}} className="h-8 rounded-lg border border-slate-200 bg-white px-2"><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option><option value="custom">Tùy chọn</option></select>
    <button type="button" aria-label="Kỳ trước" onClick={()=>setRange(r=>shiftWorkbenchRange(r,period,-1))} className="rounded-lg border border-slate-200 bg-white p-1.5"><ChevronLeft className="h-4 w-4"/></button>
    <input type="date" aria-label="Từ ngày Bàn làm việc" value={range.start} max={period==='custom'?range.end:undefined} onChange={e=>{if(!e.target.value)return;if(period==='custom')setRange(r=>({start:e.target.value,end:e.target.value>r.end?e.target.value:r.end}));else setRange(workbenchRange(e.target.value,period));}} className="h-8 rounded-lg border border-slate-200 bg-white px-2"/>
    <span className="text-slate-400">–</span><input type="date" aria-label="Đến ngày Bàn làm việc" value={range.end} min={range.start} onChange={e=>{if(!e.target.value)return;setPeriod('custom');setRange(r=>({start:e.target.value<r.start?e.target.value:r.start,end:e.target.value}));}} className="h-8 rounded-lg border border-slate-200 bg-white px-2"/>
    <button type="button" aria-label="Kỳ sau" onClick={()=>setRange(r=>shiftWorkbenchRange(r,period,1))} className="rounded-lg border border-slate-200 bg-white p-1.5"><ChevronRight className="h-4 w-4"/></button>
    <button type="button" onClick={()=>{const p=period==='custom'?'week':period;setPeriod(p);setRange(workbenchRange(localDay(new Date()),p));}} className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-2.5 font-semibold text-orange-700">Hiện tại</button>
   </div>
   <nav aria-label="Nhóm nghiệp vụ Bàn làm việc" className="mt-3 flex flex-wrap gap-2">{sections.map(s=><button key={s.id} type="button" aria-pressed={section===s.id} onClick={()=>setSection(s.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${section===s.id?'bg-orange-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s.label}</button>)}</nav>
  </header>
  <ReportDataStatus/>
  {loadedAt&&(section==='operations'||section==='tasks'?<WorkbenchOperations range={range} section={section}/>:<WorkbenchAnalytics range={range} section={section}/>)}
 </div>;
}
