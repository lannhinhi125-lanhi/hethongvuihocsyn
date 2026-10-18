import React,{useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {WorkbenchOperations} from '../components/WorkbenchOperations';
import {WorkbenchAnalytics} from '../components/WorkbenchAnalytics';
import {ReportDataStatus} from '../components/ReportDataStatus';
import {PeriodToolbar} from '../components/PeriodToolbar';
import {localDay} from '../lib/workbench';
import {workbenchRange} from '../lib/workbenchTime';
import {refreshBusinessData,useBusinessStatus} from '../lib/businessPersistence';
const sections=[{id:'operations',label:'Ca dạy',description:'Xem lịch học, trạng thái ca và phân bổ giáo viên.'},
 {id:'tasks',label:'Việc cần xử lý',description:'Theo dõi sự cố, giải trình, học liệu và nhận xét còn thiếu.'},
 {id:'enrollment',label:'Học sinh & lớp học',description:'Xem tổng học sinh, lớp học hiện tại và số hồ sơ mới trong kỳ.'},
 {id:'quality',label:'Chất lượng đào tạo',description:'Đánh giá tình hình sự cố và kết quả dự giờ đã duyệt.'}] as const;
export function Workbench(){
 const {loadedAt}=useBusinessStatus();
 const [section,setSection]=useState<typeof sections[number]['id']>('operations');
 const [range,setRange]=useState(()=>workbenchRange(localDay(new Date()),'week'));
 const selected=sections.find(s=>s.id===section)!;
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void refreshBusinessData();};refresh();const timer=window.setInterval(refresh,30_000);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};},[section]);
 return <div className="space-y-4">
  <header className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-lg font-bold text-slate-900">Bàn làm việc</h1><p className="mt-1 text-xs text-slate-500">{selected.description}</p></div><button type="button" onClick={()=>void refreshBusinessData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"><RefreshCw className="h-3.5 w-3.5"/>Làm mới</button></div>
   <PeriodToolbar range={range} onChange={setRange} allowAll={false} initialPeriod="week"/>
   <nav aria-label="Nhóm nghiệp vụ Bàn làm việc" className="mt-3 flex flex-wrap gap-2">{sections.map(s=><button key={s.id} type="button" aria-pressed={section===s.id} onClick={()=>setSection(s.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${section===s.id?'bg-orange-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s.label}</button>)}</nav>
  </header>
  <ReportDataStatus/>
  {loadedAt&&(section==='operations'||section==='tasks'?<WorkbenchOperations range={range} section={section}/>:<WorkbenchAnalytics range={range} section={section}/>)}
 </div>;
}
