import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
export const TeachingCatalog: React.FC = () => {
  const { teachingCategories, setTeachingCategories, currentUser, roleGroups, showToast } = useApp();
  const canEdit = currentUser.status === 'active' && (currentUser.role === 'Quản trị Toàn quyền' || Boolean(roleGroups.find(role => role.name === currentUser.role)?.permissions.some(p => ['ALL', 'PH2_ALL'].includes(p))));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [options, setOptions] = useState(''); const [opened, setOpened] = useState(false);
  return <div className="space-y-4">
    <div className="flex justify-between items-center"><h3 className="font-bold">Cấp học & Lớp dạy</h3><button disabled={!canEdit} onClick={() => { setEditingId(null); setCode(''); setName(''); setOptions(''); setOpened(true); }} className="px-3 py-2 rounded-xl bg-orange-600 text-white disabled:opacity-40">Thêm danh mục</button></div>
    <p className="text-xs text-slate-500">Dùng chung khi thêm, sửa và lọc hồ sơ giáo viên.</p>
    {teachingCategories.map(category => <div key={category.id} className="bg-white p-4 border border-slate-200 rounded-xl space-y-2">
      <div className="flex justify-between"><strong>{category.name} <span className="text-xs text-slate-400">{category.id}</span></strong><div className="flex gap-3 text-xs">
        <label><input type="checkbox" disabled={!canEdit} checked={category.status !== false} onChange={e => { if (canEdit) setTeachingCategories(prev => prev.map(c => c.id === category.id ? { ...c, status: e.target.checked } : c)); }} /> Đang dùng</label>
        <button disabled={!canEdit} onClick={() => { setEditingId(category.id); setCode(category.id); setName(category.name); setOptions(category.options.map(o => o.label).join('\n')); setOpened(true); }}>Chỉnh sửa</button>
      </div></div>
      <div className="flex flex-wrap gap-2">{category.options.map(option => <span key={option.id} className="text-xs px-2 py-1 rounded bg-slate-100">{option.label}</span>)}</div>
    </div>)}
    {opened && canEdit && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"><form className="bg-white p-6 rounded-2xl w-full max-w-lg space-y-3" onSubmit={e => {
      e.preventDefault(); if (!canEdit) return;
      const names = Array.from(new Set(options.split(/\r?\n/).map(value => value.trim()).filter(Boolean))); const id = code.trim().toUpperCase();
      if (!id || !name.trim() || !names.length || teachingCategories.some(c => c.id === id && c.id !== editingId)) { showToast('Mã phải duy nhất, tên và danh sách lớp không được trống.', 'error'); return; }
      const existing = teachingCategories.find(c => c.id === editingId);
      const category = { id, name: name.trim(), status: existing?.status ?? true, options: names.map(label => ({ id: existing?.options.find(o => o.label === label)?.id || label, label })) };
      setTeachingCategories(prev => editingId ? prev.map(c => c.id === editingId ? category : c) : [...prev, category]); setOpened(false);
    }}>
      <h3 className="font-bold">{editingId ? 'Sửa danh mục lớp dạy' : 'Thêm danh mục lớp dạy'}</h3>
      <label className="block text-xs">Mã cấp học<input required readOnly={Boolean(editingId)} value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <label className="block text-xs">Tên cấp học<input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <label className="block text-xs">Lớp dạy (mỗi dòng một lớp)<textarea required rows={8} value={options} onChange={e => setOptions(e.target.value)} className="w-full border p-2 rounded-lg" /></label>
      <button type="button" onClick={() => setOpened(false)} className="p-2 border rounded-lg">Đóng</button><button type="submit" className="ml-2 p-2 bg-orange-600 text-white rounded-lg">Lưu danh mục</button>
    </form></div>}
  </div>;
};
