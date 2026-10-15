import type { ClassModelItem } from '../types';
import { isTeachingModelParent, teachingModelGroup, teachingModelGroups } from '../lib/teachingModelGroups';

export function TeacherModelPicker({models,selected,onChange}:{models:ClassModelItem[];selected:string[];onChange:(value:string[])=>void}) {
  const choices=models.filter(model=>!isTeachingModelParent(model.code) && (model.status || selected.includes(model.code)));
  const checkbox=(model:ClassModelItem)=><label key={model.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
    <input type="checkbox" className="accent-indigo-600" checked={selected.includes(model.code)}
      onChange={()=>onChange(selected.includes(model.code) ? selected.filter(code=>code!==model.code && !isTeachingModelParent(code)) : [...selected.filter(code=>!isTeachingModelParent(code)),model.code])} />
    <span>{model.code}</span>
  </label>;
  return <div className="space-y-2">{teachingModelGroups(choices.map(model=>model.code)).map(group=> {
    const children=choices.filter(model=>teachingModelGroup(model.code)===group);
    if(group!=='1-N')return <div key={group}>{children.map(checkbox)}</div>;
    return <details key={group} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-indigo-800">1-N <span className="font-normal">({children.filter(model=>selected.includes(model.code)).length} mô hình đã chọn)</span></summary>
      <div className="mt-3 grid grid-cols-2 gap-2">{children.map(checkbox)}</div>
    </details>;
  })}<p className="text-xs text-slate-500">Mở nhóm 1-N để chọn từng mô hình nhận dạy. Giáo viên chỉ được gợi ý cho lớp có đúng mô hình đã chọn.</p></div>;
}

export function TeacherModelBadges({codes}:{codes:string[]}) {
  return <>{teachingModelGroups(codes).map(group=> {
    const children=codes.filter(code=>!isTeachingModelParent(code) && teachingModelGroup(code)===group);
    const badge='px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]';
    return group==='1-N' ? <details key={group} className="relative" title={children.join(', ') || 'Chưa chọn mô hình cụ thể'}>
      <summary className={`${badge} cursor-pointer`}>1-N</summary>
      <div className="absolute z-20 top-full mt-1 min-w-32 rounded-lg border bg-white p-2 text-xs shadow-lg">{children.join(', ') || 'Chưa chọn mô hình cụ thể'}</div>
    </details> : <span key={group} className={badge}>{group}</span>;
  })}</>;
}
