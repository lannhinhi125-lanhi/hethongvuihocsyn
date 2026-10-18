import React,{useMemo} from 'react';
import {useApp} from '../context/AppContext';
import {useBusinessValue} from '../lib/businessPersistence';
import {workbenchAnalytics,type WorkbenchEvaluation} from '../lib/workbenchAnalytics';
import type {WorkbenchRange} from '../lib/workbenchTime';
import {reportCreationDate} from '../lib/reportCreationDate';
import {WorkbenchGrowth} from './WorkbenchGrowth';

const colors=['#6366f1','#10b981','#f59e0b','#f43f5e','#06b6d4','#a855f7'];
function Distribution({items}:{items:{label:string;count:number}[]}){
 const total=items.reduce((n,i)=>n+i.count,0);let offset=0;
 const stops=items.map((item,i)=>{const from=offset;offset+=total?item.count/total*100:0;return `${colors[i%colors.length]} ${from}% ${offset}%`;});
 return <div className="mt-5 flex flex-wrap items-center justify-center gap-6"><div role="img" aria-label={items.map(i=>`${i.label}: ${i.count}`).join(', ')} className="relative h-36 w-36 shrink-0 rounded-full" style={{background:total?`conic-gradient(${stops.join(',')})`:'#f1f5f9'}}><div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl text-slate-800">{total}</strong><span className="text-[10px] text-slate-500">{total?'Tổng cộng':'Chưa có dữ liệu'}</span></div></div><div className="min-w-40 space-y-3">{items.map((item,i)=><div key={item.label} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="h-2 w-2 rounded" style={{background:colors[i%colors.length]}}/>{item.label}</span><strong>{item.count}</strong></div>)}</div></div>;
}
export function WorkbenchAnalytics({section,range}:{section:'enrollment'|'quality';range:WorkbenchRange}){
 const {classes,students,subjects}=useApp();
 const [lessons]=useBusinessValue<{id:string;date:string}[]>('dated_lessons');
 const [incidents]=useBusinessValue<{lessonId:string}[]>('lesson_incidents');
 const [evaluations]=useBusinessValue<WorkbenchEvaluation[]>('teacher_evaluations');
 const data=useMemo(()=>workbenchAnalytics(classes,students,lessons,incidents,evaluations,range),[classes,students,lessons,incidents,evaluations,range]);
 const metrics=section==='enrollment'?[{label:'Tổng hồ sơ học sinh',value:data.totalStudents},{label:'Học sinh đang học',value:data.activeStudents},{label:'Tổng lớp học',value:data.totalClasses},{label:'Lớp đang học',value:data.activeClasses}]:
  [{label:'Ca có ghi nhận sự cố',value:`${data.affected}/${data.totalLessons}`},{label:'Tỷ lệ ca có sự cố',value:data.totalLessons?data.incidentRate+'%':'—'},{label:'Biên bản dự giờ đã duyệt',value:data.evaluationCount},{label:'Điểm TB giáo viên được dự giờ',value:data.averageScore===null?'—':data.averageScore.toFixed(2)+'/10'}];
 const max=Math.max(1,...data.growth.flatMap(g=>[g.students,g.classes]));
 const creationDates=[...classes,...students].map(item=>reportCreationDate(item.created_at)).filter(Boolean).sort();
 const points=(key:'students'|'classes')=>data.growth.map((g,i)=>`${30+i*540/Math.max(1,data.growth.length-1)},${140-g[key]/max*115}`).join(' ');
 return <div className="space-y-4">
  <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-bold text-slate-800">{section==='enrollment'?'Học sinh & lớp học hiện tại':'Theo dõi chất lượng đào tạo'}</h2>
   <p className="mt-1 text-xs text-slate-500">{section==='enrollment'?'Tổng hợp toàn bộ hồ sơ hiện có từ dữ liệu đã tải, không lọc ngày tạo. Mỗi mã học sinh hoặc mã lớp chỉ tính một lần; tổng lớp gồm cả lớp chờ khai giảng, tạm dừng và đã kết thúc.':'Sự cố tính theo ngày buổi học; dự giờ theo ngày đánh giá và chỉ lấy biên bản đã duyệt.'}</p>
   <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(m=><div key={m.label} className="rounded-xl bg-slate-50 p-3"><span className="text-[11px] text-slate-600">{m.label}</span><strong className="mt-2 block text-2xl text-slate-900">{m.value}</strong></div>)}</div>
  </section>
  {section==='enrollment'?<>
   <WorkbenchGrowth data={data} range={range}/>
   {!data.newStudents&&!data.newClasses&&<p className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">Không có hồ sơ học sinh hoặc lớp được tạo trong kỳ này.{creationDates.length?` Dữ liệu hiện có ngày tạo từ ${creationDates[0]} đến ${creationDates[creationDates.length-1]}; dùng thanh thời gian phía trên để xem kỳ tương ứng.`:' Chưa có dữ liệu ngày tạo để đối chiếu.'}</p>}
   <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-slate-800">Xu hướng học sinh mới & lớp mới tăng trưởng</h3>
    <svg viewBox="0 0 600 175" role="img" aria-label="Biểu đồ hồ sơ học sinh mới và lớp mới tăng trưởng trong kỳ" className="mt-4 w-full"><line x1="30" y1="140" x2="570" y2="140" stroke="#e2e8f0"/>
     <polyline points={points('students')} fill="none" stroke="#10b981" strokeWidth="3"/><polyline points={points('classes')} fill="none" stroke="#6366f1" strokeWidth="3"/>
     {data.growth.map((g,i)=><g key={g.date}><title>{`${g.label}: ${g.students} hồ sơ mới, ${g.classes} lớp mới tăng trưởng`}</title><circle cx={30+i*540/Math.max(1,data.growth.length-1)} cy={140-g.students/max*115} r="3" fill="#10b981"/><circle cx={30+i*540/Math.max(1,data.growth.length-1)} cy={140-g.classes/max*115} r="3" fill="#6366f1"/><text x={30+i*540/Math.max(1,data.growth.length-1)} y="162" textAnchor="middle" fontSize="9" fill="#64748b">{g.label}</text></g>)}
    </svg><div className="flex gap-4 text-[11px]"><span className="text-emerald-600">● Hồ sơ học sinh mới</span><span className="text-indigo-600">● Lớp mới tăng trưởng</span></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-slate-800">Toàn bộ lớp hiện có theo môn</h3><p className="mt-1 text-xs text-slate-500">Cùng phạm vi với Tổng lớp học, không lọc theo ngày tạo.</p><Distribution items={data.currentSubjects.map(s=>({label:subjects.find(i=>i.code===s.subject)?.name||s.subject||'Chưa có môn',count:s.count}))}/></section></div>
   <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-slate-800">Nhu cầu xếp lớp hiện tại</h3><p className="mt-1 text-xs text-slate-500">Hiện trạng đang chờ, không phải số liệu lịch sử của kỳ đã chọn.</p><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Học sinh có môn chờ xếp lớp<strong className="mt-1 block text-xl">{data.waiting}</strong></div><div className="rounded-xl bg-orange-50 p-3 text-xs text-orange-800">Lớp chưa có giáo viên<strong className="mt-1 block text-xl">{data.noTeacher}</strong></div></div></section>
  </>:<div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-slate-800">Ca học có ghi nhận sự cố</h3><p className="mt-1 text-[11px] text-slate-500">Mỗi ca chỉ tính một lần dù có nhiều sự cố.</p><Distribution items={[{label:'Chưa ghi nhận sự cố',count:data.totalLessons-data.affected},{label:'Có sự cố',count:data.affected}]}/></section>
   <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold text-slate-800">Xếp loại giáo viên được dự giờ</h3><p className="mt-1 text-[11px] text-slate-500">Theo điểm trung bình các biên bản đã duyệt trong kỳ · {data.evaluatedTeachers} giáo viên.</p><div className="mt-6 space-y-4">{data.ratings.map((r,i)=><div key={r.label}><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{r.label}</span><strong>{r.count}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{background:colors[i],width:data.evaluatedTeachers?r.count/data.evaluatedTeachers*100+'%':0}}/></div></div>)}</div></section></div>}
 </div>;
}
