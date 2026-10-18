import React,{useState} from 'react';
import {useBusinessValue,waitForBusinessSave} from '../lib/businessPersistence';
import {CLASS_DURATION_CODE,type ClassDurationCatalog as Catalog} from '../lib/classDuration';
import {usePermissions} from '../hooks/usePermissions';
export function ClassDurationCatalog(){
 const [catalogs,setCatalogs]=useBusinessValue<Catalog[]>('custom_catalogs');
 const catalog=catalogs.find(row=>row.code===CLASS_DURATION_CODE);
 const [months,setMonths]=useState(1),[name,setName]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const {can}=usePermissions();const editable=can('Tạo danh mục bổ sung và danh mục con');
 const save=async(next:Catalog)=>{setSaving(true);setError('');try{setCatalogs(rows=>rows.map(row=>row.id===next.id?next:row));await waitForBusinessSave();setName('');}catch(e){setError((e as Error).message);}finally{setSaving(false);}};
 return <div className="space-y-3"><h3 className="font-bold">Thời hạn lớp học</h3><p className="text-xs text-slate-500">Tính theo tháng lịch. Một năm tương ứng 12 tháng; ngày kết thúc là ngày trước mốc tròn thời hạn.</p>
 {!catalog?<p className="text-amber-700 text-sm">Danh mục thời hạn lớp học chưa được khởi tạo. Liên hệ quản trị để thiết lập.</p>:<>
 <form className="flex flex-wrap gap-2 text-xs" onSubmit={e=>{e.preventDefault();if(!editable||saving)return;if(!Number.isInteger(months)||months<1||months>120||catalog.entries.some(row=>Number(row.code)===months)){setError('Nhập thời hạn từ 1–120 tháng, không trùng thời hạn đã có.');return;}void save({...catalog,entries:[...catalog.entries,{id:crypto.randomUUID(),code:String(months),name:name.trim()||months+' tháng',status:true}]});}}><input aria-label="Tên thời hạn" placeholder="Tên thời hạn" value={name} onChange={e=>setName(e.target.value)} className="border rounded-lg p-2"/><input aria-label="Số tháng" type="number" min={1} max={120} value={months} onChange={e=>setMonths(Number(e.target.value))} className="w-24 border rounded-lg p-2"/><button disabled={!editable||saving} className="rounded-lg bg-orange-50 text-orange-700 px-3 disabled:opacity-40">Thêm thời hạn</button></form>
 <div className="divide-y rounded-xl border">{catalog.entries.map(row=><div key={row.id} className="flex items-center justify-between p-3 text-sm"><span>{row.name} · {row.code} tháng</span><button disabled={!editable||saving} onClick={()=>void save({...catalog,entries:catalog.entries.map(item=>item.id===row.id?{...item,status:!item.status}:item)})} className="text-orange-700 text-xs disabled:opacity-40">{row.status?'Ngừng sử dụng':'Kích hoạt'}</button></div>)}</div></>}{error&&<p role="alert" className="text-rose-700">{error}</p>}</div>;
}
