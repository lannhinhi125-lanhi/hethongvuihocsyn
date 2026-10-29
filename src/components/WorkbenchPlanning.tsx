import React,{useMemo,useState} from 'react';
import {useApp} from '../context/AppContext';
import {usePermissions} from '../hooks/usePermissions';
import {waitingDemand,endingClasses} from '../lib/workbenchPlanning';
import {localDay} from '../lib/workbench';
import {ReportSelect} from './ReportSelect';

export function WorkbenchPlanning(){
 const {students,classes,subjects,models,openDashboardDetail}=useApp();
 const {canModule}=usePermissions();
 const [days,setDays]=useState(30);
 const today=localDay(new Date());
 const demand=useMemo(()=>waitingDemand(students),[students]);
 const ending=useMemo(()=>endingClasses(classes,today,days),[classes,today,days]);
 const waitingIds=[...new Set(demand.flatMap(row=>row.ids))];
 const unassigned=classes.filter(item=>!['Dừng lớp','Đã kết thúc'].includes(item.status||'')&&!item.teacherId);
 const go=(tab:'students'|'classes',label:string,ids:string[])=>{if(canModule('PH4'))openDashboardDetail({module:4,tab,label,ids});};
 const subject=(code:string)=>subjects.find(item=>item.code===code)?.name||code||'Chưa có môn';
 const model=(code:string)=>models.find(item=>item.code===code)?.name||code||'Chưa có mô hình';
 const link='text-left font-semibold text-indigo-700 enabled:hover:underline disabled:cursor-default disabled:text-slate-700';
 return <div className="grid items-start gap-3 lg:grid-cols-2">
  <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
   <div className="border-b border-slate-100 p-3"><h3 className="text-sm font-bold text-slate-800">Nhu cầu xếp lớp hiện tại</h3>
    <p className="mt-1 text-[11px] text-slate-500">Hiện trạng toàn bộ, không phụ thuộc kỳ phía trên.</p>
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
     <button disabled={!canModule('PH4')} onClick={()=>go('students','Học sinh chờ xếp lớp',waitingIds)} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900"><strong>{waitingIds.length}</strong> học sinh chờ lớp</button>
     <button disabled={!canModule('PH4')} onClick={()=>go('classes','Lớp chưa có giáo viên',unassigned.map(item=>item.id))} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-orange-900"><strong>{unassigned.length}</strong> lớp thiếu giáo viên ↗</button>
    </div>
   </div>
   <div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="p-3">Môn học</th><th className="p-3">Mô hình</th><th className="p-3 text-right">HS chờ</th></tr></thead>
    <tbody>{demand.map(row=><tr key={JSON.stringify([row.subject,row.model])} className="border-t border-slate-100"><td className="p-3"><button disabled={!canModule('PH4')} onClick={()=>go('students',`Chờ lớp · ${subject(row.subject)} · ${model(row.model)}`,row.ids)} className={link}>{subject(row.subject)} ↗</button></td><td className="p-3">{model(row.model)}</td><td className="p-3 text-right font-semibold">{row.ids.length}</td></tr>)}{!demand.length&&<tr><td colSpan={3} className="p-6 text-center text-slate-400">Không có học sinh chờ xếp lớp.</td></tr>}</tbody>
   </table></div>
   <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">Một học sinh có thể chờ nhiều môn; không cộng các nhóm thành tổng học sinh.</p>
  </section>
  <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
   <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-3"><div><h3 className="text-sm font-bold text-slate-800">Lớp sắp kết thúc <span className="text-orange-600">· {ending.length}</span></h3><p className="mt-1 text-[11px] text-slate-500">Tính từ hôm nay, gồm lớp kết thúc hôm nay.</p></div>
    <ReportSelect aria-label="Khoảng ngày lớp sắp kết thúc" value={days} onChange={event=>setDays(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="7">7 ngày tới</option><option value="14">14 ngày tới</option><option value="30">30 ngày tới</option></ReportSelect>
   </div>
   <div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="p-3">Lớp / môn</th><th className="p-3">Kết thúc</th><th className="p-3 text-right">Còn</th></tr></thead>
    <tbody>{ending.map(({item,remaining})=><tr key={item.id} className="border-t border-slate-100"><td className="p-3"><button disabled={!canModule('PH4')} onClick={()=>go('classes','Lớp sắp kết thúc · '+item.name,[item.id])} className={link}>{item.name} ↗</button><p className="mt-0.5 text-[11px] text-slate-500">{item.code} · {subject(item.subject)}</p></td><td className="whitespace-nowrap p-3">{item.endDate!.split('-').reverse().join('/')}</td><td className={'whitespace-nowrap p-3 text-right font-semibold '+(remaining<=7?'text-orange-700':'text-slate-600')}>{remaining===0?'Hôm nay':remaining+' ngày'}</td></tr>)}{!ending.length&&<tr><td colSpan={3} className="p-6 text-center text-slate-400">Không có lớp sắp kết thúc trong {days} ngày tới.</td></tr>}</tbody>
   </table></div>
   <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">Chỉ lấy lớp có ngày kết thúc; bỏ lớp đã kết thúc hoặc dừng.</p>
  </section>
 </div>;
}
