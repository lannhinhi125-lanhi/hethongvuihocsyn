import React,{useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,CalendarDays} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {usePermissions} from '../hooks/usePermissions';
import {useBusinessValue} from '../lib/businessPersistence';
import type {WorkbenchRange} from '../lib/workbenchTime';
import {workbenchData,type WorkbenchLesson} from '../lib/workbench';
import {PaginatedList,PaginatedTableBody} from './Pagination';

export function WorkbenchOperations({range,section}:{range:WorkbenchRange;section:'operations'|'tasks'}){
 const {classes,students,teachers,timeSlots,payrollStore,setActiveModule}=useApp();
 const {canModule}=usePermissions();
 const [lessons]=useBusinessValue<WorkbenchLesson[]>('dated_lessons');
 const [incidents]=useBusinessValue<{status?:string;lessonId?:string;reportedAt?:string}[]>('lesson_incidents');
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),30_000);return()=>window.clearInterval(timer);},[]);
 const data=useMemo(()=>workbenchData(classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,range),[classes,students,teachers,lessons,incidents,payrollStore,timeSlots,now,range]);
 const go=(id:number)=>{if(canModule('PH'+id))setActiveModule(id);};
 const queues=[
  {label:'Sự cố chờ xử lý',count:data.pendingIncidents,module:5},
  {label:'Giải trình chờ duyệt',count:data.pendingDisputes,module:7},
  {label:'Lớp thiếu học liệu trong kỳ',count:data.missingMaterials,module:4},
  {label:'Buổi còn thiếu nhận xét',count:data.missingFeedback,module:5}
 ];
 const legend=[{key:'done',label:'Đã học',color:'bg-emerald-500'},{key:'warning',label:'Cần kiểm tra',color:'bg-rose-500'},
  {key:'upcoming',label:'Sắp tới / đang học',color:'bg-indigo-400'},{key:'cancelled',label:'Nghỉ',color:'bg-amber-400'}] as const;
 const maxDay=Math.max(1,...data.days.map(d=>d.total));
 const maxLoad=Math.max(1,...data.workload.map(t=>t.count));
 const labels:Record<string,string>={DA_HOC:'Đã học',CHUA_HOC:'Chưa vào lớp',CHUA_HOAN_TAT:'Chưa hoàn tất',DANG_HOC:'Đang học',CHUA_DIEN_RA:'Sắp tới',NGHI_HOC:'Nghỉ học'};
 const dateLabel=(date:string)=>date.split('-').reverse().join('/');
 return <>
  {section==='operations' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="text-sm font-bold text-slate-900">Điều hành ca dạy</h2>
     <p className="mt-1 text-xs text-slate-500">{dateLabel(range.start)} – {dateLabel(range.end)} · Theo dõi lịch học, tiến độ và phân bổ giáo viên.</p></div>
   </div>
   <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[{label:'Tổng ca trong kỳ',value:data.periodLessons.length},{label:'Đã học',value:data.periodLessons.filter(r=>r.state==='DA_HOC').length},{label:'Cần kiểm tra',value:data.periodLessons.filter(r=>['CHUA_HOC','CHUA_HOAN_TAT'].includes(r.state)).length},{label:'Sắp tới / đang học',value:data.periodLessons.filter(r=>['CHUA_DIEN_RA','DANG_HOC'].includes(r.state)).length}].map(item=>
     <button key={item.label} type="button" disabled={!canModule('PH5')} onClick={()=>go(5)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-orange-200 disabled:cursor-default"><span className="text-[11px] text-slate-600">{item.label}</span><strong className="mt-1 block text-2xl text-slate-900">{item.value}</strong></button>)}
   </div>
  </section>}
  {section==='tasks' && <section className="rounded-2xl border border-slate-200 bg-white p-4">
   <h2 className="text-sm font-bold text-slate-800">Việc cần xử lý trong kỳ</h2>
   <p className="mt-1 text-xs text-slate-500">Theo trạng thái hiện tại của các bản ghi trong khoảng đã chọn. Giải trình lấy theo kỳ công tháng giao với khoảng này.</p>
   <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{queues.map(q=><button key={q.label} type="button" disabled={!canModule('PH'+q.module)} onClick={()=>go(q.module)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-orange-50 disabled:cursor-default disabled:hover:bg-white"><span className="text-xs text-slate-600">{q.label}</span><span className="flex items-center gap-2"><strong className={q.count?'text-lg text-orange-600':'text-lg text-slate-400'}>{q.count}</strong>{canModule('PH'+q.module)&&<ArrowUpRight className="h-3.5 w-3.5 text-slate-400"/>}</span></button>)}</div>
  </section>}
  {section==='operations' && <div className="grid gap-4 lg:grid-cols-2">
   <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-bold text-slate-800">Trạng thái ca học theo thời gian</h2><p className="mt-1 text-[11px] text-slate-500">{dateLabel(data.weekStart)} – {dateLabel(data.weekEnd)}</p>
    <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label="Biểu đồ cột chồng trạng thái ca học theo ngày">{data.days.map(day=><div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${day.label}: ${day.total} ca, ${day.done} đã học, ${day.warning} cần kiểm tra, ${day.upcoming} sắp tới hoặc đang học, ${day.cancelled} nghỉ`}>
     <span className="text-[10px] font-semibold text-slate-600">{day.total}</span><div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md bg-slate-100" style={{height:Math.max(2,day.total/maxDay*135)}}>{legend.map(l=><div key={l.key} className={l.color} style={{height:day.total?day[l.key]/day.total*100+'%':0}} />)}</div><span className="text-[11px] text-slate-500">{day.label}</span>
    </div>)}</div>
    <div className="mt-4 flex flex-wrap gap-3">{legend.map(l=><span key={l.key} className="flex items-center gap-1.5 text-[10px] text-slate-600"><i className={`h-2 w-2 rounded ${l.color}`}/>{l.label}</span>)}</div>
   </section>
   <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-bold text-slate-800">Phân bổ ca dạy trong kỳ</h2><p className="mt-1 text-[11px] text-slate-500">Tính cho người thực dạy, gồm ca dạy thay; bỏ ca nghỉ.</p>
    {data.workload.length?<PaginatedList className="mt-3 space-y-3 max-h-64 overflow-y-auto">{data.workload.map(t=><div key={t.id} className="space-y-1"><div className="flex justify-between gap-2 text-[11px]"><span className="truncate text-slate-600">{t.name}</span><strong>{t.count} ca</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:t.count/maxLoad*100+'%'}}/></div></div>)}</PaginatedList>:<p className="py-10 text-center text-xs text-slate-400">Chưa có lịch dạy trong kỳ đã chọn.</p>}
   </section>
  </div>}
  {section==='operations' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
   <h2 className="flex items-center gap-2 p-4 text-sm font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-orange-500"/>Danh sách ca học trong kỳ</h2>
   <div className="max-h-80 overflow-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="p-3">Ngày</th><th className="p-3">Giờ học</th><th className="p-3">Lớp</th><th className="p-3">Giáo viên</th><th className="p-3">Trạng thái</th></tr></thead>
    <PaginatedTableBody>{data.periodLessons.map(row=><tr key={row.lesson.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{dateLabel(row.lesson.date)}</td><td className="p-3 whitespace-nowrap">{row.time}</td><td className="p-3">{row.className}</td><td className="p-3">{row.teacherName}{row.lesson.coverTeacherId&&<span className="ml-1 text-[10px] text-indigo-600">(Dạy thay)</span>}</td><td className={`p-3 font-semibold ${['CHUA_HOC','CHUA_HOAN_TAT'].includes(row.state)?'text-rose-600':'text-slate-600'}`}>{labels[row.state]||row.state}</td></tr>)}{!data.periodLessons.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-400">Chưa có ca học trong kỳ đã chọn.</td></tr>}</PaginatedTableBody>
   </table></div>
  </section>}
 </>;
}
