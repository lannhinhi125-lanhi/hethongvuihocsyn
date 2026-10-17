import {useState, type FormEvent} from 'react';
import {Pencil, Trash2, X} from 'lucide-react';
import type {DocumentCategory} from '../types';
import {useBusinessValue,waitForBusinessSave} from '../lib/businessPersistence';
import {usePermissions} from '../hooks/usePermissions';
import {useApp} from '../context/AppContext';
import {PaginatedTableBody} from './Pagination';
import {CatalogTreeBranch} from './CatalogTreeBranch';
import {confirmAction} from './ConfirmAction';

export function DocumentCategoryManager({searchKeyword=''}:{searchKeyword?:string}) {
  const [categories,setCategories]=useBusinessValue<DocumentCategory[]>('document_categories');
  const {sopDocuments,showToast}=useApp();
  const {can,requirePermission}=usePermissions();
  const permission='Quản lý danh mục loại tài liệu';
  const [editing,setEditing]=useState<string|null>(null);
  const [isModalOpen,setIsModalOpen]=useState(false);
  const [code,setCode]=useState('');
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [isActive,setIsActive]=useState(true);
  const [saving,setSaving]=useState(false);
  const openModal=(item?:DocumentCategory)=>{
    if(saving || !requirePermission(permission))return;
    setEditing(item?.id || null);setCode(item?.id || 'LT-'+Date.now());
    setName(item?.name || '');setDescription(item?.description || '');
    setIsActive(item?.isActive ?? true);setIsModalOpen(true);
  };
  const persist=async(next:DocumentCategory[],after?:()=>void)=>{
    if(saving || !requirePermission(permission))return;
    setSaving(true);
    try{setCategories(next);await waitForBusinessSave();after?.();showToast('Đã lưu danh mục loại tài liệu.','success');}
    catch(error){showToast(error instanceof Error ? error.message : 'Chưa lưu được loại tài liệu.','error');}
    finally{setSaving(false);}
  };
  const handleSave=(event:FormEvent)=>{
    event.preventDefault();
    if(!requirePermission(permission))return;
    const id=code.trim(),label=name.trim();if(!id || !label)return;
    if(categories.some(item=>(item.id===id || item.name.toLocaleLowerCase('vi')===label.toLocaleLowerCase('vi')) && item.id!==editing)){
      showToast('Mã hoặc tên loại tài liệu đã tồn tại.','error');return;
    }
    const row={id,name:label,description:description.trim(),isActive};
    void persist(editing ? categories.map(item=>item.id===editing?row:item) : [...categories,row],()=>setIsModalOpen(false));
  };
  const query=searchKeyword.trim().toLocaleLowerCase('vi');
  const filtered=categories.filter(item=>item.id.toLocaleLowerCase('vi').includes(query)||item.name.toLocaleLowerCase('vi').includes(query));
  const inputClass='w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00] disabled:bg-slate-50 disabled:text-slate-500';
  return <>
    <CatalogTreeBranch title="Loại tài liệu" count={categories.length} onAdd={()=>openModal()} addLabel="Thêm loại tài liệu" disabled={saving||!can(permission)} revealKey={searchKeyword}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-inter leading-relaxed">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
            <tr>{['Mã loại','Tên loại tài liệu','Mô tả trường dữ liệu','Số tài liệu','Trạng thái','Bật / Tắt','Thao tác'].map((label,index)=><th key={label} className={'py-3 px-4'+(index>4?' text-center':'')}>{label}</th>)}</tr>
          </thead>
          <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
            {filtered.map(item=>{
              const used=sopDocuments.filter(doc=>doc.categoryId===item.id).length;
              return <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-medium tabular-nums text-[#FF5C00]">{item.id}</td>
                <td className="py-3 px-4 font-semibold text-slate-800 text-xs">{item.name}</td>
                <td className="py-3 px-4 text-slate-600">{item.description || '—'}</td>
                <td className="py-3 px-4 text-slate-600">{used}</td>
                <td className="py-3 px-4"><span className={'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] '+(item.isActive?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}>
                  <span className={'w-1.5 h-1.5 rounded-full '+(item.isActive?'bg-emerald-500':'bg-slate-400')} />{item.isActive?'Đang áp dụng':'Tạm dừng'}
                </span></td>
                <td className="py-3 px-4 text-center"><input type="checkbox" aria-label={'Bật / tắt '+item.name} checked={item.isActive} disabled={saving||!can(permission)} onChange={event=>void persist(categories.map(row=>row.id===item.id?{...row,isActive:event.target.checked}:row))} className="accent-[#FF5C00] w-4 h-4 cursor-pointer disabled:opacity-40" /></td>
                <td className="py-3 px-4 text-center"><div className="flex items-center justify-center gap-2">
                  <button type="button" disabled={saving||!can(permission)} onClick={()=>openModal(item)} title="Sửa loại tài liệu" aria-label={'Sửa '+item.name} className="p-1 rounded text-slate-500 hover:text-[#FF5C00] hover:bg-slate-100 disabled:opacity-40"><Pencil className="w-4 h-4" /></button>
                  <button type="button" disabled={saving||!can(permission)||used>0} title={used?'Loại đang có tài liệu: dùng Bật / Tắt':'Xóa loại tài liệu'} aria-label={'Xóa '+item.name} onClick={async()=>{
                    if(await confirmAction('Xóa loại tài liệu '+item.name+'?'))void persist(categories.filter(row=>row.id!==item.id));
                  }} className="p-1 rounded text-slate-500 hover:text-rose-500 hover:bg-slate-100 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>;
            })}
            {!filtered.length && <tr><td colSpan={7} className="py-10 px-4 text-center text-slate-500">{categories.length?'Không tìm thấy loại tài liệu phù hợp.':'Chưa có loại tài liệu. Bấm Thêm loại tài liệu để tạo mới.'}</td></tr>}
          </PaginatedTableBody>
        </table>
      </div>
    </CatalogTreeBranch>
    {isModalOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="document-category-title" className="bg-white rounded-2xl max-w-md w-full p-6 font-inter text-xs leading-relaxed shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 id="document-category-title" className="font-semibold text-sm text-slate-800">{editing?'Hiệu chỉnh Loại tài liệu':'Thêm Loại tài liệu Mới'}</h3>
          <button type="button" disabled={saving} onClick={()=>setIsModalOpen(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
          <label className="block font-semibold text-slate-700">Mã loại tài liệu <span className="text-rose-500">*</span>
            <input required disabled={Boolean(editing)||saving} value={code} onChange={event=>setCode(event.target.value)} className={inputClass+' mt-1 font-normal tabular-nums'} />
          </label>
          <label className="block font-semibold text-slate-700">Tên loại tài liệu <span className="text-rose-500">*</span>
            <input required disabled={saving} value={name} onChange={event=>setName(event.target.value)} placeholder="Quy chế / Quy trình / Hướng dẫn" className={inputClass+' mt-1 font-normal'} />
          </label>
          <label className="block font-semibold text-slate-700">Mô tả trường dữ liệu
            <textarea rows={2} disabled={saving} value={description} onChange={event=>setDescription(event.target.value)} className={inputClass+' mt-1 font-normal'} />
          </label>
          <label className="flex gap-2 items-center font-semibold text-slate-700"><input type="checkbox" disabled={saving} checked={isActive} onChange={event=>setIsActive(event.target.checked)} className="accent-[#FF5C00] w-4 h-4" />Đang áp dụng</label>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" disabled={saving} onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer">Hủy</button>
            <button type="submit" disabled={saving||!can(permission)} className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-40">{saving?'Đang lưu...':'Lưu dữ liệu'}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}
