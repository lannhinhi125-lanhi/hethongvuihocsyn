import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import { PaginatedTableBody, PaginatedTableGroups } from './Pagination';
import { usePermissions } from '../hooks/usePermissions';
import React, { useEffect, useState } from 'react';
import { FolderPlus, PlusCircle, Pencil, X, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { SubIncidentItem } from '../types';

const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-orange-500 focus:outline-none';
const button = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40';
const notices = { unspecified: 'Chưa phân loại', advance: 'Có báo trước', unannounced: 'Không báo trước' };
export const IncidentCatalog: React.FC = () => {
  const {confirmSave,isSavingChanges}=useSaveConfirmation('business');
  const { incidents, setIncidents, currentUser, roleGroups, showToast } = useApp();
  const { can, requirePermission } = usePermissions();
  const canConfigure = can('Cấu hình Danh mục Sự cố & Vi phạm ca học');
  const canCoefficient = can('Cấu hình hệ số công theo sự cố');
  const canEdit = canConfigure || canCoefficient;
  const [expanded, setExpanded] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState<'group' | 'incident' | null>(null);
  const [editingId, setEditingId] = useState('');
  const [parentId, setParentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [party, setParty] = useState<SubIncidentItem['targetParty']>('Giáo viên');
  const [notice, setNotice] = useState<NonNullable<SubIncidentItem['noticeType']>>('unspecified');
  const [coefficient, setCoefficient] = useState('');
  const allRows = incidents.flatMap(parent => parent.subIncidents.map(item => ({ parent, item })));
  const rows = allRows.filter(({ parent, item }) => (!group || parent.id === group) &&
    (item.name + ' ' + item.code + ' ' + parent.name).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')) &&
    (filter === 'all' || (filter === 'missing' ? item.creditCoeff === undefined : filter === 'active' ? item.status : !item.status)));
  const visibleGroups = incidents.filter(parent => (!group || parent.id === group) && (
    rows.some(row => row.parent.id === parent.id) ||
    (filter === 'all' && (parent.name + ' ' + parent.code).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
  ));
  useEffect(() => {
    if (query.trim() || group || filter !== 'all') {
      setExpanded(incidents.filter(parent => !group || parent.id === group).map(parent => parent.id));
    }
  }, [query, group, filter]);
  const toggleGroup = (id: string) => setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const editGroup = (id: string) => {
    if (!requirePermission('Cấu hình Danh mục Sự cố & Vi phạm ca học')) return;
    const parent = incidents.find(item => item.id === id);
    if (!parent) return;
    setEditingId(parent.id); setCode(parent.code); setName(parent.name); setDesc(parent.desc || ''); setDialog('group');
  };
  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDialog(null); };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, [dialog]);
  const open = (kind: 'group' | 'incident', item?: SubIncidentItem, parent?: string) => {
    if ((kind === 'group' || !item) && !requirePermission('Cấu hình Danh mục Sự cố & Vi phạm ca học')) return;
    setEditingId(item?.id || ''); setParentId(parent || group || incidents[0]?.id || '');
    setCode(item?.code || ''); setName(item?.name || ''); setDesc(item?.desc || '');
    setParty(item?.targetParty || 'Giáo viên'); setNotice(item?.noticeType || 'unspecified');
    setCoefficient(item?.creditCoeff === undefined ? '' : String(item.creditCoeff)); setDialog(kind);
  };
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
      <div><h3 className="text-sm font-bold text-slate-800">Sự cố & Hệ số công</h3><p className="mt-1 text-[11px] text-slate-500">Bấm nhóm để xổ các sự cố con và cấu hình hệ số công.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!canConfigure} className={button} onClick={() => open('group')}><FolderPlus className="h-3.5 w-3.5" />Thêm nhóm</button><button type="button" disabled={!canConfigure || !incidents.length} className={button + ' border-orange-200 bg-orange-50 text-orange-700'} onClick={() => open('incident')}><PlusCircle className="h-3.5 w-3.5" />Thêm sự cố</button></div>
    </header>
    <div className="space-y-2 border-b border-slate-100 p-3">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Tìm sự cố" placeholder="Tìm mã, tên sự cố..." value={query} onChange={event => setQuery(event.target.value)} className={input + ' min-w-40 flex-1'} />
        <select aria-label="Lọc nhóm sự cố" value={group} onChange={event => setGroup(event.target.value)} className={input + ' sm:max-w-64'}><option value="">Tất cả nhóm ({incidents.length})</option>{incidents.map(parent => <option key={parent.id} value={parent.id}>{parent.name} ({parent.subIncidents.length})</option>)}</select>
        <select aria-label="Lọc cấu hình sự cố" value={filter} onChange={event => setFilter(event.target.value)} className={input + ' sm:max-w-44'}><option value="all">Tất cả trạng thái</option><option value="missing">Chưa có hệ số</option><option value="active">Đang áp dụng</option><option value="inactive">Tạm dừng</option></select>
      </div>
      <p className="text-[11px] text-slate-500"><strong className="text-slate-700">0</strong> = không tính công · <strong className="text-slate-700">0,5</strong> = nửa công · <strong className="text-slate-700">1</strong> = một công. Chưa thiết lập được hiển thị riêng, không mặc định thành 0.</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs">
      <thead className="bg-slate-50 text-[11px] text-slate-600"><tr>{['Nhóm / Loại sự cố', 'Bên phát sinh', 'Báo trước', 'Hệ số công', 'Áp dụng', ''].map((label, index) => <th scope="col" key={index} className="whitespace-nowrap px-3 py-2.5">{label}</th>)}</tr></thead>
      <PaginatedTableGroups>{visibleGroups.map(parent => {
          const children = rows.filter(row => row.parent.id === parent.id);
          const isOpen = expanded.includes(parent.id);
          return <React.Fragment key={parent.id}><tbody>
            <tr className="bg-slate-50/80">
              <th scope="row" colSpan={5} className="px-3 py-2.5 text-left">
                <button type="button" aria-expanded={isOpen} aria-controls={'incident-group-' + parent.id} onClick={() => toggleGroup(parent.id)} className="flex w-full items-center gap-2 text-left">
                  <ChevronRight className={'h-4 w-4 shrink-0 text-slate-500 transition-transform ' + (isOpen ? 'rotate-90' : '')} />
                  <span className="text-xs font-semibold text-slate-800">{parent.name}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-normal text-slate-500">{children.length}{children.length !== parent.subIncidents.length ? '/' + parent.subIncidents.length : ''} sự cố</span>
                  <span className="hidden text-[10px] font-normal text-slate-400 lg:inline">{parent.code}</span>
                </button>
              </th>
              <td className="px-3 py-2"><div className="flex items-center gap-1">
                <button type="button" disabled={!canConfigure} title="Thêm sự cố vào nhóm này" aria-label={'Thêm sự cố vào ' + parent.name} className={button + ' whitespace-nowrap'} onClick={() => open('incident', undefined, parent.id)}><PlusCircle className="h-3 w-3" />Thêm con</button>
                <button type="button" disabled={!canConfigure} title="Sửa nhóm" aria-label={'Sửa nhóm ' + parent.name} className="rounded p-1.5 text-slate-500 hover:bg-white disabled:opacity-40" onClick={() => editGroup(parent.id)}><Pencil className="h-3.5 w-3.5" /></button>
              </div></td>
            </tr>
            </tbody><PaginatedTableBody id={'incident-group-' + parent.id} hidden={!isOpen} className="divide-y divide-slate-100">
                {children.map(({ item }) => <tr key={item.id} className="hover:bg-slate-50">
        <td className="border-l-2 border-orange-100 py-2.5 pl-8 pr-3"><button type="button" disabled={!canEdit} onClick={() => open('incident', item, parent.id)} className="text-left font-semibold text-slate-800 hover:text-orange-700">{item.name}</button><p className="mt-1 text-[10px] text-slate-400">{item.code}</p></td>
        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{item.targetParty}</td>
        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{notices[item.noticeType || 'unspecified']}</td>
        <td className="whitespace-nowrap px-3 py-2.5">{item.creditCoeff === undefined ? <span className="text-[11px] text-amber-700">Chưa thiết lập</span> : <span className="rounded bg-orange-50 px-2 py-1 font-bold tabular-nums text-orange-700">{item.creditCoeff.toLocaleString('vi-VN')} công</span>}</td>
        <td className="px-3 py-2.5"><input type="checkbox" aria-label={'Áp dụng ' + item.name} checked={item.status} disabled={!canConfigure} className="accent-orange-600" onChange={event => { if (canEdit) setIncidents(previous => previous.map(category => category.id === parent.id ? { ...category, subIncidents: category.subIncidents.map(row => row.id === item.id ? { ...row, status: event.target.checked } : row) } : category)); }} /></td>
        <td className="px-3 py-2.5"><button type="button" className={button} disabled={!canEdit} onClick={() => open('incident', item, parent.id)} aria-label={'Sửa sự cố và hệ số: ' + item.name}><Pencil className="h-3 w-3" />Sửa</button></td>
      </tr>)}
                {!children.length && <tr><td colSpan={6} className="py-5 pl-9 pr-3 text-xs text-slate-400">{parent.subIncidents.length ? 'Không có sự cố phù hợp bộ lọc trong nhóm này.' : 'Chưa có sự cố con. Chọn “Thêm con” để thiết lập sự cố và hệ số.'}</td></tr>}
            </PaginatedTableBody>
          </React.Fragment>;
        })}</PaginatedTableGroups>
        {!visibleGroups.length && <tbody><tr><td colSpan={6} className="p-8 text-center text-slate-500">{incidents.length ? 'Không có nhóm phù hợp. Thử đổi từ khóa hoặc bộ lọc.' : 'Chưa có nhóm sự cố. Chọn “Thêm nhóm” để bắt đầu.'}</td></tr></tbody>}
      </table></div>
    <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2">
      <button type="button" className="text-[11px] font-semibold text-slate-500 hover:text-orange-700" onClick={() => setExpanded(visibleGroups.map(parent => parent.id))}>Mở tất cả</button>
      <button type="button" className="text-[11px] font-semibold text-slate-500 hover:text-orange-700" onClick={() => setExpanded([])}>Thu gọn tất cả</button>
    </div>
    <footer className="border-t border-slate-100 p-3 text-[11px] text-slate-500">{visibleGroups.length}/{incidents.length} nhóm · {rows.length}/{allRows.length} loại sự cố · Cấu hình hệ số không tự sửa công của các buổi đã ghi nhận.</footer>
    {dialog && canEdit && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="incident-config-title">
      <form className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto rounded-2xl bg-white p-5 shadow-xl" onSubmit={event => {
        event.preventDefault();if(isSavingChanges)return; if (!canEdit) return;
        if (dialog === 'group' && !requirePermission('Cấu hình Danh mục Sự cố & Vi phạm ca học')) return;
        const normalizedCode = code.trim().toUpperCase(), normalizedName = name.trim();
        if (!normalizedCode || !normalizedName) { showToast('Nhập mã và tên hợp lệ.', 'warning'); return; }
        if (dialog === 'group') {
          if (incidents.some(parent => parent.id !== editingId && (parent.code.toUpperCase() === normalizedCode || parent.name.toLocaleLowerCase('vi') === normalizedName.toLocaleLowerCase('vi')))) { showToast('Mã hoặc tên nhóm đã tồn tại.', 'warning'); return; }
          const id = editingId || crypto.randomUUID();
          setIncidents(previous => editingId ? previous.map(parent => parent.id === editingId ? { ...parent, code: normalizedCode, name: normalizedName, desc: desc.trim() } : parent) : [...previous, { id, code: normalizedCode, name: normalizedName, desc: desc.trim(), subIncidents: [] }]);
          setGroup(''); setQuery(''); setFilter('all'); setExpanded(previous => [...previous.filter(value => value !== id), id]);
        } else {
          if (!incidents.some(parent => parent.id === parentId)) { showToast('Chọn nhóm sự cố.', 'warning'); return; }
          const value = coefficient.trim() === '' ? undefined : Number(coefficient);
          if (value !== undefined && (!Number.isFinite(value) || Math.abs(value) > 999.999)) { showToast('Hệ số công phải là số từ -999.999 đến 999.999.', 'warning'); return; }
          if (allRows.some(({ parent, item }) => item.id !== editingId && (item.code.toUpperCase() === normalizedCode || (parent.id === parentId && item.name.toLocaleLowerCase('vi') === normalizedName.toLocaleLowerCase('vi'))))) { showToast('Mã sự cố hoặc tên trong nhóm đã tồn tại.', 'warning'); return; }
          const existing = allRows.find(({ item }) => item.id === editingId)?.item;
          const item: SubIncidentItem = { ...existing, id: editingId || crypto.randomUUID(), code: normalizedCode, name: normalizedName, desc: desc.trim(), targetParty: party, status: existing?.status ?? true, noticeType: notice, creditCoeff: value };
          if (!canConfigure && existing) { Object.assign(item, existing); item.creditCoeff = value; }
          setIncidents(previous => previous.map(parent => {
            const remaining = parent.subIncidents.filter(row => row.id !== editingId);
            return { ...parent, subIncidents: parent.id === parentId ? [...remaining, item] : remaining };
          }));
          setExpanded(previous => previous.includes(parentId) ? previous : [...previous, parentId]);
        }
        void confirmSave(()=>{setDialog(null); showToast('Đã lưu cấu hình danh mục sự cố.', 'success');});
      }}>
        <div className="flex items-center justify-between"><h3 id="incident-config-title" className="text-sm font-bold text-slate-800">{dialog === 'group' ? editingId ? 'Sửa nhóm sự cố' : 'Thêm nhóm sự cố' : editingId ? 'Sửa sự cố & Hệ số công' : 'Thêm sự cố & Hệ số công'}</h3><button type="button" aria-label="Đóng cấu hình sự cố" onClick={() => setDialog(null)}><X className="h-4 w-4" /></button></div>
        {dialog === 'incident' && <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Nhóm sự cố *</span><select required disabled={!canConfigure} value={parentId} onChange={event => setParentId(event.target.value)} className={input}>{incidents.map(parent => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Mã *</span><input autoFocus required maxLength={40} disabled={!canConfigure} value={code} onChange={event => setCode(event.target.value)} className={input} /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Tên *</span><input required maxLength={150} disabled={!canConfigure} value={name} onChange={event => setName(event.target.value)} className={input} /></label>
        </div>
        {dialog === 'incident' && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Bên phát sinh</span><select disabled={!canConfigure} value={party} onChange={event => setParty(event.target.value as SubIncidentItem['targetParty'])} className={input}><option>Giáo viên</option><option>Học sinh</option><option>Khách quan</option></select></label>
            <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Tình trạng báo trước</span><select disabled={!canConfigure} value={notice} onChange={event => setNotice(event.target.value as typeof notice)} className={input}>{Object.entries(notices).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Hệ số công cho loại sự cố này</span><input type="number" min="-999.999" max="999.999" step="0.001" disabled={!canCoefficient} value={coefficient} onChange={event => setCoefficient(event.target.value)} placeholder="Chưa thiết lập" className={input} /><span className="block text-[11px] font-normal text-slate-500">Ví dụ: học sinh không báo trước, gia sư đã chờ → 0,5 công; giáo viên nghỉ không báo trước: -1 công. Để trống nếu chưa quyết định quy tắc.</span></label>
          <p className="rounded-lg bg-orange-50 p-2.5 text-[11px] text-orange-800">Hệ số thuộc loại sự cố cụ thể bạn chọn. Nhóm chỉ dùng để phân loại; không có hệ số chung tự áp xuống các sự cố con.</p>
        </>}
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>{dialog === 'incident' ? 'Điều kiện áp dụng / Ghi chú' : 'Mô tả nhóm'}</span><textarea rows={2} maxLength={500} disabled={!canConfigure} value={desc} onChange={event => setDesc(event.target.value)} className={input} placeholder={dialog === 'incident' ? 'Ví dụ: gia sư đã vào phòng và chờ đủ thời gian quy định.' : ''} /></label>
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDialog(null)}>Hủy</button><button type="submit" disabled={isSavingChanges} className={button + ' border-orange-600 bg-orange-600 text-white hover:bg-orange-700'}>Lưu cấu hình</button></div>
      </form>
    </div>}
  </section>;
};
