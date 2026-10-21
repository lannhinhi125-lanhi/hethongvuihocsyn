import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import { DocumentCategoryManager } from '../components/DocumentCategoryManager';
import { useBusinessValue } from '../lib/businessPersistence';
import type { DocumentCategory } from '../types';
import { confirmAction } from '../components/ConfirmAction';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import { CatalogTreeBranch } from '../components/CatalogTreeBranch';
import { IncidentCatalog } from '../components/IncidentCatalog';
import { CatalogWorkspace } from '../components/CatalogWorkspace';
import { TeachingCatalog } from '../components/TeachingCatalog';
import { ClassDurationCatalog } from '../components/ClassDurationCatalog';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IncidentCategory } from '../types';
import {
  BookOpen,
  BarChart3,
  Clock,
  Hourglass,
  Users2,
  GitFork,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Search,
  FolderPlus
} from 'lucide-react';

export const Module2_MasterData: React.FC = () => {
  const {confirmSave,isSavingChanges}=useSaveConfirmation('business');
  const { can, requirePermission } = usePermissions();
  const {
    teachingCategories,
    subjects,
    setSubjects,
    levels,
    setLevels,
    timeSlots,
    setTimeSlots,
    models,
    setModels,
    incidents,
    setIncidents,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'subjects' | 'levels' | 'times' | 'models' | 'incidents' | 'teaching' | 'document-types' | 'durations'>('subjects');
  const [documentCategories] = useBusinessValue<DocumentCategory[]>('document_categories');
  const [durationCatalogs]=useBusinessValue<{code:string;name:string;entries:unknown[]}[]>('custom_catalogs');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subCode, setSubCode] = useState('');
  const [subAbbr, setSubAbbr] = useState('');
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [lvlCode, setLvlCode] = useState('');
  const [lvlAbbr, setLvlAbbr] = useState('');
  const [lvlName, setLvlName] = useState('');
  const [lvlTarget, setLvlTarget] = useState('');
  const [lvlObjective, setLvlObjective] = useState('');

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotCode, setSlotCode] = useState('');
  const [slotName, setSlotName] = useState('');
  const [slotRange, setSlotRange] = useState('18:00 - 19:30');
  const [slotDuration, setSlotDuration] = useState(90);
  const [slotStartTime, setSlotStartTime] = useState('18:00');
  const [slotEndTime, setSlotEndTime] = useState('19:30');


  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modCode, setModCode] = useState('');
  const [modName, setModName] = useState('');
  const [modMax, setModMax] = useState(3);

  // 1. Subject Handlers
  const openSubjectModal = (item?: (typeof subjects)[0]) => {
    if (!requirePermission("Quản lý danh mục môn học")) return;
    if (item) {
      setEditingSubjectId(item.id);
      setSubCode(item.code);
      setSubAbbr(item.abbr);
      setSubName(item.name);
      setSubDesc(item.desc);
    } else {
      setEditingSubjectId(null);
      setSubCode(`SUB-${Date.now().toString().slice(-4)}`);
      setSubAbbr('NEW');
      setSubName('');
      setSubDesc('');
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    if(isSavingChanges){e.preventDefault();return;}
    e.preventDefault();
    if (!requirePermission("Quản lý danh mục môn học")) return;
    e.preventDefault();
    if (!subName.trim()) return;

    if (editingSubjectId) {
      setSubjects(prev =>
        prev.map(s =>
          s.id === editingSubjectId
            ? { ...s, code: subCode, abbr: subAbbr.toUpperCase(), name: subName.trim(), desc: subDesc.trim() }
            : s
        )
      );
      showToast(`Đã cập nhật môn học "${subName}"!`, 'success');
    } else {
      setSubjects(prev => [
        ...prev,
        {
          id: `SUB-${Date.now()}`,
          code: subCode,
          abbr: subAbbr.toUpperCase(),
          name: subName.trim(),
          desc: subDesc.trim(),
          status: true
        }
      ]);
      showToast(`Đã thêm môn học mới "${subName}"!`, 'success');
    }
    void confirmSave(()=>setIsSubjectModalOpen(false));
  };

  // 2. Level Handlers
  const openLevelModal = (item?: (typeof levels)[0]) => {
    if (!requirePermission("Quản lý danh mục trình độ")) return;
    if (item) {
      setEditingLevelId(item.id);
      setLvlCode(item.code);
      setLvlAbbr(item.abbr);
      setLvlName(item.name);
      setLvlTarget(item.target);
      setLvlObjective(item.objective);
    } else {
      setEditingLevelId(null);
      setLvlCode(`LVL-NEW`);
      setLvlAbbr('NEW');
      setLvlName('');
      setLvlTarget('');
      setLvlObjective('');
    }
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = (e: React.FormEvent) => {
    if(isSavingChanges){e.preventDefault();return;}
    e.preventDefault();
    if (!requirePermission("Quản lý danh mục trình độ")) return;
    e.preventDefault();
    if (!lvlName.trim()) return;

    if (editingLevelId) {
      setLevels(prev =>
        prev.map(l =>
          l.id === editingLevelId
            ? { ...l, code: lvlCode, abbr: lvlAbbr.toUpperCase(), name: lvlName.trim(), target: lvlTarget.trim(), objective: lvlObjective.trim() }
            : l
        )
      );
      showToast(`Đã cập nhật trình độ "${lvlName}"!`, 'success');
    } else {
      setLevels(prev => [
        ...prev,
        {
          id: `LVL-${Date.now()}`,
          code: lvlCode,
          abbr: lvlAbbr.toUpperCase(),
          name: lvlName.trim(),
          target: lvlTarget.trim(),
          objective: lvlObjective.trim(),
          status: true
        }
      ]);
      showToast(`Đã thêm trình độ mới "${lvlName}"!`, 'success');
    }
    void confirmSave(()=>setIsLevelModalOpen(false));
  };

  // 3. Time Slot Handlers
  const openSlotModal = (item?: (typeof timeSlots)[0]) => {
    if (!requirePermission("Cấu hình Khung giờ ca dạy chuẩn (Time Slot)")) return;
    if (item) {
      setEditingSlotId(item.id);
      setSlotCode(item.code);
      setSlotName(item.name);
      setSlotRange(item.timeRange);
      setSlotDuration(item.durationMinutes);
      const parts = item.timeRange.split('-');
      if (parts.length === 2) {
        setSlotStartTime(parts[0].trim());
        setSlotEndTime(parts[1].trim());
      }
    } else {
      setEditingSlotId(null);
      setSlotCode(`SLOT-N${timeSlots.length + 1}`);
      setSlotName('');
      setSlotStartTime('18:00');
      setSlotEndTime('19:30');
      setSlotRange('18:00 - 19:30');
      setSlotDuration(90);
    }
    setIsSlotModalOpen(true);
  };

  const handleTimeChange = (start: string, end: string) => {
    setSlotStartTime(start);
    setSlotEndTime(end);
    try {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60;
      if (diff > 0) {
        setSlotDuration(diff);
      }
    } catch {}
    setSlotRange(`${start} - ${end}`);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    if(isSavingChanges){e.preventDefault();return;}
    e.preventDefault();
    if (!requirePermission("Cấu hình Khung giờ ca dạy chuẩn (Time Slot)")) return;
    e.preventDefault();
    if (!slotName.trim()) return;

    if (editingSlotId) {
      setTimeSlots(prev =>
        prev.map(s =>
          s.id === editingSlotId
            ? { ...s, code: slotCode, name: slotName.trim(), timeRange: slotRange.trim(), durationMinutes: slotDuration }
            : s
        )
      );
      showToast(`Đã cập nhật khung giờ "${slotName}"!`, 'success');
    } else {
      setTimeSlots(prev => [
        ...prev,
        {
          id: `SLOT-${Date.now()}`,
          code: slotCode,
          name: slotName.trim(),
          timeRange: slotRange.trim(),
          durationMinutes: slotDuration,
          status: true
        }
      ]);
      showToast(`Đã thêm khung giờ mới "${slotName}"!`, 'success');
    }
    void confirmSave(()=>setIsSlotModalOpen(false));
  };

  // 5. Model Handlers
  const openModelModal = (item?: (typeof models)[0]) => {
    if (!requirePermission("Quản lý mô hình lớp và sĩ số tối đa")) return;
    if (item) {
      setEditingModelId(item.id);
      setModCode(item.code);
      setModName(item.name);
      setModMax(item.maxStudents);
    } else {
      setEditingModelId(null);
      setModCode(`1-${models.length + 2}`);
      setModName('');
      setModMax(3);
    }
    setIsModelModalOpen(true);
  };

  const handleSaveModel = (e: React.FormEvent) => {
    if(isSavingChanges){e.preventDefault();return;}
    e.preventDefault();
    if (!requirePermission("Quản lý mô hình lớp và sĩ số tối đa")) return;
    e.preventDefault();
    if (!modName.trim()) return;

    if (editingModelId) {
      setModels(prev =>
        prev.map(m =>
          m.id === editingModelId
            ? { ...m, code: modCode, name: modName.trim(), maxStudents: modMax }
            : m
        )
      );
      showToast(`Đã cập nhật mô hình "${modName}"!`, 'success');
    } else {
      setModels(prev => [
        ...prev,
        {
          id: `MOD-${Date.now()}`,
          code: modCode,
          name: modName.trim(),
          maxStudents: modMax,
          status: true
        }
      ]);
      showToast(`Đã thêm mô hình "${modName}"!`, 'success');
    }
    void confirmSave(()=>setIsModelModalOpen(false));
  };

  return (
    <div className="space-y-6">
      <CatalogWorkspace active={activeTab} onSelect={id => { setActiveTab(id as typeof activeTab); setSearchKeyword(''); }} items={[
        { id: 'subjects', name: 'Môn học', group: 'Đào tạo', count: subjects.length },
        { id: 'levels', name: 'Chương trình / Trình độ', group: 'Đào tạo', count: levels.length },
        { id: 'teaching', name: 'Cấp học & Lớp dạy', group: 'Đào tạo', count: teachingCategories.length },
        { id: 'models', name: 'Mô hình & Sĩ số', group: 'Tổ chức lớp học', count: models.length },
        { id: 'times', name: 'Khung giờ học', group: 'Tổ chức lớp học', count: timeSlots.length },
        { id: 'durations', catalogCode: 'CLASS_DURATION', name: durationCatalogs.find(row=>row.code==='CLASS_DURATION')?.name || 'Thời hạn lớp học', group: 'Tổ chức lớp học', count: durationCatalogs.find(row=>row.code==='CLASS_DURATION')?.entries.length||0 },
        { id: 'document-types', name: 'Loại tài liệu', group: 'Vận hành', count: documentCategories.length },
        { id: 'incidents', name: 'Sự cố & Hệ số công', group: 'Vận hành', count: incidents.length }
      ]}>
      <div className="space-y-3">
      {activeTab !== 'teaching' && activeTab !== 'incidents' && <div className="relative max-w-sm">
        <input type="search" aria-label="Tìm giá trị trong danh mục đang chọn" value={searchKeyword}
          onChange={event => setSearchKeyword(event.target.value)} placeholder="Tìm theo mã hoặc tên trong danh mục..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs focus:border-orange-500 focus:outline-none" />
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
      </div>}
      {activeTab === 'document-types' && <DocumentCategoryManager searchKeyword={searchKeyword} />}
      {activeTab === 'teaching' && <TeachingCatalog />}
      {activeTab === 'durations' && <ClassDurationCatalog searchKeyword={searchKeyword} />}
      {/* ================= TAB 1: MÔN HỌC ================= */}
      {activeTab === 'subjects' && (
        <CatalogTreeBranch title="Môn học" count={subjects.length} onAdd={() => openSubjectModal()} addLabel="Thêm môn học" revealKey={searchKeyword}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã Môn</th>
                  <th className="py-3 px-4">Mã dùng tạo lớp</th>
                  <th className="py-3 px-4">Tên Môn học</th>
                  <th className="py-3 px-4">Mô tả trường dữ liệu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
                {subjects
                  .filter(s => s.name.toLowerCase().includes(searchKeyword.toLowerCase()) || s.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                  .map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{s.code}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.abbr}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 text-sm">{s.name}</td>
                      <td className="py-3 px-4 text-slate-600">{s.desc}</td>
                      <td className="py-3 px-4">
                        {s.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang áp dụng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Tạm dừng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={s.status}
                          onChange={e => {
                            setSubjects(prev => prev.map(item => item.id === s.id ? { ...item, status: e.target.checked } : item));
                            showToast(`Đã chuyển trạng thái [${s.name}] sang ${e.target.checked ? 'Áp dụng' : 'Tạm tắt'}`, 'info');
                          }}
                          className="accent-[#FF5C00] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openSubjectModal(s)}
                            className="p-1 rounded text-slate-500 hover:text-[#FF5C00] hover:bg-slate-100"
                            title="Sửa môn học"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirmAction(`Xóa môn học ${s.name}?`)) {
                                setSubjects(prev => prev.filter(item => item.id !== s.id));
                                showToast(`Đã xóa môn học [${s.name}]!`, 'info');
                              }
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-500 hover:bg-slate-100"
                            title="Xóa môn học"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </PaginatedTableBody>
            </table>
          </div>
</CatalogTreeBranch>
      )}

      {/* ================= TAB 2: KHUNG CHƯƠNG TRÌNH / TRÌNH ĐỘ ================= */}
      {activeTab === 'levels' && (
        <CatalogTreeBranch title="Chương trình / Trình độ" count={levels.length} onAdd={() => openLevelModal()} addLabel="Thêm trình độ" revealKey={searchKeyword}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã Trình độ</th><th className="py-3 px-4">Mã dùng tạo lớp</th>
                  <th className="py-3 px-4">Tên Khung trình độ</th>
                  <th className="py-3 px-4">Đối tượng học sinh</th>
                  <th className="py-3 px-4">Mục tiêu đầu ra</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
                {levels
                  .filter(l => l.name.toLowerCase().includes(searchKeyword.toLowerCase()) || l.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                  .map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{l.code}</td><td className="py-3 px-4 font-mono font-bold text-slate-700">{l.abbr}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          {l.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{l.target}</td>
                      <td className="py-3 px-4 text-slate-600">{l.objective}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={l.status}
                          onChange={e => {
                            setLevels(prev => prev.map(item => item.id === l.id ? { ...item, status: e.target.checked } : item));
                            showToast(`Đã chuyển trạng thái [${l.name}]`, 'info');
                          }}
                          className="accent-[#FF5C00] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openLevelModal(l)}
                            className="p-1 rounded text-slate-500 hover:text-[#FF5C00] hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirmAction(`Xóa trình độ ${l.name}?`)) {
                                setLevels(prev => prev.filter(item => item.id !== l.id));
                                showToast(`Đã xóa trình độ [${l.name}]`, 'info');
                              }
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-500 hover:bg-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!levels.some(item => (item.name + ' ' + item.code).toLocaleLowerCase('vi').includes(searchKeyword.trim().toLocaleLowerCase('vi'))) && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Chưa có mục phù hợp. Thêm mục mới hoặc đổi từ khóa tìm kiếm.</td></tr>}
              </PaginatedTableBody>
            </table>
          </div>
</CatalogTreeBranch>
      )}

      {/* ================= TAB 3: KHUNG GIỜ HỌC ================= */}
      {activeTab === 'times' && (
        <CatalogTreeBranch title="Khung giờ học" count={timeSlots.length} onAdd={() => openSlotModal()} addLabel="Thêm khung giờ" revealKey={searchKeyword}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã Khung giờ</th>
                  <th className="py-3 px-4">Tên hiển thị</th>
                  <th className="py-3 px-4">Khoảng thời gian</th>
                  <th className="py-3 px-4">Thời lượng</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
                {timeSlots.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{s.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.timeRange}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold font-mono">{s.durationMinutes} phút</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={s.status}
                        onChange={e => {
                          setTimeSlots(prev => prev.map(item => item.id === s.id ? { ...item, status: e.target.checked } : item));
                          showToast(`Đã chuyển trạng thái khung giờ [${s.name}]`, 'info');
                        }}
                        className="accent-[#FF5C00] w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openSlotModal(s)} className="p-1 rounded text-slate-500 hover:text-[#FF5C00]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmAction(`Xóa khung giờ ${s.name}?`)) {
                              setTimeSlots(prev => prev.filter(item => item.id !== s.id));
                              showToast(`Đã xóa khung giờ [${s.name}]`, 'info');
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!timeSlots.some(item => (item.name + ' ' + item.code).toLocaleLowerCase('vi').includes(searchKeyword.trim().toLocaleLowerCase('vi'))) && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Chưa có mục phù hợp. Thêm mục mới hoặc đổi từ khóa tìm kiếm.</td></tr>}
              </PaginatedTableBody>
            </table>
          </div>
</CatalogTreeBranch>
      )}

      {/* ================= TAB 5: MÔ HÌNH & SĨ SỐ TRẦN ================= */}
      {activeTab === 'models' && (
        <CatalogTreeBranch title="Mô hình & Sĩ số" count={models.length} onAdd={() => openModelModal()} addLabel="Thêm mô hình" revealKey={searchKeyword}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã mô hình</th>
                  <th className="py-3 px-4">Tên hiển thị mô hình</th>
                  <th className="py-3 px-4 text-center">Ngưỡng Sĩ số trần</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
                {models.filter(m => (m.name + ' ' + m.code).toLocaleLowerCase('vi').includes(searchKeyword.trim().toLocaleLowerCase('vi'))).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{m.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{m.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded border border-rose-200 font-mono">
                        {String(m.maxStudents).padStart(2, '0')} Học sinh
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={m.status}
                        onChange={e => {
                          setModels(prev => prev.map(item => item.id === m.id ? { ...item, status: e.target.checked } : item));
                          showToast(`Đã chuyển trạng thái [${m.name}]`, 'info');
                        }}
                        className="accent-[#FF5C00] w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openModelModal(m)} className="p-1 rounded text-slate-500 hover:text-[#FF5C00]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmAction(`Xóa mô hình ${m.name}?`)) {
                              setModels(prev => prev.filter(item => item.id !== m.id));
                              showToast(`Đã xóa mô hình [${m.name}]`, 'info');
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!models.some(item => (item.name + ' ' + item.code).toLocaleLowerCase('vi').includes(searchKeyword.trim().toLocaleLowerCase('vi'))) && <tr><td colSpan={5} className="p-6 text-center text-slate-400">Chưa có mục phù hợp. Thêm mục mới hoặc đổi từ khóa tìm kiếm.</td></tr>}
              </PaginatedTableBody>
            </table>
          </div>
</CatalogTreeBranch>
      )}

      {activeTab === 'incidents' && <IncidentCatalog />}

      </div>
      </CatalogWorkspace>

      {/* ================= MODALS CHO MASTER DATA ================= */}
      {/* 1. Modal Môn học */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingSubjectId ? 'Hiệu chỉnh Môn học' : 'Thêm Môn học Mới'}
              </h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã môn học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={e => setSubCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã dùng tạo lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subAbbr}
                    onChange={e => setSubAbbr(e.target.value)}
                    placeholder="T / TA"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  placeholder="Môn Toán"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả trường dữ liệu</label>
                <textarea
                  rows={2}
                  value={subDesc}
                  onChange={e => setSubDesc(e.target.value)}
                  placeholder="Ghi chú chương trình bám sát..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={isSavingChanges}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Khung trình độ */}
      {isLevelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingLevelId ? 'Hiệu chỉnh Trình độ' : 'Thêm Trình độ Mới'}
              </h3>
              <button onClick={() => setIsLevelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã trình độ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lvlCode}
                    onChange={e => setLvlCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã dùng tạo lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lvlAbbr}
                    onChange={e => setLvlAbbr(e.target.value)}
                    placeholder="NT1, TC, NC"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên khung trình độ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lvlName}
                  onChange={e => setLvlName(e.target.value)}
                  placeholder="Nền tảng 1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đối tượng học sinh</label>
                <input
                  type="text"
                  value={lvlTarget}
                  onChange={e => setLvlTarget(e.target.value)}
                  placeholder="Học sinh mất gốc kiến thức..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu đầu ra</label>
                <input
                  type="text"
                  value={lvlObjective}
                  onChange={e => setLvlObjective(e.target.value)}
                  placeholder="Lấy lại căn bản, kèm cặp thao tác..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={isSavingChanges}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Khung giờ */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingSlotId ? 'Hiệu chỉnh Khung giờ' : 'Thêm Khung giờ Mới'}
              </h3>
              <button onClick={() => setIsSlotModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã khung giờ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={slotCode}
                  onChange={e => setSlotCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên ca hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={slotName}
                  onChange={e => setSlotName(e.target.value)}
                  placeholder="Ca Tối 1 (Giờ vàng)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giờ bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={e => handleTimeChange(e.target.value, slotEndTime)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giờ kết thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={e => handleTimeChange(slotStartTime, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    readOnly
                    value={slotDuration}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-bold text-[#FF5C00] font-mono text-xs"
                    title="Tự động tính theo thời gian bắt đầu và kết thúc"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khoảng thời gian hiển thị (Auto)</label>
                <input
                  type="text"
                  readOnly
                  value={slotRange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono text-xs text-slate-700 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={isSavingChanges}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu khung giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Mô hình lớp */}
      {isModelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingModelId ? 'Hiệu chỉnh Mô hình' : 'Thêm Mô hình Lớp Mới'}
              </h3>
              <button onClick={() => setIsModelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã mô hình (1-1, 1-3, 1-5)</label>
                <input
                  type="text"
                  required
                  value={modCode}
                  onChange={e => setModCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên mô hình</label>
                <input
                  type="text"
                  required
                  value={modName}
                  onChange={e => setModName(e.target.value)}
                  placeholder="Mô hình 1 kèm 3"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sĩ số trần (Học sinh)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={modMax}
                  onChange={e => setModMax(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={isSavingChanges}
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu mô hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
