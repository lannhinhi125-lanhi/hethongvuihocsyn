import React, {useState, type FormEvent} from 'react';
import {Pencil, X} from 'lucide-react';
import {useBusinessValue, waitForBusinessSave} from '../lib/businessPersistence';
import {CLASS_DURATION_CODE, type ClassDurationCatalog as Catalog, type ClassDurationEntry} from '../lib/classDuration';
import {usePermissions} from '../hooks/usePermissions';
import {useApp} from '../context/AppContext';
import {CatalogTreeBranch} from './CatalogTreeBranch';
import {PaginatedTableBody} from './Pagination';

export function ClassDurationCatalog({searchKeyword=''}:{searchKeyword?:string}) {
  const [catalogs,setCatalogs]=useBusinessValue<Catalog[]>('custom_catalogs');
  const catalog=catalogs.find(row=>row.code===CLASS_DURATION_CODE);
  const {can,requirePermission}=usePermissions();
  const {showToast}=useApp();
  const permission='Tạo danh mục bổ sung và danh mục con';
  const [isModalOpen,setIsModalOpen]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [months,setMonths]=useState(1);
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [isActive,setIsActive]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const editable=can(permission);
  const openModal=(item?:ClassDurationEntry)=>{
    if(saving||!catalog||!requirePermission(permission))return;
    setEditingId(item?.id||null);setMonths(item?Number(item.code):1);
    setName(item?.name||'');setDescription(item?.desc||'');setIsActive(item?.status??true);
    setError('');setIsModalOpen(true);
  };
  const persist=async(next:Catalog,after?:()=>void)=>{
    if(saving||!requirePermission(permission))return;
    setSaving(true);setError('');
    try {
      setCatalogs(rows=>rows.map(row=>row.id===next.id?next:row));
      await waitForBusinessSave();after?.();showToast('Đã lưu danh mục thời hạn lớp học.','success');
    } catch(e) {
      const message=e instanceof Error?e.message:'Chưa lưu được thời hạn lớp học.';
      setError(message);showToast(message,'error');
    } finally {setSaving(false);}
  };
  const handleSave=(event:FormEvent)=>{
    event.preventDefault();
    if(!catalog||saving||!requirePermission(permission))return;
    if(!name.trim()){setError('Vui lòng nhập tên thời hạn.');return;}
    if(!Number.isInteger(months)||months<1||months>120||catalog.entries.some(row=>row.id!==editingId&&Number(row.code)===months)){
      setError('Nhập thời hạn từ 1–120 tháng, không trùng thời hạn đã có.');return;
    }
    const existing=catalog.entries.find(row=>row.id===editingId);
    const entry:ClassDurationEntry={...existing,id:existing?.id||crypto.randomUUID(),code:existing?.code||String(months),name:name.trim(),desc:description.trim(),status:isActive};
    void persist({...catalog,entries:editingId?catalog.entries.map(row=>row.id===editingId?entry:row):[...catalog.entries,entry]},()=>setIsModalOpen(false));
  };
  const query=searchKeyword.trim().toLocaleLowerCase('vi');
  const rows=(catalog?.entries||[]).filter(row=>(row.code+' '+row.name).toLocaleLowerCase('vi').includes(query));
  const inputClass='w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00] disabled:bg-slate-50 disabled:text-slate-500';
  return <>
    <CatalogTreeBranch title={catalog?.name||'Thời hạn lớp học'} count={catalog?.entries.length||0} onAdd={()=>openModal()} addLabel="Thêm thời hạn" disabled={!catalog||saving||!editable} revealKey={searchKeyword}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-inter leading-relaxed">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold"><tr>{['Số tháng','Tên thời hạn','Mô tả trường dữ liệu','Trạng thái','Bật / Tắt','Thao tác'].map((label,index)=><th key={label} className={'py-3 px-4'+(index>3?' text-center':'')}>{label}</th>)}</tr></thead>
          <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
            {rows.map(row=><tr key={row.id} className="hover:bg-slate-50/80">
              <td className="py-3 px-4 font-medium tabular-nums text-[#FF5C00]">{row.code}</td>
              <td className="py-3 px-4 font-semibold text-slate-800">{row.name}</td>
              <td className="py-3 px-4 text-slate-600">{row.desc||'—'}</td>
              <td className="py-3 px-4"><span className={'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] '+(row.status?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}><span className={'w-1.5 h-1.5 rounded-full '+(row.status?'bg-emerald-500':'bg-slate-400')}/>{row.status?'Đang áp dụng':'Tạm dừng'}</span></td>
              <td className="py-3 px-4 text-center"><input type="checkbox" aria-label={'Bật / tắt '+row.name} checked={row.status} disabled={saving||!editable} onChange={event=>{if(catalog)void persist({...catalog,entries:catalog.entries.map(item=>item.id===row.id?{...item,status:event.target.checked}:item)});}} className="accent-[#FF5C00] w-4 h-4 cursor-pointer disabled:opacity-40"/></td>
              <td className="py-3 px-4 text-center"><button type="button" disabled={saving||!editable} onClick={()=>openModal(row)} title="Sửa thời hạn" aria-label={'Sửa '+row.name} className="p-1 rounded text-slate-500 hover:text-[#FF5C00] hover:bg-slate-100 disabled:opacity-40"><Pencil className="w-4 h-4"/></button></td>
            </tr>)}
            {!rows.length&&<tr><td colSpan={6} className="py-10 px-4 text-center text-slate-500">{!catalog?'Danh mục thời hạn lớp học chưa được khởi tạo trên Supabase.':catalog.entries.length?'Không tìm thấy thời hạn phù hợp.':'Chưa có thời hạn. Bấm Thêm thời hạn để tạo mới.'}</td></tr>}
          </PaginatedTableBody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-100">Thời hạn tính theo tháng lịch; một năm tương ứng 12 tháng. Ngày kết thúc là ngày trước mốc tròn thời hạn.</p>
    </CatalogTreeBranch>
    {!isModalOpen&&error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
    {isModalOpen&&<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="duration-catalog-title" className="bg-white rounded-2xl max-w-md w-full p-6 font-inter text-xs leading-relaxed shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h3 id="duration-catalog-title" className="font-semibold text-sm text-slate-800">{editingId?'Hiệu chỉnh Thời hạn lớp học':'Thêm Thời hạn lớp học Mới'}</h3><button type="button" disabled={saving} onClick={()=>setIsModalOpen(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button></div>
        <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
          <label className="block font-semibold text-slate-700">Số tháng <span className="text-rose-500">*</span><input required type="number" min={1} max={120} step={1} value={months} disabled={Boolean(editingId)||saving} onChange={event=>setMonths(Number(event.target.value))} className={inputClass+' mt-1 font-normal tabular-nums'}/></label>
          {editingId&&<p className="text-[11px] text-slate-500">Số tháng được giữ nguyên để bảo toàn liên kết với các lớp đã sử dụng.</p>}
          <label className="block font-semibold text-slate-700">Tên thời hạn <span className="text-rose-500">*</span><input required value={name} disabled={saving} onChange={event=>setName(event.target.value)} className={inputClass+' mt-1 font-normal'}/></label>
          <label className="block font-semibold text-slate-700">Mô tả trường dữ liệu<textarea rows={2} value={description} disabled={saving} onChange={event=>setDescription(event.target.value)} className={inputClass+' mt-1 font-normal'}/></label>
          <label className="flex gap-2 items-center font-semibold text-slate-700"><input type="checkbox" checked={isActive} disabled={saving} onChange={event=>setIsActive(event.target.checked)} className="accent-[#FF5C00] w-4 h-4"/>Đang áp dụng</label>
          {error&&<p role="alert" className="text-rose-700">{error}</p>}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer">Hủy</button><button type="submit" disabled={saving||!editable} className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-40">{saving?'Đang lưu...':'Lưu dữ liệu'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
