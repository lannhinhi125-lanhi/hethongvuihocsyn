import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CriteriaCategory, SOPDocument, RAGBotConfig } from '../types';
import {
  Sparkles,
  TreePine,
  BookOpen,
  Sliders,
  FolderPlus,
  PlusCircle,
  Copy,
  Pencil,
  Trash2,
  X,
  Send,
  RotateCcw,
  CheckCircle,
  Brain,
  Cpu
} from 'lucide-react';

export const Module6_AIStudio: React.FC = () => {
  const {
    criteriaCategories,
    setCriteriaCategories,
    sopDocuments,
    setSopDocuments,
    ragBotConfig,
    setRagBotConfig,
    activeToneKey,
    setActiveToneKey,
    toneDirectives,
    setToneDirectives,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'criteria' | 'knowledge' | 'rag-config'>('criteria');
  const [currentSubject, setCurrentSubject] = useState<'TOAN' | 'ENG'>('TOAN');

  // Simulator state
  const [simUsageCount, setSimUsageCount] = useState(0);
  const [simCustomNote, setSimCustomNote] = useState('Con nhớ làm nốt phiếu bài tập số 3 về nhà trước thứ 6 nhé!');
  const [simResultText, setSimResultText] = useState(
    'Đoạn văn nhận xét hoàn chỉnh sẽ tự động được viết tại đây khi bạn tích chọn các tiêu chí và bấm nút Sinh nhận xét...'
  );

  // Category & Criterion Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNameInput, setCatNameInput] = useState('');

  const [isCriModalOpen, setIsCriModalOpen] = useState(false);
  const [editingCriId, setEditingCriId] = useState<string | null>(null);
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [criNameInput, setCriNameInput] = useState('');
  const [criOptionsInput, setCriOptionsInput] = useState<string[]>([
    'Rất tích cực, làm bài nhanh và chính xác',
    'Khá tập trung, còn đôi chỗ cần hướng dẫn thêm'
  ]);

  // Document Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Sự cố & Báo nghỉ');
  const [docSummary, setDocSummary] = useState('');
  const [docContent, setDocContent] = useState('');

  // Sandbox chat state
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; matchedDoc?: string }>>([
    {
      sender: 'ai',
      text: ragBotConfig.welcomeGreeting
    }
  ]);
  const [sandboxInput, setSandboxInput] = useState('');

  // Filtered categories
  const filteredCategories = criteriaCategories.filter(c => c.subject === currentSubject);

  // Handlers for Category
  const openAddCategory = () => {
    setEditingCatId(null);
    setCatNameInput('');
    setIsCatModalOpen(true);
  };

  const openEditCategory = (cat: CriteriaCategory) => {
    setEditingCatId(cat.id);
    setCatNameInput(cat.name);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;

    if (editingCatId) {
      setCriteriaCategories(prev =>
        prev.map(c => (c.id === editingCatId ? { ...c, name: catNameInput.trim() } : c))
      );
      showToast('Đã cập nhật danh mục tiêu chí!', 'success');
    } else {
      const newCat: CriteriaCategory = {
        id: `CAT_${currentSubject}_${Date.now()}`,
        subject: currentSubject,
        name: catNameInput.trim(),
        criteria: []
      };
      setCriteriaCategories(prev => [...prev, newCat]);
      showToast('Đã thêm danh mục tiêu chí mới!', 'success');
    }
    setIsCatModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    if (window.confirm(`Xóa danh mục "${name}"?`)) {
      setCriteriaCategories(prev => prev.filter(c => c.id !== catId));
      showToast(`Đã xóa danh mục "${name}"!`, 'info');
    }
  };

  // Handlers for Criterion
  const openAddCriterion = (preCatId?: string) => {
    setEditingCriId(null);
    setSelectedParentCatId(preCatId || filteredCategories[0]?.id || '');
    setCriNameInput('');
    setCriOptionsInput([
      'Rất tích cực, làm bài nhanh và chính xác',
      'Khá tập trung, còn đôi chỗ cần hướng dẫn thêm'
    ]);
    setIsCriModalOpen(true);
  };

  const openEditCriterion = (catId: string, criId: string) => {
    const cat = criteriaCategories.find(c => c.id === catId);
    const cri = cat?.criteria.find(cr => cr.id === criId);
    if (!cri) return;

    setEditingCriId(criId);
    setSelectedParentCatId(catId);
    setCriNameInput(cri.name);
    setCriOptionsInput(cri.options.map(o => o.label));
    setIsCriModalOpen(true);
  };

  const handleSaveCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!criNameInput.trim()) return;

    const validOptions = criOptionsInput
      .map(o => o.trim())
      .filter(o => o.length > 0)
      .map((label, idx) => ({
        id: `OPT_${Date.now()}_${idx}`,
        label,
        isDefault: idx === 0
      }));

    if (validOptions.length === 0) {
      showToast('Vui lòng nhập ít nhất 1 đáp án lựa chọn!', 'error');
      return;
    }

    setCriteriaCategories(prev =>
      prev.map(cat => {
        if (cat.id === selectedParentCatId) {
          if (editingCriId) {
            return {
              ...cat,
              criteria: cat.criteria.map(cr =>
                cr.id === editingCriId
                  ? { ...cr, name: criNameInput.trim(), options: validOptions }
                  : cr
              )
            };
          } else {
            return {
              ...cat,
              criteria: [
                ...cat.criteria,
                {
                  id: `CRI_${Date.now()}`,
                  name: criNameInput.trim(),
                  options: validOptions
                }
              ]
            };
          }
        }
        return cat;
      })
    );

    showToast('Đã lưu tiêu chí và đáp án lựa chọn!', 'success');
    setIsCriModalOpen(false);
  };

  // Simulator generate
  const handleSimulateAiGeneration = () => {
    if (simUsageCount >= 2) {
      showToast('Bạn đã sử dụng hết hạn mức tạo nhận xét AI (2 lần/buổi). Vui lòng tự tinh chỉnh câu chữ!', 'warning');
      return;
    }

    setSimUsageCount(prev => prev + 1);
    setSimResultText('AI Gemini đang đọc các tiêu chí bạn đã tick và tự động hành văn nhận xét...');

    setTimeout(() => {
      const studentName = 'Nguyễn Minh Khang';
      const subjectText = currentSubject === 'TOAN' ? 'Toán' : 'Tiếng Anh';
      let generated = '';

      if (activeToneKey === 'khich-le') {
        generated = `Kính gửi phụ huynh, buổi học môn ${subjectText} hôm nay bạn ${studentName} học tập rất cố gắng! Về nề nếp và thái độ, con rất tập trung, hăng hái tương tác. Trong quá trình tiếp thu bài học, con nắm rất chắc lý thuyết và bản chất các phép tính phân số. Thầy/Cô rất khen ngợi tinh thần tự giác của con. ${simCustomNote || 'Thầy/Cô tin rằng con sẽ tiếp tục phát huy ở buổi học sau!'}`;
      } else if (activeToneKey === 'chuan-muc') {
        generated = `Đánh giá buổi học môn ${subjectText} của học sinh ${studentName}: Về ý thức kỷ luật, con đảm bảo giờ giấc và tập trung tốt. Về tiếp thu kiến thức, con nắm chắc các dạng bài tập phân số. Đề nghị gia đình phối hợp nhắc nhở con: ${simCustomNote || 'hoàn thành bài tập đúng hạn.'}`;
      } else if (activeToneKey === 'ngan-gon') {
        generated = `Nhận xét ca học ${studentName} (${subjectText}): Thái độ: Rất tốt; Kiến thức: Nắm chắc lý thuyết phân số. Dặn dò: ${simCustomNote || 'Ôn bài kỹ trước ca sau.'}`;
      } else {
        generated = `Nhận xét ca học môn ${subjectText} của bạn ${studentName}: Hôm nay con có tiến bộ, tính toán nhanh và hăng hái. Thầy/Cô dặn con: ${simCustomNote || 'cần kiểm tra lại bài trước khi nộp.'}`;
      }

      setSimResultText(`"${generated}"`);
      showToast('AI đã tự động viết đoạn nhận xét hoàn chỉnh từ các tiêu chí đã tick!', 'success');
    }, 500);
  };

  // SOP Document CRUD
  const openEditDocument = (doc: SOPDocument) => {
    setEditingDocId(doc.id);
    setDocTitle(doc.title);
    setDocCategory(doc.category);
    setDocSummary(doc.summary);
    setDocContent(doc.content);
    setIsDocModalOpen(true);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    if (editingDocId) {
      setSopDocuments(prev =>
        prev.map(d =>
          d.id === editingDocId
            ? {
                ...d,
                title: docTitle.trim(),
                category: docCategory,
                summary: docSummary.trim() || 'Quy chuẩn vận hành đã cập nhật',
                content: docContent.trim(),
                updatedAt: new Date().toLocaleDateString('vi-VN')
              }
            : d
        )
      );
      showToast('Đã lưu nội dung & cập nhật Vector Index cho tài liệu!', 'success');
    } else {
      const newDoc: SOPDocument = {
        id: `DOC-0${sopDocuments.length + 1}`,
        title: docTitle.trim(),
        category: docCategory,
        summary: docSummary.trim() || 'Quy chuẩn vận hành mới',
        content: docContent.trim(),
        updatedAt: new Date().toLocaleDateString('vi-VN')
      };
      setSopDocuments(prev => [...prev, newDoc]);
      showToast('Đã thêm văn bản SOP mới vào kho tri thức!', 'success');
    }
    setIsDocModalOpen(false);
  };

  // Sandbox chat
  const handleSandboxSend = (e: React.FormEvent) => {
    e.preventDefault();
    const query = sandboxInput.trim();
    if (!query) return;

    setSandboxMessages(prev => [...prev, { sender: 'user', text: query }]);
    setSandboxInput('');

    setTimeout(() => {
      const q = query.toLowerCase();
      let answer = '';
      let matchedDocName = '';

      if (q.includes('nghỉ') || q.includes('bận') || q.includes('vắng')) {
        answer = 'Dạ thưa Thầy/Cô, theo Điều 1.1 trong Quy chế Báo nghỉ SOP, Thầy/Cô có việc bận đột xuất phải tạo phiếu báo nghỉ trước giờ dạy ít nhất 04 TIẾNG để Vận hành kịp thời điều phối giáo viên dạy thay (Cover). Nếu báo nghỉ dưới 02 tiếng mà không có lý do bất khả kháng, ca dạy sẽ tính vi phạm kỷ luật vận hành ạ.';
        matchedDocName = 'SOP_Bao_Nghi_Va_Su_Co_Ca_Day_2026.txt';
      } else if (q.includes('mạng') || q.includes('mất điện') || q.includes('thiết bị')) {
        answer = 'Dạ thưa Thầy/Cô, theo Điều 2 trong Quy chế Xử lý sự cố, khi bị mất điện hoặc hỏng mạng đột xuất, Thầy/Cô có tối đa 10 phút để đổi mạng 4G/thiết bị dự phòng và báo ngay vào Zalo Trực Ban trong vòng 05 phút đầu để Vận hành giữ kết nối với phụ huynh ạ.';
        matchedDocName = 'SOP_Bao_Nghi_Va_Su_Co_Ca_Day_2026.txt';
      } else if (q.includes('công') || q.includes('chốt') || q.includes('khiếu nại')) {
        answer = 'Dạ thưa Thầy/Cô, dữ liệu công tuần được khóa sổ vào 23h59 Chủ nhật. Nếu phát hiện ca dạy bị sai sót, Thầy/Cô vui lòng bấm "Gửi khiếu nại" trước 12h00 trưa Thứ 2 kèm ảnh chụp phòng học để Ban Vận hành phê duyệt điều chỉnh ạ.';
        matchedDocName = 'Quy_Che_Doi_Soat_Cong_Va_Khieu_Nai.txt';
      } else {
        answer = ragBotConfig.fallbackResponse;
      }

      setSandboxMessages(prev => [...prev, { sender: 'ai', text: answer, matchedDoc: matchedDocName }]);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-[#FF5C00] font-bold text-xs uppercase tracking-wide">
              TRUNG TÂM CẤU HÌNH AI
            </span>
            <h2 className="text-xl font-bold text-slate-800">Quản trị Trí tuệ Nhân tạo (AI Studio)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tiêu chí nhận xét gia sư, chỉ đạo phong cách viết tự nhiên cho Gemini và thiết lập quy tắc phản hồi cho bot SOP vận hành.
          </p>
        </div>

        {/* 3 Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl overflow-x-auto border border-slate-200/80 self-start lg:self-auto text-xs">
          <button
            onClick={() => setActiveTab('criteria')}
            className={`px-3.5 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'criteria' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TreePine className="w-4 h-4" />
            <span>Tiêu chí Nhận xét &amp; Chỉ đạo AI</span>
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3.5 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'knowledge' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tài liệu Tri thức SOP</span>
          </button>
          <button
            onClick={() => setActiveTab('rag-config')}
            className={`px-3.5 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rag-config' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cấu hình AI &amp; Sandbox</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: TIÊU CHÍ NHẬN XÉT & CHỈ ĐẠO AI ================= */}
      {activeTab === 'criteria' && (
        <div className="space-y-6">
          {/* Banner giải thích cơ chế */}
          <div className="bg-gradient-to-r from-orange-50/80 via-blue-50/60 to-purple-50/60 border border-orange-200/80 rounded-xl p-4 flex items-start gap-3.5 text-xs text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-slate-800">Cơ chế Sinh nhận xét Tự động (Autonomous Prose Generation):</div>
              <p className="leading-relaxed">
                Quản trị viên <strong>chỉ cần quản lý các Danh mục &amp; Tiêu chí con</strong> để Gia sư tick chọn sau ca dạy. Khi kết nối API Gemini, hệ thống sẽ gom tất cả các đáp án gia sư đã tick cùng lời dặn dò, đưa vào <em>Chỉ đạo Sư phạm (System Instruction)</em> để AI <strong>tự động hành văn thành đoạn nhận xét hoàn chỉnh</strong>, mượt mà và giàu cảm xúc!
              </p>
            </div>
          </div>

          {/* Bộ lọc môn & Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-700">Môn học cấu hình:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setCurrentSubject('TOAN')}
                  className={`px-3.5 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    currentSubject === 'TOAN' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Môn Toán
                </button>
                <button
                  onClick={() => setCurrentSubject('ENG')}
                  className={`px-3.5 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    currentSubject === 'ENG' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Môn Tiếng Anh
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={openAddCategory}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-[#FF5C00]" />
                <span>+ Thêm Danh mục</span>
              </button>
              <button
                onClick={() => openAddCriterion()}
                className="px-4 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tạo Tiêu chí &amp; Đáp án</span>
              </button>
            </div>
          </div>

          {/* Bố cục 2 Cột */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái (7/12): Cây danh mục tiêu chí & đáp án tick */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Cấu trúc Tiêu chí nhận xét môn {currentSubject === 'TOAN' ? 'Toán' : 'Tiếng Anh'}
                  </h3>
                  <span className="text-[11px] text-slate-400">Gia sư tick chọn sau ca học</span>
                </div>

                <div className="space-y-4">
                  {filteredCategories.map((cat, cIdx) => (
                    <div key={cat.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-orange-100 text-[#FF5C00] font-bold flex items-center justify-center text-xs">
                            {cIdx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-800">{cat.name}</span>
                          <span className="text-[10px] text-slate-400">({cat.criteria.length} tiêu chí con)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openAddCriterion(cat.id)}
                            className="px-2 py-1 bg-white hover:bg-orange-50 text-[#FF5C00] font-bold text-[11px] rounded border border-slate-200"
                          >
                            + Tiêu chí
                          </button>
                          <button onClick={() => openEditCategory(cat)} className="p-1 hover:text-[#FF5C00] text-slate-400">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1 hover:text-rose-600 text-slate-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-3">
                        {cat.criteria.map(cri => (
                          <div key={cri.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-800">{cri.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditCriterion(cat.id, cri.id)}
                                  className="p-1 text-slate-400 hover:text-[#FF5C00]"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Xóa tiêu chí "${cri.name}"?`)) {
                                      setCriteriaCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id
                                            ? { ...c, criteria: c.criteria.filter(cr => cr.id !== cri.id) }
                                            : c
                                        )
                                      );
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cri.options.map(opt => (
                                <div key={opt.id} className="p-2 rounded-md bg-white border border-slate-200 text-[11px] flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
                                  <span className="text-slate-700">{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột phải (5/12): Chỉ đạo phong cách & Mô phỏng gia sư */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: Tone of voice & System instruction */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#FF5C00]" />
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Chỉ đạo Phong cách &amp; Giọng văn AI</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-[#FF5C00]">System Instruction</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phong cách giọng văn (Tone of Voice):</label>
                  <select
                    value={activeToneKey}
                    onChange={e => setActiveToneKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-medium text-slate-800 bg-white"
                  >
                    <option value="khich-le">Khích lệ, ân cần &amp; Khen ngợi (Khuyến nghị cho Tiểu học)</option>
                    <option value="chuan-muc">Sư phạm chuẩn mực &amp; Khách quan</option>
                    <option value="nghiem-can">Nhắc nhở nhẹ nhàng, rèn nếp cẩn thận</option>
                    <option value="ngan-gon">Ngắn gọn, súc tích (Tối ưu Zalo/SMS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chỉ đạo Sư phạm cốt lõi cho Gemini:</label>
                  <textarea
                    rows={4}
                    value={toneDirectives[activeToneKey]?.directive || ''}
                    onChange={e => {
                      const text = e.target.value;
                      setToneDirectives(prev => ({
                        ...prev,
                        [activeToneKey]: { ...prev[activeToneKey], directive: text }
                      }));
                    }}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-200 text-slate-700 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => showToast('Đã lưu chỉ đạo phong cách sư phạm cho AI nhận xét thành công!', 'success')}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Lưu chỉ đạo AI nhận xét
                  </button>
                </div>
              </div>

              {/* Card 2: Tutor Simulator */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF5C00]" />
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Mô phỏng Giao diện Gia sư sau ca dạy</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">Tutor View Simulator</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Học sinh: Nguyễn Minh Khang</div>
                    <div className="text-[11px] text-slate-500">Lớp: TOAN-3A1 &bull; Ca Tối 1</div>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">Buổi 12/24</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lời dặn dò riêng của Thầy/Cô:</label>
                  <input
                    type="text"
                    value={simCustomNote}
                    onChange={e => setSimCustomNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Hạn mức AI: <span className="font-bold text-emerald-600">Đã dùng {simUsageCount}/2 lần</span>
                  </span>
                  <button
                    onClick={handleSimulateAiGeneration}
                    className="px-3.5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sinh nhận xét bằng AI</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Kết quả nhận xét AI tự động sinh:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(simResultText);
                        showToast('Đã sao chép nhận xét vào bộ nhớ đệm!', 'success');
                      }}
                      className="text-[11px] text-[#FF5C00] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Sao chép
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                    {simResultText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TÀI LIỆU TRI THỨC SOP ================= */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Cơ sở Tri thức SOP Vận hành</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tải lên các văn bản ngắn hoặc chỉnh sửa trực tiếp nội dung quy chế để AI tra cứu giải đáp giáo viên</p>
            </div>
            <button
              onClick={() => {
                setEditingDocId(null);
                setDocTitle('');
                setDocCategory('Sự cố & Báo nghỉ');
                setDocSummary('');
                setDocContent('');
                setIsDocModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm văn bản SOP mới</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tên quy chế / Hướng dẫn SOP</th>
                    <th className="py-3 px-4">Phân loại</th>
                    <th className="py-3 px-4">Nội dung tóm tắt</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4">Trạng thái AI</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sopDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{doc.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">{doc.category}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{doc.summary}</td>
                      <td className="py-3 px-4 text-slate-500">{doc.updatedAt}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> Đã Index
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditDocument(doc)}
                            className="px-2.5 py-1 rounded bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Sửa nội dung
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Xóa văn bản "${doc.title}"?`)) {
                                setSopDocuments(prev => prev.filter(d => d.id !== doc.id));
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
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
        </div>
      )}

      {/* ================= TAB 3: CẤU HÌNH AI VẬN HÀNH & SANDBOX ================= */}
      {activeTab === 'rag-config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái (6/12): Cấu hình */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Cấu hình Quy tắc Phản hồi của AI Vận hành</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">AI Rules</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">1. Câu chào mở đầu (Welcome Greeting):</label>
                <textarea
                  rows={2}
                  value={ragBotConfig.welcomeGreeting}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, welcomeGreeting: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">2. Giọng văn &amp; Cách xưng hô:</label>
                <input
                  type="text"
                  value={ragBotConfig.personaTone}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, personaTone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">3. Chỉ trả lời trong tài liệu SOP (Strict Grounding)</div>
                  <div className="text-[11px] text-slate-500">Tuyệt đối không tự suy diễn ngoài tài liệu SOP</div>
                </div>
                <input
                  type="checkbox"
                  checked={ragBotConfig.strictGroundingOnly}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, strictGroundingOnly: e.target.checked }))}
                  className="accent-[#FF5C00] w-5 h-5 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">4. Câu trả lời khi KHÔNG có trong tài liệu (Fallback Response):</label>
                <textarea
                  rows={3}
                  value={ragBotConfig.fallbackResponse}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, fallbackResponse: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => showToast('Đã lưu toàn bộ cấu hình AI Vận hành thành công!', 'success')}
                  className="px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu cấu hình AI Vận hành
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải (6/12): Sandbox */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-[650px] overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center font-bold text-sm">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Sandbox Thử nghiệm AI Vận hành</h4>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Trực tuyến theo cấu hình
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSandboxMessages([{ sender: 'ai', text: ragBotConfig.welcomeGreeting }])}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              {/* Chat body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {sandboxMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-lg bg-[#FF5C00] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        AI
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#FF5C00] text-white rounded-tr-sm'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {msg.matchedDoc && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-400">
                          Trích dẫn: {msg.matchedDoc}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick prompts */}
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5 text-[10px]">
                {ragBotConfig.quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSandboxInput(p);
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-[#FF5C00] text-slate-600 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Input form */}
              <form onSubmit={handleSandboxSend} className="p-3 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={sandboxInput}
                  onChange={e => setSandboxInput(e.target.value)}
                  placeholder="Gõ câu hỏi thử nghiệm cho bot SOP..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Danh mục */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                {editingCatId ? 'Chỉnh sửa Danh mục Tiêu chí' : 'Thêm Danh mục Tiêu chí mới'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Danh mục tiêu chí</label>
                <input
                  type="text"
                  required
                  value={catNameInput}
                  onChange={e => setCatNameInput(e.target.value)}
                  placeholder="Ví dụ: 1. Mức độ tập trung & Kỷ luật giờ giấc"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#FF5C00] text-white font-bold cursor-pointer"
                >
                  Lưu Danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Tiêu chí & Đáp án */}
      {isCriModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                {editingCriId ? 'Chỉnh sửa Tiêu chí & Đáp án' : 'Tạo Tiêu chí & Đáp án Lựa chọn'}
              </h3>
              <button onClick={() => setIsCriModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCriterion} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thuộc Danh mục:</label>
                <select
                  value={selectedParentCatId}
                  onChange={e => setSelectedParentCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Tiêu chí (Câu hỏi):</label>
                <input
                  type="text"
                  required
                  value={criNameInput}
                  onChange={e => setCriNameInput(e.target.value)}
                  placeholder="Ví dụ: Mức độ tập trung trong ca học"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Các đáp án cho Gia sư tick:</label>
                  <button
                    type="button"
                    onClick={() => setCriOptionsInput(prev => [...prev, 'Đáp án mới'])}
                    className="text-[#FF5C00] font-bold hover:underline cursor-pointer"
                  >
                    + Thêm đáp án
                  </button>
                </div>
                <div className="space-y-2">
                  {criOptionsInput.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const val = e.target.value;
                          setCriOptionsInput(prev => prev.map((item, i) => (i === idx ? val : item)));
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setCriOptionsInput(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCriModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#FF5C00] text-white font-bold cursor-pointer"
                >
                  Lưu Tiêu chí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Tài liệu SOP */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                {editingDocId ? 'Chỉnh sửa tài liệu SOP' : 'Thêm văn bản SOP mới'}
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDocument} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tài liệu (.txt, .pdf)</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại nghiệp vụ</label>
                  <select
                    value={docCategory}
                    onChange={e => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Sự cố & Báo nghỉ">Sự cố &amp; Báo nghỉ ca dạy</option>
                    <option value="Chốt công & Đối soát">Chốt công &amp; Đối soát</option>
                    <option value="Quy chuẩn sư phạm">Quy chuẩn ứng xử sư phạm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung tóm tắt ngắn:</label>
                <input
                  type="text"
                  value={docSummary}
                  onChange={e => setDocSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết tài liệu (dùng để AI phân tích và tra cứu):</label>
                <textarea
                  rows={8}
                  required
                  value={docContent}
                  onChange={e => setDocContent(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#FF5C00] text-white font-bold cursor-pointer"
                >
                  Lưu &amp; Cập nhật Vector Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
