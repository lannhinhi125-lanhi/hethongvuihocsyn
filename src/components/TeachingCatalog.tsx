import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import { PaginatedList } from './Pagination';
import { PaginatedTableBody } from './Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { CatalogTreeBranch } from './CatalogTreeBranch';
import React, { useState } from 'react';
import { catalogTree, parseCatalogTree } from '../lib/catalogTree';
import { useApp } from '../context/AppContext';
export const TeachingCatalog: React.FC = () => {
  const {confirmSave,isSavingChanges}=useSaveConfirmation('business');
  const { teachingCategories, setTeachingCategories, currentUser, roleGroups, showToast } = useApp();
  const { can } = usePermissions();
  const canEdit = can("Cấu hình Cấp học & Lớp dạy");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [options, setOptions] = useState(''); const [opened, setOpened] = useState(false);
  return <div className="space-y-3">
    <div className="flex justify-between items-center"><h3 className="font-bold">Cấp học & Lớp dạy</h3><button disabled={!canEdit} onClick={() => { setEditingId(null); setCode(''); setName(''); setOptions(''); setOpened(true); }} className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700 disabled:opacity-40">Thêm cấp học</button></div>
    <p className="text-xs text-slate-500">Dùng chung khi thêm, sửa và lọc hồ sơ giáo viên, học sinh và lớp học.</p>
    <PaginatedList className="space-y-3">{teachingCategories.map(category => <CatalogTreeBranch key={category.id} title={category.name} code={category.id} count={category.options.length}
      actions={<label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><input type="checkbox" disabled={!canEdit} checked={category.status !== false} className="accent-orange-600" onChange={event => { if (canEdit) setTeachingCategories(previous => previous.map(item => item.id === category.id ? { ...item, status: event.target.checked } : item)); }} />Đang dùng</label>}
      disabled={!canEdit} addLabel="Sửa / Thêm lớp" onAdd={() => { setEditingId(category.id); setCode(category.id); setName(category.name); setOptions(catalogTree(category.options).map(item => item.treeLabel).join('\n')); setOpened(true); }}>
      <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[11px] text-slate-600"><tr><th scope="col" className="px-3 py-2.5">Mã lớp dạy</th><th scope="col" className="px-3 py-2.5">Tên lớp dạy</th></tr></thead>
        <PaginatedTableBody className="divide-y divide-slate-100">{catalogTree(category.options).map(option => <tr key={option.id} className="hover:bg-slate-50"><td className="px-3 py-2.5 text-slate-400">{option.id}</td><td className="px-3 py-2.5 font-medium text-slate-800">{option.treeLabel}</td></tr>)}
        {!category.options.length && <tr><td colSpan={2} className="p-5 text-center text-slate-400">Chưa có lớp dạy. Chọn “Sửa / Thêm lớp” để bổ sung.</td></tr>}</PaginatedTableBody>
      </table>
    </CatalogTreeBranch>)}</PaginatedList>
    {opened && canEdit && <div className="fixed inset-0 z-[110] bg-slate-900/50 flex items-center justify-center p-4"><form className="bg-white p-6 rounded-2xl w-full max-w-lg space-y-3" onSubmit={e => {
      e.preventDefault(); if (isSavingChanges || !canEdit) return;
      let nodes;
      try { nodes = parseCatalogTree(options, teachingCategories.find(c => c.id === editingId)?.options); }
      catch (error) { showToast((error as Error).message, 'error'); return; }
      const names = nodes.map(item => item.label); const id = code.trim().toUpperCase();
      if (!id || !name.trim() || !names.length || teachingCategories.some(c => c.id === id && c.id !== editingId)) { showToast('Mã phải duy nhất, tên và danh sách lớp không được trống.', 'error'); return; }
      const existing = teachingCategories.find(c => c.id === editingId);
      const category = { id, name: name.trim(), status: existing?.status ?? true, options: nodes };
      setTeachingCategories(prev => editingId ? prev.map(c => c.id === editingId ? category : c) : [...prev, category]); void confirmSave(()=>setOpened(false));
    }}>
      <h3 className="font-bold">{editingId ? 'Sửa cấp học & lớp dạy' : 'Thêm cấp học & lớp dạy'}</h3>
      <label className="block text-xs">Mã cấp học<input required readOnly={Boolean(editingId)} value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <label className="block text-xs">Tên cấp học<input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <label className="block text-xs">Lớp dạy (mỗi dòng một lớp)<textarea required rows={8} value={options} onChange={e => setOptions(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <p className="text-xs text-slate-500">Nhập “- Tên mục” cho cấp 1, “-- Tên mục con” cho cấp 2, “--- Tên mục con” cho cấp 3.</p>
      <button type="button" onClick={() => setOpened(false)} className="p-2 border rounded-lg">Đóng</button><button type="submit" disabled={isSavingChanges} className="ml-2 p-2 bg-orange-600 text-white rounded-lg">Lưu danh mục</button>
    </form></div>}
  </div>;
};
