import {InfoTitle} from './InfoTitle';
import type {workbenchAnalytics} from '../lib/workbenchAnalytics';
import type {WorkbenchRange} from '../lib/workbenchTime';
import {PaginatedTableBody} from './Pagination';
import {MetricComparison} from './MetricComparison';
import type {workbenchComparison} from '../lib/workbenchComparison';

export function WorkbenchGrowth({data,previous,comparison,range}:{data:ReturnType<typeof workbenchAnalytics>;previous:ReturnType<typeof workbenchAnalytics>;comparison:ReturnType<typeof workbenchComparison>;range:WorkbenchRange}){
 const metrics=[{label:'Hồ sơ học sinh mới',value:data.newStudents,previous:previous.newStudents},
  {label:'Học sinh cũ chuyển lớp',value:data.oldTransferred,previous:previous.oldTransferred},
  {label:'Lớp được tạo trong kỳ',value:data.newClasses,previous:previous.newClasses},
  {label:'Lớp mới tăng trưởng',value:data.growthClasses,previous:previous.growthClasses}];
 return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
  <div><h3 className="text-sm font-bold text-slate-800"><InfoTitle title="Học sinh mới, chuyển lớp & tăng trưởng lớp"><p>Trong kỳ {range.start} – {range.end}. Hồ sơ mới dựa trên mã học sinh và ngày tạo; chuyển lớp dựa trên lịch sử chuyển từ lớp này sang lớp khác.</p><p>Học sinh cũ là hồ sơ tạo trước kỳ. Một người chuyển nhiều lần chỉ đếm một người. Đăng ký thêm môn không tạo hồ sơ mới. Có {data.newTransferred} học sinh mới trong kỳ cũng đã chuyển lớp; những bạn này vẫn nằm trong số hồ sơ mới.{data.unknownTransferred>0&&` Có ${data.unknownTransferred} học sinh chuyển lớp chưa đủ dữ liệu ngày tạo để xác định mới/cũ.`}</p></InfoTitle></h3></div>
  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{metrics.map(item=><div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-[11px] text-slate-600">{item.label}</span><strong className="mt-0.5 block text-xl text-orange-600">{item.value}</strong><MetricComparison current={item.label==='Lớp mới tăng trưởng'&&data.classKinds.some(k=>k.kind==='UNKNOWN'&&k.count>0)?null:item.value} previous={item.label==='Lớp mới tăng trưởng'&&previous.classKinds.some(k=>k.kind==='UNKNOWN'&&k.count>0)?null:item.previous} label={comparison.label}/></div>)}</div>
  
  <div className="border-t border-slate-100 pt-4"><h4 className="text-xs font-bold text-slate-800"><InfoTitle title={"Phân loại " + (data.newClasses) + " lớp được tạo trong kỳ"}><p>Chỉ tính lớp mới tăng trưởng khi có học sinh, toàn bộ là hồ sơ mới trong kỳ và được ghép lớp lần đầu theo môn. Lớp có học sinh cũ hoặc đã chuyển lớp không được cộng. Không có đủ lịch sử thì để chưa xác định.</p></InfoTitle></h4>
   <div className="mt-3 space-y-3">{data.classKinds.map((item,i)=><div key={item.kind}><div className="mb-1 flex justify-between gap-3 text-xs text-slate-600"><span>{item.label}</span><strong>{item.count}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${['bg-emerald-500','bg-orange-400','bg-indigo-500','bg-slate-300','bg-amber-400'][i]}`} style={{width:data.newClasses?`${item.count/data.newClasses*100}%`:'0%'}}/></div></div>)}</div>
  </div>
  <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-semibold text-indigo-700">Đối chiếu từng lớp trong kỳ ({data.classifiedClasses.length})</summary>
   <div className="workspace-table-scroll mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="p-2">Lớp</th><th className="p-2">Ngày tạo</th><th className="p-2">Phân loại</th><th className="p-2">HS mới đủ điều kiện</th><th className="p-2">HS cũ / chuyển lớp</th><th className="p-2">Chưa xác định</th></tr></thead>
    <PaginatedTableBody>{data.classifiedClasses.map(cls=><tr key={cls.id} className="border-t border-slate-100"><td className="p-2">{cls.name}<div className="text-[10px] text-slate-400">{cls.code||cls.id}</div></td><td className="whitespace-nowrap p-2">{cls.date}</td><td className="p-2">{cls.label}</td><td className="p-2">{cls.newStudents}</td><td className="p-2">{cls.oldStudents}</td><td className="p-2">{cls.unknownStudents}</td></tr>)}{!data.classifiedClasses.length&&<tr><td colSpan={6} className="p-4 text-center text-slate-500">Chưa có lớp được tạo trong kỳ này.</td></tr>}</PaginatedTableBody>
   </table></div>
  </details>
 </section>;
}
