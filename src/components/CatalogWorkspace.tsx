import { useBusinessValue } from '../lib/businessPersistence';
import { PaginatedTableBody } from './Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { CatalogTreeBranch } from './CatalogTreeBranch';
import React, { useEffect, useState } from 'react';
import { FolderPlus, PlusCircle, Search, X, Pencil, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Entry = { id: string; code: string; name: string; desc: string; status: boolean };
type Catalog = { id: string; code: string; name: string; desc: string; parentId?: string; entries: Entry[] };
type Navigation = { id: string; name: string; group: string; count: number };
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
export const CatalogWorkspace: React.FC<{ items: Navigation[]; active: string; onSelect: (id: string) => void; children: React.ReactNode }> = ({ items, active, onSelect, children }) => {
  const { currentUser, roleGroups, showToast } = useApp();
  const { can } = usePermissions();
  const canEdit = can("Tạo danh mục bổ sung và danh mục con");
  const [catalogs, setCatalogs] = useBusinessValue<Catalog[]>('custom_catalogs');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleBranch = (id: string) => setExpandedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [entryQuery, setEntryQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState<'catalog' | 'entry' | null>(null);
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const selected = catalogs.find(item => item.id === selectedId);
  useEffect(() => {
    const ancestors: string[] = []; const seen = new Set<string>(); let id = selectedId;
    while (id && !seen.has(id)) {
      seen.add(id); ancestors.push(id); id = catalogs.find(item => item.id === id)?.parentId || '';
    }
    setExpandedIds(previous => [...new Set([...previous, ...ancestors])]);
  }, [selectedId, catalogs]);
  const persist = (next: Catalog[]) => {
    if (!canEdit) return false;
    try { setCatalogs(next); return true; }
    catch { showToast('Không thể lưu danh mục trong phiên làm việc.', 'error'); return false; }
  };
  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDialog(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [dialog]);
  const open = (kind: 'catalog' | 'entry', entry?: Entry) => {
    setParentId('');
    setEditingId(entry?.id || ''); setCode(entry?.code || ''); setName(entry?.name || ''); setDesc(entry?.desc || ''); setDialog(kind);
  };
  const selectCatalog = (id: string) => { setSelectedId(id); setEntryQuery(''); setStatus('all'); };
  const openChild = () => { open('catalog'); setParentId(selected?.id || active); };
  const selectedChildren = catalogs.filter(item => item.parentId === (selected?.id || active));
  const path: { id: string; name: string }[] = [];
  let ancestor = selected;
  const visited = new Set<string>();
  while (ancestor && !visited.has(ancestor.id)) {
    visited.add(ancestor.id); path.unshift({ id: ancestor.id, name: ancestor.name });
    const builtin = items.find(item => item.id === ancestor?.parentId);
    if (builtin) { path.unshift(builtin); break; }
    ancestor = catalogs.find(item => item.id === ancestor?.parentId);
  }
  const matches = (value: string) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
  const groups = [...new Set(items.map(item => item.group))];
  const rows = (selected?.entries || []).filter(entry => (entry.name + ' ' + entry.code).toLocaleLowerCase('vi').includes(entryQuery.trim().toLocaleLowerCase('vi')) && (status === 'all' || entry.status === (status === 'active')));
  const navClass = (chosen: boolean) => 'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ' + (chosen ? 'bg-orange-50 font-semibold text-orange-700' : 'text-slate-600 hover:bg-slate-50');
  const isRoot = (item: Catalog) => !item.parentId || ![...items, ...catalogs].some(parent => parent.id === item.parentId);
  const branchMatches = (item: Catalog, seen = new Set<string>()): boolean => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return matches(item.name) || catalogs.some(child => child.parentId === item.id && branchMatches(child, seen));
  };
  const renderBranch = (nodes: Catalog[], seen = new Set<string>()): React.ReactNode => nodes.filter(item => !seen.has(item.id) && branchMatches(item)).map(item => {
    const nextSeen = new Set(seen).add(item.id);
    const childNodes = catalogs.filter(child => child.parentId === item.id);
    const isOpen = Boolean(query.trim()) || expandedIds.includes(item.id);
    return <div key={item.id}>
      <div className="flex items-center gap-0.5">
      {childNodes.length > 0 ? <button type="button" aria-label={(isOpen ? 'Thu gọn ' : 'Mở ') + item.name} aria-expanded={isOpen} className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => toggleBranch(item.id)}><ChevronRight className={'h-3.5 w-3.5 transition-transform ' + (isOpen ? 'rotate-90' : '')} /></button> : <span className="w-5 shrink-0" />}
      <button type="button" aria-current={selectedId === item.id ? 'page' : undefined} className={navClass(selectedId === item.id)} onClick={() => selectCatalog(item.id)}><span className="truncate" title={item.name}>{item.name}</span><span className="text-[10px] text-slate-400">{item.entries.length}</span></button></div>
      {isOpen && childNodes.length > 0 && <div className="ml-3 border-l border-slate-200 pl-1">{renderBranch(childNodes, nextSeen)}</div>}
    </div>;
  });
  return <div className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div><h2 className="text-lg font-bold text-slate-900">Danh mục dùng chung</h2><p className="mt-1 text-xs text-slate-500">Quản lý danh mục và các giá trị dùng trong hệ thống.</p></div>
      <button type="button" disabled={!canEdit} className={button + ' border-orange-200 bg-orange-50 text-orange-700'} onClick={() => open('catalog')}><FolderPlus className="h-4 w-4" />Thêm danh mục</button>
    </header>
    <div className="grid items-start gap-3 lg:grid-cols-[235px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-3">
        <label className="relative block"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input aria-label="Tìm loại danh mục" placeholder="Tìm danh mục..." value={query} onChange={event => setQuery(event.target.value)} className={input + ' pl-8'} /></label>
        <nav aria-label="Các danh mục dùng chung" className="mt-3 space-y-3">
          {groups.map(group => <div key={group}><h3 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{group}</h3>
            {items.filter(item => item.group === group && (matches(item.name) || catalogs.some(child => child.parentId === item.id && branchMatches(child)))).map(item => <div key={item.id}><button type="button" aria-current={!selectedId && active === item.id ? 'page' : undefined} className={navClass(!selectedId && active === item.id)} onClick={() => { setSelectedId(''); onSelect(item.id); }}><span>{item.name}</span><span className="text-[10px] text-slate-400">{item.count}</span></button>
              {(active === item.id || expandedIds.includes(item.id) || query.trim()) && <div className="ml-3 border-l border-slate-200 pl-1">{renderBranch(catalogs.filter(child => child.parentId === item.id))}</div>}
            </div>)}
          </div>)}
          <div><h3 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Danh mục bổ sung</h3>
            {renderBranch(catalogs.filter(isRoot))}
            {!catalogs.length && <p className="px-3 py-2 text-[11px] text-slate-400">Thêm danh mục riêng khi cần.</p>}
          </div>
          {query && ![...items, ...catalogs].some(item => matches(item.name)) && <p className="px-3 text-xs text-slate-500">Không tìm thấy danh mục.</p>}
        </nav>
      </aside>
      <main className="min-w-0">
        {selected && <nav aria-label="Đường dẫn danh mục" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">{path.map((item, index) => <React.Fragment key={item.id}>{index > 0 && <span>/</span>}<button type="button" className="rounded px-1 py-1 hover:bg-orange-50 hover:text-orange-700" onClick={() => { if (items.some(builtin => builtin.id === item.id)) { setSelectedId(''); onSelect(item.id); } else selectCatalog(item.id); }}>{item.name}</button></React.Fragment>)}</nav>}
        {(selected || active !== 'incidents') && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">{selectedChildren.length} danh mục con · Chọn nhánh trong cây bên trái</p>
          <button type="button" disabled={!canEdit} className={button} onClick={openChild}><FolderPlus className="h-3.5 w-3.5" />Thêm danh mục con</button>
        </div>}
        {!selected ? children : <CatalogTreeBranch key={selected.id} title={selected.name} code={selected.code} count={selected.entries.length} disabled={!canEdit} addLabel="Thêm giá trị" onAdd={() => open('entry')} revealKey={entryQuery || (status !== 'all' ? status : '')}>
          <div className="space-y-3 p-4">
            <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">Chưa liên kết phân hệ · Danh mục này hiện lưu trên trình duyệt. Tạo danh mục con chỉ phân loại dữ liệu, chưa thêm trường vào biểu mẫu nghiệp vụ.</p>
            <div className="flex flex-wrap gap-2"><input aria-label="Tìm giá trị danh mục" placeholder="Tìm theo mã hoặc tên..." value={entryQuery} onChange={event => setEntryQuery(event.target.value)} className={input + ' max-w-sm'} /><select aria-label="Lọc trạng thái giá trị" value={status} onChange={event => setStatus(event.target.value)} className={input + ' max-w-44'}><option value="all">Tất cả trạng thái</option><option value="active">Đang áp dụng</option><option value="inactive">Tạm dừng</option></select></div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{['Mã', 'Tên giá trị', 'Mô tả', 'Trạng thái', 'Thao tác'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead><PaginatedTableBody className="divide-y divide-slate-100">
            {rows.map(entry => <tr key={entry.id}><td className="px-4 py-3 font-mono text-orange-700">{entry.code}</td><td className="px-4 py-3 font-semibold text-slate-800">{entry.name}</td><td className="px-4 py-3 text-slate-500">{entry.desc || '—'}</td><td className="px-4 py-3"><label className="inline-flex items-center gap-2 whitespace-nowrap"><input type="checkbox" disabled={!canEdit} checked={entry.status} onChange={event => persist(catalogs.map(item => item.id === selected.id ? { ...item, entries: item.entries.map(row => row.id === entry.id ? { ...row, status: event.target.checked } : row) } : item))} className="accent-orange-600" />{entry.status ? 'Đang áp dụng' : 'Tạm dừng'}</label></td><td className="px-4 py-3"><button type="button" disabled={!canEdit} aria-label={'Sửa ' + entry.name} className={button} onClick={() => open('entry', entry)}><Pencil className="h-3.5 w-3.5" />Sửa</button></td></tr>)}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">{selected.entries.length ? 'Không có giá trị phù hợp bộ lọc.' : 'Chưa có giá trị. Chọn “Thêm giá trị” để bắt đầu.'}</td></tr>}
          </PaginatedTableBody></table></div>
          <p className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">{rows.length}/{selected.entries.length} giá trị</p>
        </CatalogTreeBranch>}
      </main>
    </div>
    {dialog && canEdit && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="catalog-dialog-title">
      <form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onSubmit={event => {
        event.preventDefault();
        const normalizedCode = code.trim().toUpperCase(), normalizedName = name.trim();
        if (!normalizedCode || !normalizedName) { showToast('Nhập mã và tên hợp lệ.', 'warning'); return; }
        const existing = dialog === 'catalog' ? catalogs.filter(item => (item.parentId || '') === parentId) : selected?.entries || [];
        if (existing.some(item => item.id !== editingId && (item.code.toUpperCase() === normalizedCode || item.name.toLocaleLowerCase('vi') === normalizedName.toLocaleLowerCase('vi')))) { showToast('Mã hoặc tên đã tồn tại trong danh mục.', 'warning'); return; }
        if (dialog === 'catalog' && !parentId && items.some(item => item.name.toLocaleLowerCase('vi') === normalizedName.toLocaleLowerCase('vi'))) { showToast('Danh mục hệ thống đã có tên này. Hãy chọn danh mục bên trái để thêm giá trị.', 'warning'); return; }
        if (dialog === 'catalog') {
          const catalog = { id: crypto.randomUUID(), code: normalizedCode, name: normalizedName, desc: desc.trim(), parentId: parentId || undefined, entries: [] };
          if (!persist([...catalogs, catalog])) return;
          setSelectedId(catalog.id); setQuery(''); setEntryQuery(''); setStatus('all');
        } else {
          if (!selected) return;
          const entry = { id: editingId || crypto.randomUUID(), code: normalizedCode, name: normalizedName, desc: desc.trim(), status: selected.entries.find(item => item.id === editingId)?.status ?? true };
          if (!persist(catalogs.map(item => item.id === selected.id ? { ...item, entries: editingId ? item.entries.map(row => row.id === editingId ? entry : row) : [...item.entries, entry] } : item))) return;
        }
        setDialog(null); showToast(dialog === 'catalog' ? 'Đã thêm danh mục. Bạn có thể thêm các giá trị bên trong.' : 'Đã lưu giá trị danh mục.', 'success');
      }}>
        <div className="flex items-center justify-between"><h3 id="catalog-dialog-title" className="text-sm font-bold text-slate-800">{dialog === 'catalog' ? parentId ? 'Thêm danh mục con' : 'Thêm danh mục' : editingId ? 'Sửa giá trị' : 'Thêm giá trị'}</h3><button type="button" aria-label="Đóng" onClick={() => setDialog(null)}><X className="h-4 w-4" /></button></div>
        {dialog === 'catalog' && <>
          <p className="text-xs text-slate-500">Chọn danh mục cha để tạo nhánh con, hoặc chọn cấp cao nhất để tạo danh mục độc lập.</p>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-600"><span>Danh mục cha</span><select value={parentId} onChange={event => setParentId(event.target.value)} className={input}>
            <option value="">Không có — Danh mục cấp cao nhất</option>
            {items.map(item => <option key={item.id} value={item.id}>{item.group} / {item.name}</option>)}
            {catalogs.map(item => {
              const names = [item.name]; const seen = new Set([item.id]); let ancestorId = item.parentId;
              while (ancestorId && !seen.has(ancestorId)) {
                seen.add(ancestorId);
                const parent = [...items, ...catalogs].find(row => row.id === ancestorId);
                if (!parent) break;
                names.unshift(parent.name); ancestorId = 'parentId' in parent ? parent.parentId : undefined;
              }
              return <option key={item.id} value={item.id}>{names.join(' / ')}</option>;
            })}
          </select></label>
        </>}
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600"><span>Mã *</span><input autoFocus required maxLength={40} pattern="[A-Za-z0-9_-]+" title="Dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới." value={code} onChange={event => setCode(event.target.value)} className={input} placeholder={dialog === 'catalog' ? 'NGUON_TUYEN_SINH' : 'GIOI_THIEU'} /></label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600"><span>Tên *</span><input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={input} /></label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600"><span>Mô tả</span><textarea rows={3} maxLength={500} value={desc} onChange={event => setDesc(event.target.value)} className={input} /></label>
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDialog(null)}>Hủy</button><button type="submit" className={button + ' border-orange-600 bg-orange-600 text-white hover:bg-orange-700'}>Lưu</button></div>
      </form>
    </div>}
  </div>;
};
