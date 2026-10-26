import type {workbenchData} from '../lib/workbench';
import {InfoTitle} from './InfoTitle';

const legend=[{key:'done',label:'Đã học, không cảnh báo',color:'bg-emerald-500'},
 {key:'warning',label:'Cần kiểm tra',color:'bg-rose-500'},
 {key:'upcoming',label:'Sắp tới / đang học',color:'bg-indigo-400'},
 {key:'cancelled',label:'Nghỉ',color:'bg-amber-400'}] as const;

export function SessionStatusChart({days,onReview}:{days:ReturnType<typeof workbenchData>['days'];onReview:()=>void}){
 const max=Math.max(1,...days.map(day=>day.total));
 return <section className="rounded-2xl border border-slate-200 bg-white p-4">
  <h2 className="text-sm font-bold text-slate-800"><InfoTitle title="Trạng thái ca học theo thời gian"><p>Mỗi hàng là một ngày hoặc nhóm ngày trong kỳ. Các ca có cảnh báo nằm ở màu Cần kiểm tra để không đếm trùng. Ca đã vào dạy và kết thúc vẫn thuộc tổng Đã học trên dashboard, kể cả có cảnh báo chưa hoàn tất.</p><p><strong>Cần kiểm tra:</strong> đến giờ chưa check-in; hết giờ chưa checkout; hoặc checkout sớm trên 5 phút.</p></InfoTitle></h2>
  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">{legend.map(item=><span key={item.key} className="flex items-center gap-2 text-[11px] text-slate-600"><i className={`h-2.5 w-2.5 shrink-0 rounded ${item.color}`}/>{item.label}</span>)}</div>
  <div className="mt-5 space-y-4">{days.map(day=><div key={day.date}>
   <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{day.label}</span><strong className="whitespace-nowrap text-slate-600">{day.total} ca</strong></div>
   <div role="img" aria-label={`${day.label}: ${legend.map(item=>`${day[item.key]} ${item.label}`).join(', ')}`} className="h-3 overflow-hidden rounded-full bg-slate-100">
    <div className="flex h-full" style={{width:`${day.total/max*100}%`}}>{legend.map(item=><div key={item.key} className={`h-full ${item.color}`} style={{width:day.total?`${day[item.key]/day.total*100}%`:'0%'}}/>)}</div>
   </div>
   <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">{day.total?legend.filter(item=>day[item.key]>0).map(item=><span key={item.key} className="inline-flex items-center gap-1"><i className={`h-1.5 w-1.5 rounded ${item.color}`}/>{day[item.key]} {item.label.toLocaleLowerCase('vi')}</span>):<span>Không có ca học</span>}</div>
  </div>)}</div>
  <button type="button" onClick={onReview} className="mt-4 text-[11px] font-semibold text-rose-700 hover:underline">Xem các ca cần kiểm tra →</button>
 </section>;
}
