import {lessonPauseLabel} from '../lib/classPause';
import {InfoTitle} from './InfoTitle';
import React,{useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,CalendarDays} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {usePermissions} from '../hooks/usePermissions';
import {useBusinessValue} from '../lib/businessPersistence';
import type {WorkbenchRange,WorkbenchPeriod} from '../lib/workbenchTime';
import {workbenchComparison} from '../lib/workbenchComparison';
import {MetricComparison} from './MetricComparison';
import {workbenchData,type WorkbenchLesson} from '../lib/workbench';
import {PaginatedTableBody} from './Pagination';
import {SessionStatusChart} from './SessionStatusChart';
import {dashboardDisputes} from '../lib/dashboardNavigation';

export function WorkbenchOperations({range,period,section}:{range:WorkbenchRange;period:WorkbenchPeriod;section:'operations'|'tasks'}){
 const {classes,students,teachers,timeSlots,payrollStore,openDashboardDetail,incidents:incidentCategories}=useApp();
 const {canModule}=usePermissions();
 const [lessons]=useBusinessValue<WorkbenchLesson[]>('dated_lessons');
 const [incidents]=useBusinessValue<{status?:string;lessonId?:string;reportedAt?:string}[]>('lesson_incidents');
 const [now,setNow]=useState(()=>new Date());
 const [reviewOnly,setReviewOnly]=useState(false);
 const [teacherFilter,setTeacherFilter]=useState('');
 const tableRef=React.useRef<HTMLElement>(null);
 const showReview=()=>{setTeacherFilter('');setReviewOnly(true);tableRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
 const showTeacher=(id:string,review=false)=>{setTeacherFilter(id);setReviewOnly(review);tableRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),30_000);return()=>window.clearInterval(timer);},[]);
 const data=useMemo(()=>workbenchData(classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,range),[classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,range]);
 const comparison=workbenchComparison(range,period);
 const previous=useMemo(()=>workbenchData(classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,comparison.range),[classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,comparison.range.start,comparison.range.end]);
 const goLessons=(label:string,rows:typeof data.periodLessons)=>{if(canModule('PH5'))openDashboardDetail({module:5,tab:'diary',label,range:{...range},ids:rows.map(row=>row.lesson.id)});};
 const goQueue=(label:string)=>{
  if(label==='Giải trình chờ duyệt'&&canModule('PH7'))openDashboardDetail({module:7,tab:'disputes',label,range:{...range},ids:dashboardDisputes(payrollStore,range).filter(d=>d.status==='CHO_DUYET').map(d=>d.id)});
  if(label==='Lớp thiếu học liệu trong kỳ'&&canModule('PH4'))openDashboardDetail({module:4,tab:'materials',label,range:{...range},ids:data.missingMaterialClassIds});
  if(label==='Buổi còn thiếu nhận xét')goLessons(label,data.periodLessons.filter(({lesson:l,state})=>state!=='NGHI_HOC'&&l.checkoutAt&&l.feedbackProgress&&l.feedbackProgress.completed<l.feedbackProgress.total));
  if(label==='Sự cố chờ xử lý'&&canModule('PH5')){
   const ids=incidents.filter(i=>{const date=i.reportedAt?.slice(0,10)||lessons.find(l=>l.id===i.lessonId)?.date||'';return i.status==='DANG_XU_LY'&&date>=range.start&&date<=range.end;}).flatMap(i=>i.lessonId?[i.lessonId]:[]);
   openDashboardDetail({module:5,tab:'incidents',label,range:{...range},ids});
  }
 };
 const queues=[
  {label:'Sự cố chờ xử lý',count:data.pendingIncidents,module:5},
  {label:'Giải trình chờ duyệt',count:data.pendingDisputes,module:7},
  {label:'Lớp thiếu học liệu trong kỳ',count:data.missingMaterials,module:4},
  {label:'Buổi còn thiếu nhận xét',count:data.missingFeedback,module:5}
 ];
 const labels:Record<string,string>={DA_HOC:'Đã học',CHUA_HOC:'Chưa vào lớp',CHUA_HOAN_TAT:'Chưa hoàn tất',DANG_HOC:'Đang học',CHUA_DIEN_RA:'Sắp tới',NGHI_HOC:'Nghỉ học'};
 const visibleLessons=data.periodLessons.filter(row=>(!reviewOnly||Boolean(row.reviewReason))&&(!teacherFilter||(row.state!=='NGHI_HOC'&&(row.lesson.coverTeacherId||row.lesson.primaryTeacherId)===teacherFilter)));
 const dateLabel=(date:string)=>date.split('-').reverse().join('/');
 return <>
  {section==='operations' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="text-sm font-bold text-slate-900"><InfoTitle title="Điều hành ca dạy"><p>{dateLabel(range.start)} – {dateLabel(range.end)} · Theo dõi lịch học, tiến độ và phân bổ giáo viên.</p><p>Đối chiếu {dateLabel(comparison.range.start)} – {dateLabel(comparison.range.end)}; trạng thái ca ở cả hai kỳ tính theo dữ liệu hiện tại.</p></InfoTitle></h2></div>
   </div>
   <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
    {[{label:'Tổng ca trong kỳ',value:data.periodLessons.length,previous:previous.periodLessons.length},{label:'Đã học',value:data.periodLessons.filter(r=>r.state==='DA_HOC').length,previous:previous.periodLessons.filter(r=>r.state==='DA_HOC').length},{label:'Cần kiểm tra',value:data.periodLessons.filter(r=>r.reviewReason).length,previous:previous.periodLessons.filter(r=>r.reviewReason).length},{label:'Sắp tới / đang học',value:data.periodLessons.filter(r=>['CHUA_DIEN_RA','DANG_HOC'].includes(r.state)).length,previous:previous.periodLessons.filter(r=>['CHUA_DIEN_RA','DANG_HOC'].includes(r.state)).length}].map(item=>
     <button key={item.label} type="button" disabled={item.label!=='Cần kiểm tra'&&!canModule('PH5')} onClick={()=>item.label==='Cần kiểm tra'?showReview():goLessons(item.label,data.periodLessons.filter(row=>item.label==='Đã học'?row.state==='DA_HOC':item.label==='Sắp tới / đang học'?['CHUA_DIEN_RA','DANG_HOC'].includes(row.state):true))} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-orange-200 disabled:cursor-default"><span className="text-[11px] text-slate-600">{item.label}</span><strong className="mt-0.5 block text-xl text-orange-600">{item.value}</strong>{item.label!=='Sắp tới / đang học'&&<MetricComparison current={item.value} previous={item.previous} label={comparison.label}/>}</button>)}
   </div>
   
  </section>}
  {section==='tasks' && <section className="rounded-2xl border border-slate-200 bg-white p-4">
   <h2 className="text-sm font-bold text-slate-800"><InfoTitle title="Việc cần xử lý trong kỳ"><p>Theo trạng thái hiện tại của các bản ghi trong khoảng đã chọn. Giải trình lấy theo kỳ công tháng giao với khoảng này.</p></InfoTitle></h2>
   <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{queues.map(q=><button key={q.label} type="button" disabled={!canModule('PH'+q.module)} onClick={()=>goQueue(q.label)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-orange-50 disabled:cursor-default disabled:hover:bg-white"><span className="text-xs text-slate-600">{q.label}</span><span className="flex items-center gap-2"><strong className={q.count?'text-lg text-orange-600':'text-lg text-slate-400'}>{q.count}</strong>{canModule('PH'+q.module)&&<ArrowUpRight className="h-3.5 w-3.5 text-slate-400"/>}</span></button>)}</div>
  </section>}
  {section==='operations' && <div className="grid gap-4 lg:grid-cols-2">
   <SessionStatusChart days={data.days} onReview={showReview}/>
   <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-bold text-slate-800"><InfoTitle title="Giáo viên được phân công nhiều ca nhất"><p>Xếp từ nhiều xuống ít trong kỳ đã chọn, gồm ca đã học và sắp tới; bỏ ca nghỉ. Ca dạy thay tính cho người thay. Bấm tên để xem từng ca.</p><p>Đã học, dạy thay và cần kiểm tra là các thông tin của tổng ca; một ca dạy thay cũng có thể đã học hoặc cần kiểm tra, không cộng các cột với nhau. Đây không phải bảng công.</p></InfoTitle></h2>
    {data.workload.length?<div className="workspace-table-scroll mt-3 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-[11px]"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-2 py-2">STT</th><th className="px-2 py-2">Giáo viên</th><th className="px-2 py-2 text-right">Tổng ca</th><th className="px-2 py-2 text-right">Đã học</th><th className="px-2 py-2 text-right">Dạy thay</th><th className="px-2 py-2 text-right">Cần kiểm tra</th></tr></thead><PaginatedTableBody>{data.workload.map((t,index)=><tr key={t.id} className="border-t border-slate-100"><td className="px-2 py-3 text-slate-400">{index+1}</td><td className="px-2 py-3"><button type="button" onClick={()=>showTeacher(t.id)} className="text-left font-semibold text-indigo-700 hover:underline">{t.name}</button></td><td className="px-2 py-3 text-right font-bold text-slate-900">{t.count}</td><td className="px-2 py-3 text-right text-emerald-700">{t.completed}</td><td className="px-2 py-3 text-right text-slate-600">{t.cover}</td><td className="px-2 py-3 text-right">{t.review?<button type="button" onClick={()=>showTeacher(t.id,true)} className="rounded bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-100">{t.review}</button>:<span className="text-slate-400">0</span>}</td></tr>)}</PaginatedTableBody></table></div>:<p className="py-10 text-center text-xs text-slate-400">Chưa có giáo viên được phân công ca trong kỳ đã chọn.</p>}
   </section>
  </div>}
  {section==='operations' && <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
   <div className="flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-orange-500"/>{reviewOnly?'Ca cần kiểm tra':'Danh sách ca học trong kỳ'} · {visibleLessons.length} ca</h2><div className="flex gap-2 text-xs"><button type="button" aria-pressed={!reviewOnly} onClick={()=>setReviewOnly(false)} className={`rounded-lg border px-3 py-1.5 ${!reviewOnly?'border-orange-200 bg-orange-50 text-orange-700':'border-slate-200 text-slate-600'}`}>Tất cả</button><button type="button" aria-pressed={reviewOnly} onClick={()=>setReviewOnly(true)} className={`rounded-lg border px-3 py-1.5 ${reviewOnly?'border-rose-200 bg-rose-50 text-rose-700':'border-slate-200 text-slate-600'}`}>Cần kiểm tra</button></div></div>
   {teacherFilter&&<div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-700"><span>Giáo viên: {teachers.find(t=>t.id===teacherFilter)?.name||teacherFilter}</span><button type="button" onClick={()=>setTeacherFilter('')} className="font-semibold underline">Bỏ lọc giáo viên</button></div>}
   <div className="max-h-80 overflow-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="p-3">Ngày</th><th className="p-3">Giờ học</th><th className="p-3">Lớp</th><th className="p-3">Giáo viên</th><th className="p-3">Trạng thái</th></tr></thead>
    <PaginatedTableBody>{visibleLessons.map(row=><tr key={row.lesson.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{dateLabel(row.lesson.date)}</td><td className="p-3 whitespace-nowrap">{row.time}</td><td className="p-3">{row.className}</td><td className="p-3">{row.teacherName}{row.lesson.coverTeacherId&&<span className="ml-1 text-[10px] text-indigo-600">(Dạy thay)</span>}</td><td className={`p-3 font-semibold ${row.reviewReason?'text-rose-600':'text-slate-600'}`}>{lessonPauseLabel(row.lesson,incidentCategories)||labels[row.state]||row.state}{row.reviewReason&&<div className="mt-1 text-[11px] font-normal">{row.reviewReason}</div>}</td></tr>)}{!visibleLessons.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-400">{reviewOnly?'Không có ca cần kiểm tra trong kỳ đã chọn.':'Chưa có ca học trong kỳ đã chọn.'}</td></tr>}</PaginatedTableBody>
   </table></div>
  </section>}
 </>;
}
