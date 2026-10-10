import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CriteriaCategory, SOPDocument, RAGBotConfig } from '../types';
import { findKnowledgeDocument } from '../lib/knowledgeSearch';
import { extractDocumentText } from '../lib/documentExtraction';
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
  Cpu,
  Search,
  FileText,
  Eye,
  Upload,
  ToggleLeft,
  ToggleRight
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
    subjects,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'criteria' | 'knowledge' | 'rag-config'>('criteria');
  const activeSubjects = subjects.filter(subject => subject.status);
  const enabledKnowledgeDocuments = sopDocuments.filter(document => document.isEnabled !== false);
  const [currentSubject, setCurrentSubject] = useState('TOAN');
  const [criterionSubjectKeys, setCriterionSubjectKeys] = useState<string[]>(['TOAN']);

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
  const [docSourceFileName, setDocSourceFileName] = useState('');
  const [docSourceFileType, setDocSourceFileType] = useState<'PDF' | 'DOCX' | undefined>();
  const [isExtractingDocument, setIsExtractingDocument] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<SOPDocument | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState('ALL');

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
  const filteredDocuments = sopDocuments.filter(document => {
    const query = documentSearch.trim().toLocaleLowerCase('vi');
    const matchesSearch = !query || `${document.title} ${document.sourceFileName || ''} ${document.summary}`.toLocaleLowerCase('vi').includes(query);
    return matchesSearch && (documentCategoryFilter === 'ALL' || document.category === documentCategoryFilter);
  });

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
    const targetCategory = filteredCategories.find(category => category.id === preCatId) || filteredCategories[0];
    setSelectedParentCatId(targetCategory?.id || '');
    setCriterionSubjectKeys([targetCategory?.subject || currentSubject]);
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
    if (!cat || !cri) return;

    setEditingCriId(criId);
    setSelectedParentCatId(catId);
    setCriterionSubjectKeys([cat.subject]);
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

    const sourceCategory = criteriaCategories.find(category => category.id === selectedParentCatId);
    if (!sourceCategory || criterionSubjectKeys.length === 0) {
      showToast('Vui lòng chọn ít nhất một môn và danh mục tiêu chí.', 'error');
      return;
    }

    const sourceCriterion = editingCriId
      ? sourceCategory.criteria.find(criterion => criterion.id === editingCriId)
      : undefined;
    const targetCategoryName = sourceCategory.name;
    const previousCriterionName = sourceCriterion?.name;
    const nextCriterionName = criNameInput.trim();
    const timestamp = Date.now();

    setCriteriaCategories(previous => {
      let next = [...previous];
      criterionSubjectKeys.forEach((subjectKey, subjectIndex) => {
        let categoryIndex = next.findIndex(category =>
          category.subject === subjectKey && category.name === targetCategoryName
        );
        if (categoryIndex < 0) {
          next.push({
            id: `CAT_${subjectKey}_${timestamp}_${subjectIndex}`,
            subject: subjectKey,
            name: targetCategoryName,
            criteria: []
          });
          categoryIndex = next.length - 1;
        }

        const category = next[categoryIndex];
        if (!category) return;
        const criterionIndex = subjectKey === sourceCategory.subject && sourceCriterion
          ? category.criteria.findIndex(criterion => criterion.id === sourceCriterion.id)
          : category.criteria.findIndex(criterion => criterion.name === previousCriterionName || criterion.name === nextCriterionName);
        const criterion = { id: `CRI_${timestamp}_${subjectIndex}`, name: nextCriterionName, options: validOptions };
        const criteria = [...category.criteria];
        if (criterionIndex >= 0) criteria[criterionIndex] = { ...criteria[criterionIndex], ...criterion, id: criteria[criterionIndex].id };
        else criteria.push(criterion);
        next[categoryIndex] = { ...category, criteria };
      });
      return next;
    });

    showToast(`Đã lưu tiêu chí cho ${criterionSubjectKeys.length} môn học!`, 'success');
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
      const subjectText = activeSubjects.find(subject => subject.abbr === currentSubject)?.name || currentSubject;
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
    setDocSourceFileName(doc.sourceFileName || '');
    setDocSourceFileType(doc.sourceFileType);
    setIsExtractingDocument(false);
    setIsDocModalOpen(true);
  };

  const handleDocumentFileSelect = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      showToast('Chỉ hỗ trợ tải tài liệu PDF hoặc DOCX.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Tệp vượt quá giới hạn 10 MB. Vui lòng chọn tệp nhỏ hơn.', 'error');
      return;
    }

    setIsExtractingDocument(true);
    try {
      const content = await extractDocumentText(file);
      setDocContent(content);
      setDocTitle(previous => previous.trim() ? previous : file.name.replace(/\.(pdf|docx)$/i, ''));
      setDocSourceFileName(file.name);
      setDocSourceFileType(extension === 'pdf' ? 'PDF' : 'DOCX');
      setDocSummary(previous => previous.trim() ? previous : content.replace(/\s+/g, ' ').slice(0, 180));
      showToast('Đã đọc nội dung tài liệu. Kiểm tra thông tin rồi lưu để đưa vào phạm vi tra cứu bot.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đọc tài liệu đã chọn.', 'error');
    } finally {
      setIsExtractingDocument(false);
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExtractingDocument) {
      showToast('Vui lòng đợi đọc xong tệp trước khi lưu.', 'warning');
      return;
    }
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
                sourceFileName: docSourceFileName || d.sourceFileName,
                sourceFileType: docSourceFileType || d.sourceFileType,
                updatedAt: new Date().toLocaleDateString('vi-VN')
              }
            : d
        )
      );
      showToast('Đã cập nhật tài liệu trong phạm vi tra cứu bot.', 'success');
    } else {
      const newDoc: SOPDocument = {
        id: `DOC-${Date.now()}`,
        title: docTitle.trim(),
        category: docCategory,
        summary: docSummary.trim() || 'Quy chuẩn vận hành mới',
        content: docContent.trim(),
        sourceFileName: docSourceFileName,
        sourceFileType: docSourceFileType,
        isEnabled: true,
        updatedAt: new Date().toLocaleDateString('vi-VN')
      };
      setSopDocuments(prev => [...prev, newDoc]);
      showToast('Đã thêm tài liệu vào phạm vi tra cứu bot.', 'success');
    }
    setIsDocModalOpen(false);
  };

  const toggleDocumentScope = (document: SOPDocument) => {
    const isEnabled = document.isEnabled !== false;
    setSopDocuments(previous => previous.map(item =>
      item.id === document.id ? { ...item, isEnabled: !isEnabled } : item
    ));
    showToast(
      isEnabled ? 'Đã loại tài liệu khỏi phạm vi tra cứu bot.' : 'Đã thêm tài liệu vào phạm vi tra cứu bot.',
      'info'
    );
  };

  // Sandbox chat
  const handleSandboxSend = (e: React.FormEvent) => {
    e.preventDefault();
    const query = sandboxInput.trim();
    if (!query) return;

    setSandboxMessages(prev => [...prev, { sender: 'user', text: query }]);
    setSandboxInput('');

    setTimeout(() => {
      const document = findKnowledgeDocument(query, sopDocuments);
      setSandboxMessages(prev => [...prev, {
        sender: 'ai',
        text: document ? document.content : ragBotConfig.fallbackResponse,
        matchedDoc: document?.title
      }]);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-800">Trợ lý AI</h1>

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
            <span>Tài liệu tri thức</span>
          </button>
          <button
            onClick={() => setActiveTab('rag-config')}
            className={`px-3.5 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rag-config' ? 'bg-white text-[#FF5C00] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Bot chat AI</span>
          </button>
        </div>
      </div>

      {activeTab === 'criteria' && (
        <div className="space-y-6">
          {/* Bộ lọc môn & Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                Môn đang xem:
                <select
                  value={currentSubject}
                  onChange={event => setCurrentSubject(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800"
                >
                  {activeSubjects.map(subject => <option key={subject.id} value={subject.abbr}>{subject.name}</option>)}
                </select>
              </label>
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
                    Cấu trúc tiêu chí nhận xét · {activeSubjects.find(subject => subject.abbr === currentSubject)?.name || currentSubject}
                  </h3>
                  <span className="text-[11px] text-slate-400">Gia sư tick chọn sau ca học</span>
                </div>

                <div className="space-y-4">
                  {!filteredCategories.length && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                      <div className="font-semibold text-slate-700">Môn học này chưa có bộ tiêu chí</div>
                      <p className="mt-1 text-[11px] text-slate-500">Tạo danh mục trước, sau đó thêm tiêu chí và đáp án để giáo viên sử dụng.</p>
                    </div>
                  )}
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Thư viện tài liệu tri thức</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tải PDF/DOCX để làm nguồn tham khảo cho Bot chat AI.</p>
            </div>
            <button
              onClick={() => {
                setEditingDocId(null);
                setDocTitle('');
                setDocCategory('Sự cố & Báo nghỉ');
                setDocSummary('');
                setDocContent('');
                setDocSourceFileName('');
                setDocSourceFileType(undefined);
                setIsExtractingDocument(false);
                setIsDocModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#FF5C00] hover:bg-[#E05200] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Thêm tài liệu</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={documentSearch}
                onChange={event => setDocumentSearch(event.target.value)}
                placeholder="Tìm tên hoặc tóm tắt tài liệu..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-300"
              />
            </label>
            <select
              value={documentCategoryFilter}
              onChange={event => setDocumentCategoryFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <option value="ALL">Tất cả phân loại</option>
              {[...new Set(sopDocuments.map(document => document.category))].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tài liệu</th>
                    <th className="py-3 px-4">Phân loại</th>
                    <th className="py-3 px-4">Tóm tắt</th>
                    <th className="py-3 px-4">Phạm vi Bot</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5C00]" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800">{doc.title}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {doc.sourceFileName || 'Tài liệu mẫu'}{doc.sourceFileType ? ` · ${doc.sourceFileType}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">{doc.category}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{doc.summary}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleDocumentScope(doc)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${doc.isEnabled === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}
                          title={doc.isEnabled === false ? 'Bấm để đưa tài liệu vào phạm vi bot' : 'Bấm để loại tài liệu khỏi phạm vi bot'}
                        >
                          {doc.isEnabled === false ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          {doc.isEnabled === false ? 'Đang tắt' : 'Đang dùng'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDocument(doc)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Xem nội dung đã trích xuất"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditDocument(doc)}
                            className="px-2.5 py-1 rounded bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-xs flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Sửa
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
                  {!filteredDocuments.length && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        {sopDocuments.length ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu. Tải PDF hoặc DOCX để thêm nguồn cho bot.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
              Tài liệu đang dùng được tra cứu trong bản demo bằng tìm kiếm từ khóa; bản gốc chưa tải lên máy chủ/CSDL và chưa tạo vector index.
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CẤU HÌNH BOT CHAT AI ================= */}
      {activeTab === 'rag-config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái (6/12): Cấu hình */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Cấu hình Bot chat AI</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">AI Rules</span>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800">Phạm vi trả lời: tài liệu tri thức đang bật</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      Bot chỉ tra cứu nội dung tài liệu được bật ở tab Tài liệu tri thức. Nếu không tìm thấy căn cứ phù hợp, bot sẽ dùng câu trả lời bên dưới; không tự trả lời ngoài phạm vi này.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-orange-700">
                    {enabledKnowledgeDocuments.length} tài liệu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('knowledge')}
                  className="mt-2 text-[11px] font-bold text-[#E05200] hover:underline"
                >
                  Quản lý tài liệu tri thức
                </button>
                {!enabledKnowledgeDocuments.length && (
                  <p className="mt-2 text-[11px] font-semibold text-rose-700">
                    Chưa có tài liệu nào được bật. Bot sẽ chỉ hiển thị câu trả lời khi không tìm thấy căn cứ.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Câu chào mở đầu</label>
                <textarea
                  rows={2}
                  value={ragBotConfig.welcomeGreeting}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, welcomeGreeting: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giọng văn &amp; cách xưng hô</label>
                <input
                  type="text"
                  value={ragBotConfig.personaTone}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, personaTone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Câu trả lời khi không tìm thấy căn cứ trong tài liệu</label>
                <textarea
                  rows={3}
                  value={ragBotConfig.fallbackResponse}
                  onChange={e => setRagBotConfig(prev => ({ ...prev, fallbackResponse: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 leading-relaxed"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block font-semibold text-slate-700">Câu hỏi gợi ý trong khung chat</label>
                  <button
                    type="button"
                    onClick={() => setRagBotConfig(previous => ({ ...previous, quickPrompts: [...previous.quickPrompts, ''] }))}
                    className="inline-flex shrink-0 items-center gap-1 font-bold text-[#E05200] hover:underline"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>
                <div className="space-y-2">
                  {ragBotConfig.quickPrompts.map((prompt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={prompt}
                        onChange={event => setRagBotConfig(previous => ({
                          ...previous,
                          quickPrompts: previous.quickPrompts.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                        }))}
                        placeholder="Ví dụ: Quy trình báo nghỉ ca dạy?"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => setRagBotConfig(previous => ({
                          ...previous,
                          quickPrompts: previous.quickPrompts.filter((_, itemIndex) => itemIndex !== index)
                        }))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Xóa câu hỏi gợi ý ${index + 1}`}
                        title="Xóa câu hỏi gợi ý"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {!ragBotConfig.quickPrompts.length && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      Chưa có câu hỏi gợi ý. Giáo viên vẫn có thể tự nhập câu hỏi.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => showToast('Đã lưu cấu hình Bot chat AI!', 'success')}
                  className="px-4 py-2 bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu cấu hình Bot chat AI
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
                    <h4 className="font-bold text-xs text-slate-800">Thử nghiệm Bot chat AI</h4>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Mô phỏng tra cứu · Chưa kết nối Gemini
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
                {ragBotConfig.quickPrompts.filter(prompt => prompt.trim()).map((p, idx) => (
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
                  placeholder="Đặt câu hỏi trong phạm vi kho tài liệu..."
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
                <label className="block font-semibold text-slate-700 mb-1">Áp dụng cho môn học:</label>
                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700">
                    <span>{criterionSubjectKeys.length ? `${criterionSubjectKeys.length} môn được chọn` : 'Chọn môn học'}</span>
                    <span className="text-slate-400">▾</span>
                  </summary>
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                    {activeSubjects.map(subject => (
                      <label key={subject.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={criterionSubjectKeys.includes(subject.abbr)}
                          onChange={event => {
                            setCriterionSubjectKeys(previous => event.target.checked
                              ? [...previous, subject.abbr]
                              : previous.filter(key => key !== subject.abbr));
                          }}
                          className="accent-[#FF5C00]"
                        />
                        <span>{subject.name}</span>
                      </label>
                    ))}
                  </div>
                </details>
                <p className="mt-1 text-[10px] text-slate-500">
                  Chọn nhiều môn để thêm hoặc đồng bộ cùng tiêu chí và đáp án vào từng môn.
                </p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Danh mục mẫu của môn {activeSubjects.find(subject => subject.abbr === currentSubject)?.name || currentSubject}:
                </label>
                <select
                  value={selectedParentCatId}
                  onChange={e => {
                    setSelectedParentCatId(e.target.value);
                    if (!editingCriId) setCriterionSubjectKeys(previous => [...new Set([...previous, currentSubject])]);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {!filteredCategories.length && <option value="">Chưa có danh mục cho môn này</option>}
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên tiêu chí:</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị</label>
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

              <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/50 p-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingDocId ? 'Tải tệp PDF/DOCX thay thế (không bắt buộc)' : 'Tải tài liệu nguồn PDF/DOCX'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={isExtractingDocument}
                  onChange={event => void handleDocumentFileSelect(event.target.files?.[0])}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:font-semibold file:text-slate-700 disabled:opacity-50"
                />
                {docSourceFileName && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {docSourceFileName} · {docSourceFileType}
                  </p>
                )}
                {isExtractingDocument ? (
                  <p className="mt-1 text-[10px] font-medium text-orange-700">Đang trích xuất văn bản từ tài liệu...</p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500">Hỗ trợ PDF có lớp văn bản và DOCX, tối đa 10 MB. PDF scan cần OCR nên hiện chưa đọc được.</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả ngắn để quản trị viên nhận biết:</label>
                <input
                  type="text"
                  value={docSummary}
                  onChange={e => setDocSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                {docContent
                  ? `Đã trích xuất ${docContent.length.toLocaleString('vi-VN')} ký tự. Nội dung này được dùng làm phạm vi trả lời của bot.`
                  : 'Chưa có nội dung tài liệu. Hãy chọn một tệp PDF hoặc DOCX để hệ thống trích xuất văn bản.'}
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
                  disabled={isExtractingDocument || !docContent.trim()}
                  className="px-4 py-2 rounded-lg bg-[#FF5C00] text-white font-bold cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Lưu tài liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-800">{viewingDocument.title}</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {viewingDocument.sourceFileName || 'Tài liệu mẫu'} · {viewingDocument.category} · Cập nhật {viewingDocument.updatedAt}
                </p>
              </div>
              <button type="button" onClick={() => setViewingDocument(null)} className="ml-3 text-slate-400 hover:text-slate-700" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="mb-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">{viewingDocument.summary}</div>
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-700">{viewingDocument.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
