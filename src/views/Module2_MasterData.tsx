import { TeachingCatalog } from '../components/TeachingCatalog';
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
  const {
    subjects,
    setSubjects,
    levels,
    setLevels,
    timeSlots,
    setTimeSlots,
    packages,
    setPackages,
    models,
    setModels,
    incidents,
    setIncidents,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'subjects' | 'levels' | 'times' | 'models' | 'incidents' | 'teaching'>('subjects');
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

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [pkgCode, setPkgCode] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgMonths, setPkgMonths] = useState(3);
  const [pkgDays, setPkgDays] = useState(90);

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modCode, setModCode] = useState('');
  const [modName, setModName] = useState('');
  const [modMax, setModMax] = useState(3);

  const [isParentIncidentModalOpen, setIsParentIncidentModalOpen] = useState(false);
  const [parentIncCode, setParentIncCode] = useState('');
  const [parentIncName, setParentIncName] = useState('');
  const [parentIncDesc, setParentIncDesc] = useState('');

  const [isSubIncidentModalOpen, setIsSubIncidentModalOpen] = useState(false);
  const [selectedParentIncId, setSelectedParentIncId] = useState('');
  const [editingSubIncId, setEditingSubIncId] = useState<string | null>(null);
  const [subIncCode, setSubIncCode] = useState('');
  const [subIncName, setSubIncName] = useState('');
  const [subIncTarget, setSubIncTarget] = useState<'Giáo viên' | 'Học sinh' | 'Khách quan'>('Giáo viên');
  const [subIncDesc, setSubIncDesc] = useState('');

  // 1. Subject Handlers
  const openSubjectModal = (item?: (typeof subjects)[0]) => {
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
    setIsSubjectModalOpen(false);
  };

  // 2. Level Handlers
  const openLevelModal = (item?: (typeof levels)[0]) => {
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
    setIsLevelModalOpen(false);
  };

  // 3. Time Slot Handlers
  const openSlotModal = (item?: (typeof timeSlots)[0]) => {
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
    setIsSlotModalOpen(false);
  };

  // 4. Package Handlers
  const openPackageModal = (item?: (typeof packages)[0]) => {
    if (item) {
      setEditingPackageId(item.id);
      setPkgCode(item.code);
      setPkgName(item.name);
      setPkgMonths(item.months);
      setPkgDays(item.daysConverted);
    } else {
      setEditingPackageId(null);
      setPkgCode(`PKG-${Date.now().toString().slice(-3)}M`);
      setPkgName('');
      setPkgMonths(3);
      setPkgDays(90);
    }
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;

    if (editingPackageId) {
      setPackages(prev =>
        prev.map(p =>
          p.id === editingPackageId
            ? { ...p, code: pkgCode, name: pkgName.trim(), months: pkgMonths, daysConverted: pkgDays }
            : p
        )
      );
      showToast(`Đã cập nhật gói thời hạn "${pkgName}"!`, 'success');
    } else {
      setPackages(prev => [
        ...prev,
        {
          id: `PKG-${Date.now()}`,
          code: pkgCode,
          name: pkgName.trim(),
          months: pkgMonths,
          daysConverted: pkgDays,
          status: true
        }
      ]);
      showToast(`Đã thêm gói thời hạn "${pkgName}"!`, 'success');
    }
    setIsPackageModalOpen(false);
  };

  // 5. Model Handlers
  const openModelModal = (item?: (typeof models)[0]) => {
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
    setIsModelModalOpen(false);
  };

  // 6. Incident Tree Handlers
  const handleSaveParentIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentIncName.trim()) return;

    const newCategory: IncidentCategory = {
      id: `GRP-${Date.now()}`,
      code: parentIncCode || `GRP-${Date.now().toString().slice(-4)}`,
      name: parentIncName.trim(),
      desc: parentIncDesc.trim(),
      subIncidents: []
    };

    setIncidents(prev => [...prev, newCategory]);
    showToast(`Đã tạo Nhóm sự cố Cha [${parentIncName}]!`, 'success');
    setIsParentIncidentModalOpen(false);
  };

  const openSubIncidentModal = (parentId: string, item?: (typeof incidents)[0]['subIncidents'][0]) => {
    setSelectedParentIncId(parentId);
    if (item) {
      setEditingSubIncId(item.id);
      setSubIncCode(item.code);
      setSubIncName(item.name);
      setSubIncTarget(item.targetParty);
      setSubIncDesc(item.desc);
    } else {
      setEditingSubIncId(null);
      setSubIncCode(`INC-${Date.now().toString().slice(-4)}`);
      setSubIncName('');
      setSubIncTarget('Giáo viên');
      setSubIncDesc('');
    }
    setIsSubIncidentModalOpen(true);
  };

  const handleSaveSubIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subIncName.trim()) return;

    setIncidents(prev =>
      prev.map(cat => {
        if (cat.id === selectedParentIncId) {
          if (editingSubIncId) {
            return {
              ...cat,
              subIncidents: cat.subIncidents.map(sub =>
                sub.id === editingSubIncId
                  ? { ...sub, code: subIncCode, name: subIncName.trim(), targetParty: subIncTarget, desc: subIncDesc.trim() }
                  : sub
              )
            };
          } else {
            return {
              ...cat,
              subIncidents: [
                ...cat.subIncidents,
                {
                  id: `INC-${Date.now()}`,
                  code: subIncCode,
                  name: subIncName.trim(),
                  targetParty: subIncTarget,
                  desc: subIncDesc.trim(),
                  status: true
                }
              ]
            };
          }
        }
        return cat;
      })
    );

    showToast(`Đã lưu loại sự cố con [${subIncName}]!`, 'success');
    setIsSubIncidentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner Master Data */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#FF5C00] font-bold text-xs uppercase tracking-wide">
              CẤU HÌNH DỮ LIỆU NỀN TẢNG
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quản lý Danh mục Dùng chung (Master Data)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Định nghĩa các tập giá trị, trường thông tin và cây danh mục chuẩn để liên kết toàn diện với Giáo viên, Lớp học và Chốt công.
          </p>
        </div>

        {/* Global Search */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Tra cứu trong danh mục..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF5C00]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {activeTab === 'teaching' && <TeachingCatalog />}
      {/* 6 Tabs Chuyển đổi danh mục */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto flex items-center gap-1 text-xs">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'subjects' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Môn học</span>
        </button>

        <button
          onClick={() => setActiveTab('levels')}
          className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'levels' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>2. Khung chương trình / Trình độ</span>
        </button>

        <button
          onClick={() => setActiveTab('times')}
          className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'times' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. Khung giờ học (Time Slots)</span>
        </button>



        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'models' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>4. Mô hình &amp; Sĩ số trần</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'incidents' ? 'bg-[#FF5C00] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>5. Danh mục Sự cố (Cha - Con)</span>
        </button>
      </div>

      {/* ================= TAB 1: MÔN HỌC ================= */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Danh mục Môn học</h3>
              <p className="text-xs text-slate-400">Trường thông tin Môn học gán cho Giáo viên và Khởi tạo lớp học</p>
            </div>
            <button
              onClick={() => openSubjectModal()}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm Môn học</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã Môn</th>
                  <th className="py-3 px-4">Viết tắt</th>
                  <th className="py-3 px-4">Tên Môn học</th>
                  <th className="py-3 px-4">Mô tả trường dữ liệu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
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
                            onClick={() => {
                              if (window.confirm(`Xóa môn học ${s.name}?`)) {
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: KHUNG CHƯƠNG TRÌNH / TRÌNH ĐỘ ================= */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Danh mục Khung chương trình học / Trình độ</h3>
              <p className="text-xs text-slate-400">Các mức trình độ học tập dùng xếp lớp học sinh</p>
            </div>
            <button
              onClick={() => openLevelModal()}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm Trình độ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã Trình độ</th>
                  <th className="py-3 px-4">Tên Khung trình độ</th>
                  <th className="py-3 px-4">Đối tượng học sinh</th>
                  <th className="py-3 px-4">Mục tiêu đầu ra</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {levels
                  .filter(l => l.name.toLowerCase().includes(searchKeyword.toLowerCase()) || l.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                  .map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{l.code}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          {l.name} ({l.abbr})
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
                            onClick={() => {
                              if (window.confirm(`Xóa trình độ ${l.name}?`)) {
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: KHUNG GIỜ HỌC ================= */}
      {activeTab === 'times' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Danh mục Khung giờ học chuẩn (Time Slots)</h3>
              <p className="text-xs text-slate-400">Trường thông tin xếp thời khóa biểu và lịch rảnh giáo viên</p>
            </div>
            <button
              onClick={() => openSlotModal()}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm Khung giờ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã Khung giờ</th>
                  <th className="py-3 px-4">Tên hiển thị</th>
                  <th className="py-3 px-4">Khoảng thời gian</th>
                  <th className="py-3 px-4">Thời lượng</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
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
                          onClick={() => {
                            if (window.confirm(`Xóa khung giờ ${s.name}?`)) {
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: MÔ HÌNH & SĨ SỐ TRẦN ================= */}
      {activeTab === 'models' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Danh mục Mô hình lớp &amp; Sĩ số trần</h3>
              <p className="text-xs text-slate-400">Tham số kiểm soát không cho ghép vượt sĩ số</p>
            </div>
            <button
              onClick={() => openModelModal()}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm Mô hình</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã mô hình</th>
                  <th className="py-3 px-4">Tên hiển thị mô hình</th>
                  <th className="py-3 px-4 text-center">Ngưỡng Sĩ số trần</th>
                  <th className="py-3 px-4 text-center">Bật / Tắt</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {models.map(m => (
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
                          onClick={() => {
                            if (window.confirm(`Xóa mô hình ${m.name}?`)) {
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 6: DANH MỤC SỰ CỐ ================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <GitFork className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">Quy tắc Cây Danh mục Sự cố (Master Data):</span> Định nghĩa trường thông tin theo 2 cấp:{' '}
              <span className="font-bold text-blue-700">Nhóm Sự cố Cha</span> &rarr;{' '}
              <span className="font-semibold text-slate-900">Loại Sự cố Con trực thuộc</span> để làm bộ dữ liệu cho chức năng Giám sát ca dạy &amp; Chốt công.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Cây Danh mục Phân loại Sự cố</h3>
                <p className="text-xs text-slate-400">Tạo nhóm cha hoặc thêm loại sự cố con tương ứng</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setParentIncCode(`GRP-${Date.now().toString().slice(-4)}`);
                    setParentIncName('');
                    setParentIncDesc('');
                    setIsParentIncidentModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>+ Tạo Nhóm Sự cố Cha</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Nhóm Sự cố Cha (Level 1)</th>
                    <th className="py-3 px-4">Mã Cây Con</th>
                    <th className="py-3 px-4">Tên Loại sự cố con (Level 2)</th>
                    <th className="py-3 px-4">Đối tượng phát sinh</th>
                    <th className="py-3 px-4">Mô tả trường</th>
                    <th className="py-3 px-4 text-center">Bật / Tắt</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {incidents.map(cat => (
                    <React.Fragment key={cat.id}>
                      {cat.subIncidents.length === 0 ? (
                        <tr className="bg-slate-50/30">
                          <td className="py-3 px-4 font-bold text-blue-700">
                            <div>{cat.name}</div>
                            <span className="text-[11px] font-mono text-slate-400">Mã: {cat.code}</span>
                            <button
                              onClick={() => openSubIncidentModal(cat.id)}
                              className="mt-2 block text-xs text-blue-600 hover:underline font-semibold"
                            >
                              + Thêm con vào nhóm này
                            </button>
                          </td>
                          <td colSpan={6} className="py-3 px-4 text-slate-400 italic">
                            Chưa có loại sự cố con nào.
                          </td>
                        </tr>
                      ) : (
                        cat.subIncidents.map((sub, sIdx) => (
                          <tr key={sub.id} className="hover:bg-slate-50/80">
                            {sIdx === 0 && (
                              <td
                                rowSpan={cat.subIncidents.length}
                                className="py-3 px-4 font-bold text-blue-700 align-top border-r border-slate-100 bg-slate-50/40"
                              >
                                <div className="text-sm">{cat.name}</div>
                                <span className="text-[11px] font-mono text-slate-400 block mt-0.5">Mã: {cat.code}</span>
                                <button
                                  onClick={() => openSubIncidentModal(cat.id)}
                                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" /> Thêm con vào nhóm
                                </button>
                              </td>
                            )}
                            <td className="py-3 px-4 font-mono font-bold text-[#FF5C00]">{sub.code}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{sub.name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded font-bold border text-[11px] ${
                                  sub.targetParty === 'Giáo viên'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : sub.targetParty === 'Học sinh'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {sub.targetParty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{sub.desc}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={sub.status}
                                onChange={e => {
                                  setIncidents(prev =>
                                    prev.map(c =>
                                      c.id === cat.id
                                        ? {
                                            ...c,
                                            subIncidents: c.subIncidents.map(si =>
                                              si.id === sub.id ? { ...si, status: e.target.checked } : si
                                            )
                                          }
                                        : c
                                    )
                                  );
                                  showToast(`Đã chuyển trạng thái sự cố [${sub.name}]`, 'info');
                                }}
                                className="accent-[#FF5C00] w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openSubIncidentModal(cat.id, sub)}
                                  className="p-1 rounded text-slate-500 hover:text-[#FF5C00]"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Xóa loại sự cố con ${sub.name}?`)) {
                                      setIncidents(prev =>
                                        prev.map(c =>
                                          c.id === cat.id
                                            ? { ...c, subIncidents: c.subIncidents.filter(si => si.id !== sub.id) }
                                            : c
                                        )
                                      );
                                      showToast(`Đã xóa sự cố con [${sub.name}]`, 'info');
                                    }
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-rose-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                    Mã viết tắt (Abbr) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subAbbr}
                    onChange={e => setSubAbbr(e.target.value)}
                    placeholder="TOAN / ENG"
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
                  type="submit"
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
                    Mã viết tắt (Abbr) <span className="text-rose-500">*</span>
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
                  type="submit"
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
                  type="submit"
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
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu mô hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Tạo Nhóm Sự cố Cha */}
      {isParentIncidentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">Tạo Nhóm Sự cố Cha</h3>
              <button onClick={() => setIsParentIncidentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParentIncident} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã Nhóm Cha</label>
                <input
                  type="text"
                  required
                  value={parentIncCode}
                  onChange={e => setParentIncCode(e.target.value)}
                  placeholder="GRP-TECH"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Nhóm Sự cố Cha</label>
                <input
                  type="text"
                  required
                  value={parentIncName}
                  onChange={e => setParentIncName(e.target.value)}
                  placeholder="Sự cố kỹ thuật & Thiết bị"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả mục đích phân loại</label>
                <textarea
                  rows={2}
                  value={parentIncDesc}
                  onChange={e => setParentIncDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsParentIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu Nhóm Cha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Tạo Loại Sự cố Con */}
      {isSubIncidentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingSubIncId ? 'Hiệu chỉnh Loại sự cố con' : 'Thêm Loại sự cố con vào Cây'}
              </h3>
              <button onClick={() => setIsSubIncidentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubIncident} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã loại sự cố con</label>
                <input
                  type="text"
                  required
                  value={subIncCode}
                  onChange={e => setSubIncCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên loại sự cố con</label>
                <input
                  type="text"
                  required
                  value={subIncName}
                  onChange={e => setSubIncName(e.target.value)}
                  placeholder="Học sinh xin nghỉ đột xuất"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đối tượng phát sinh lỗi</label>
                <select
                  value={subIncTarget}
                  onChange={e => setSubIncTarget(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00]"
                >
                  <option value="Giáo viên">Giáo viên</option>
                  <option value="Học sinh">Học sinh</option>
                  <option value="Khách quan">Khách quan (Mạng, Thiết bị)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả trường</label>
                <textarea
                  rows={2}
                  value={subIncDesc}
                  onChange={e => setSubIncDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu Loại Con
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
