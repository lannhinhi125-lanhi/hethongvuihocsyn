import {useState} from 'react';
import type {DocumentCategory} from '../types';
import {useBusinessValue,waitForBusinessSave} from '../lib/businessPersistence';
import {usePermissions} from '../hooks/usePermissions';
import {useApp} from '../context/AppContext';
import {PaginatedList} from './Pagination';

export function DocumentCategoryManager({onClose,onCreated}:{onClose:()=>void;onCreated:(id:string)=>void}) {
  const [categories,setCategories]=useBusinessValue<DocumentCategory[]>('document_categories');
  const {sopDocuments,showToast}=useApp();
  const {can,requirePermission}=usePermissions();
  const permission='Quản lý kho tài liệu tri thức SOP';
  const [editing,setEditing]=useState<string|null>(null);
  const [code,setCode]=useState('');const [name,setName]=useState('');const [description,setDescription]=useState('');
  const [isActive,setIsActive]=useState(true);const [saving,setSaving]=useState(false);
  const reset=()=>{setEditing(null);setCode('');setName('');setDescription('');setIsActive(true);};
  const persist=async(next:DocumentCategory[],after?:()=>void)=>{
    if(saving || !requirePermission(permission))return;
    setSaving(true);
    try{setCategories(next);await waitForBusinessSave();after?.();showToast('Đã lưu danh mục loại tài liệu.','success');}
    catch(error){showToast(error instanceof Error ? error.message : 'Chưa lưu được loại tài liệu.','error');}
    finally{setSaving(false);}
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
    <section role="dialog" aria-modal="true" aria-label="Quản lý loại tài liệu" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center"><h3 className="font-bold">Quản lý loại tài liệu</h3><button type="button" disabled={saving} onClick={onClose} className="rounded border px-3 py-1 text-sm">Đóng</button></div>
      <form className="grid grid-cols-2 gap-3 rounded-xl border p-3" onSubmit={event=>{
        event.preventDefault();const id=code.trim();const label=name.trim();if(!id || !label)return;
        if(categories.some(item=>(item.id===id || item.name.toLocaleLowerCase('vi')===label.toLocaleLowerCase('vi')) && item.id!==editing)){showToast('Mã hoặc tên loại tài liệu đã tồn tại.','error');return;}
        const row={id,name:label,description:description.trim(),isActive};
        void persist(editing ? categories.map(item=>item.id===editing?row:item) : [...categories,row],()=>{if(!editing && isActive)onCreated(id);reset();});
      }}>
        <label className="text-sm">Mã loại<input required disabled={Boolean(editing)||saving||!can(permission)} value={code} onChange={event=>setCode(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">Tên loại<input required disabled={saving||!can(permission)} value={name} onChange={event=>setName(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="col-span-2 text-sm">Mô tả<textarea disabled={saving||!can(permission)} value={description} onChange={event=>setDescription(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox" disabled={saving||!can(permission)} checked={isActive} onChange={event=>setIsActive(event.target.checked)} />Đang sử dụng</label>
        <div className="flex justify-end gap-2"><button type="button" onClick={reset} disabled={saving} className="rounded border px-3 py-2 text-xs">Nhập mới</button><button disabled={saving||!can(permission)} className="rounded bg-orange-500 px-3 py-2 text-xs font-bold text-white">{saving?'Đang lưu...':editing?'Lưu sửa':'Thêm loại'}</button></div>
      </form>
      <PaginatedList className="space-y-2">{categories.map(item=>{
        const used=sopDocuments.filter(doc=>doc.categoryId===item.id).length;
        return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
          <div><div className="font-semibold">{item.name}</div><div className="text-xs text-slate-500">{item.id} · {used} tài liệu · {item.isActive?'Đang sử dụng':'Ngừng sử dụng'}</div></div>
          <div className="flex flex-wrap justify-end gap-2 text-xs">
            <button type="button" disabled={saving||!can(permission)} onClick={()=>{setEditing(item.id);setCode(item.id);setName(item.name);setDescription(item.description);setIsActive(item.isActive);}} className="rounded border px-2 py-1">Sửa</button>
            <button type="button" disabled={saving||!can(permission)} onClick={()=>void persist(categories.map(row=>row.id===item.id?{...row,isActive:!row.isActive}:row))} className="rounded border px-2 py-1">{item.isActive?'Ngừng sử dụng':'Sử dụng lại'}</button>
            <button type="button" disabled={saving||!can(permission)||used>0} title={used?'Loại đang có tài liệu: dùng Ngừng sử dụng':undefined} onClick={()=>{if(window.confirm('Xóa loại tài liệu chưa được sử dụng?'))void persist(categories.filter(row=>row.id!==item.id),()=>{if(editing===item.id)reset();});}} className="rounded border px-2 py-1 text-red-600 disabled:opacity-40">Xóa</button>
          </div>
        </div>;
      })}</PaginatedList>
      {!categories.length && <p className="text-sm text-slate-500">Chưa có loại tài liệu. Thêm loại trước khi tạo tài liệu.</p>}
    </section>
  </div>;
}
