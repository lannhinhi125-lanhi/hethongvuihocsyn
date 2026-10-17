import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import { GeminiConnectionStatus } from '../components/GeminiConnectionStatus';
import { ChatMessageText } from '../components/ChatMessageText';
import {additionalAIInstructions,responseLength,responseStylePrompt,type ResponseLength} from '../lib/aiResponseStyle';
import { useBusinessValue,waitForBusinessSave } from '../lib/businessPersistence';
import { ASSISTANT_QUICK_PROMPTS } from '../lib/assistantPrompts';
import { confirmAction } from '../components/ConfirmAction';
import { PaginatedList } from '../components/Pagination';
import { PaginatedTableBody } from '../components/Pagination';
import { usePermissions } from '../hooks/usePermissions';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SOPDocument, RAGBotConfig, DocumentCategory } from '../types';
import { useKnowledgeChat } from '../hooks/useKnowledgeChat';
import { extractDocumentText } from '../lib/documentExtraction';
import {
  Sparkles,
  BookOpen,
  Sliders,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Send,
  RotateCcw,
  CheckCircle,
  Brain,
  Search,
  FileText,
  Eye,
  Upload,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const Module6_AIStudio: React.FC = () => {
  const {confirmSave,isSavingChanges}=useSaveConfirmation();
  const { can, requirePermission } = usePermissions();
  const {
    sopDocuments,
    setSopDocuments,
    ragBotConfig,
    setRagBotConfig,
    showToast
  } = useApp();

  const [documentCategories]=useBusinessValue<DocumentCategory[]>('document_categories');
  const [savingDocument,setSavingDocument]=useState(false);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'rag-config'>('knowledge');
  const enabledKnowledgeDocuments = sopDocuments.filter(document => document.isEnabled !== false);
  // Document Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docSummary, setDocSummary] = useState('');
  const [docDriveUrl, setDocDriveUrl] = useState('');
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
  const sandboxChat=useKnowledgeChat(sopDocuments,ragBotConfig.personaTone,ragBotConfig.fallbackResponse,ragBotConfig.systemPrompt);

  // Filtered categories
  const filteredDocuments = sopDocuments.filter(document => {
    const query = documentSearch.trim().toLocaleLowerCase('vi');
    const matchesSearch = !query || `${document.title} ${document.sourceFileName || ''} ${document.summary}`.toLocaleLowerCase('vi').includes(query);
    return matchesSearch && (documentCategoryFilter === 'ALL' || document.categoryId === documentCategoryFilter);
  });

  const openEditDocument = (doc: SOPDocument) => {
    if (!requirePermission("Quản lý kho tài liệu tri thức SOP")) return;
    setEditingDocId(doc.id);
    setDocTitle(doc.title);
    setDocCategory(doc.categoryId || '');
    setDocSummary(doc.summary);
    setDocContent(doc.content);
    setDocDriveUrl(doc.driveUrl || '');
    setDocSourceFileName(doc.sourceFileName || '');
    setDocSourceFileType(doc.sourceFileType);
    setIsExtractingDocument(false);
    setIsDocModalOpen(true);
  };

  const handleDocumentFileSelect = async (file?: File) => {
    if (!requirePermission("Quản lý kho tài liệu tri thức SOP")) return;
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

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirePermission("Quản lý kho tài liệu tri thức SOP")) return;
    e.preventDefault();
    if (isExtractingDocument) {
      showToast('Vui lòng đợi đọc xong tệp trước khi lưu.', 'warning');
      return;
    }
    if(savingDocument)return;
    if (!docTitle.trim() || (!docContent.trim() && !docDriveUrl.trim())) return;
    if (docDriveUrl.trim()) {
      try { const url = new URL(docDriveUrl.trim());
        if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) throw new Error();
      } catch { showToast('Nhập link Google Drive hoặc Google Docs hợp lệ (https).', 'warning'); return; }
    }
    const selectedCategory=documentCategories.find(category=>category.id===docCategory);
    const existing=sopDocuments.find(doc=>doc.id===editingDocId);
    if(!selectedCategory || (!selectedCategory.isActive && existing?.categoryId!==selectedCategory.id)) {showToast('Chọn loại tài liệu đang hoạt động trong danh mục.','warning');return;}
    setSavingDocument(true);

    if (editingDocId) {
      setSopDocuments(prev =>
        prev.map(d =>
          d.id === editingDocId
            ? {
                ...d,
                title: docTitle.trim(),
                categoryId:docCategory, category:selectedCategory.name,
                summary: docSummary.trim() || 'Quy chuẩn vận hành đã cập nhật',
                content: docContent.trim(),
                driveUrl: docDriveUrl.trim(),
                sourceFileName: docSourceFileName || d.sourceFileName,
                sourceFileType: docSourceFileType || d.sourceFileType,
                updatedAt: new Date().toLocaleDateString('vi-VN')
              }
            : d
        )
      );

    } else {
      const newDoc: SOPDocument = {
        id: `DOC-${Date.now()}`,
        title: docTitle.trim(),
        categoryId:docCategory, category:selectedCategory.name,
        summary: docSummary.trim() || 'Quy chuẩn vận hành mới',
        content: docContent.trim(),
        driveUrl: docDriveUrl.trim(),
        sourceFileName: docSourceFileName,
        sourceFileType: docSourceFileType,
        isEnabled: true,
        updatedAt: new Date().toLocaleDateString('vi-VN')
      };
      setSopDocuments(prev => [...prev, newDoc]);

    }
    try {await waitForBusinessSave();setIsDocModalOpen(false);showToast('Đã lưu tài liệu.','success');}
    catch(error){showToast(error instanceof Error ? error.message : 'Chưa lưu được tài liệu.','error');}
    finally{setSavingDocument(false);}
  };

  const toggleDocumentScope = (document: SOPDocument) => {
    if (!requirePermission("Quản lý kho tài liệu tri thức SOP")) return;
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
  const handleSandboxSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirePermission("Sử dụng chatbot tra cứu quy chế và nghiệp vụ")) return;
    e.preventDefault();
    const query = sandboxInput.trim();
    if (!query || sandboxChat.isAnswering) return;

    setSandboxMessages(prev => [...prev, { sender: 'user', text: query }]);
    setSandboxInput('');

    try {
      const text=await sandboxChat.answer(query);
      if(text!==null)setSandboxMessages(prev=>[...prev,{sender:'ai',text}]);
    }catch(error){
      setSandboxMessages(prev=>prev.slice(0,-1));setSandboxInput(query);
      showToast(error instanceof Error ? error.message : 'Chưa nhận được câu trả lời từ AI.','error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-800">Quản lý tri thức và cấu hình AI</h1>

        {/* Knowledge and chatbot tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl overflow-x-auto border border-slate-200/80 self-start lg:self-auto text-xs">
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
                setDocCategory(documentCategories.find(category=>category.isActive)?.id || '');
                setDocSummary('');
                setDocContent('');
                setDocDriveUrl('');
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
              {documentCategories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}
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
                <PaginatedTableBody className="divide-y divide-slate-100 font-medium">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5C00]" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800">{doc.title}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {doc.sourceFileName || (doc.driveUrl ? 'Google Drive' : 'Nội dung văn bản')}{doc.sourceFileType ? ` · ${doc.sourceFileType}` : ''}
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
                            onClick={async () => {
                              if (await confirmAction(`Xóa văn bản "${doc.title}"?`)) {
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
                </PaginatedTableBody>
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
                      Bot dùng tài liệu đang bật để tổng hợp và giải thích câu trả lời. Bot có thể thêm gợi ý chung, nhưng không tự đặt thêm quy định khi chưa có căn cứ.
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
                <label htmlFor="ai-response-length" className="block font-semibold text-slate-700 mb-1">Độ dài câu trả lời</label>
                <select id="ai-response-length" value={responseLength(ragBotConfig.systemPrompt)}
                  onChange={e=>setRagBotConfig(prev=>({...prev,systemPrompt:responseStylePrompt(e.target.value as ResponseLength,additionalAIInstructions(prev.systemPrompt))}))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200">
                  <option value="short">Ngắn gọn — ưu tiên 2–4 câu</option>
                  <option value="balanced">Vừa phải — ý chính và giải thích ngắn</option>
                  <option value="detailed">Chi tiết — giải thích và hướng dẫn từng bước</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">AI vẫn giữ đủ điều kiện quan trọng trong tài liệu dù chọn trả lời ngắn.</p>
              </div>
              <div>
                <label htmlFor="ai-extra-instructions" className="block font-semibold text-slate-700 mb-1">Hướng dẫn bổ sung</label>
                <textarea id="ai-extra-instructions" rows={3} value={additionalAIInstructions(ragBotConfig.systemPrompt)}
                  onChange={e=>setRagBotConfig(prev=>({...prev,systemPrompt:responseStylePrompt(responseLength(prev.systemPrompt),e.target.value)}))}
                  placeholder="Ví dụ: Xưng hô thầy/cô. Nêu ý chính trước, sau đó thêm một lời nhắc thân thiện."
                  className="w-full p-2.5 rounded-lg border border-slate-200 leading-relaxed" />
                <p className="mt-1 text-[11px] text-slate-500">Bấm Lưu cấu hình để lưu lại. Áp dụng cho câu trả lời tiếp theo ở cả chatbot quản trị và giáo viên.</p>
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

              <div className="flex justify-end pt-2">
                <button
                  disabled={isSavingChanges} onClick={() => void confirmSave(()=>showToast('Đã lưu cấu hình Bot chat AI!', 'success'))}
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
                      Gemini · Giải đáp dựa trên tài liệu
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {sandboxChat.reset();setSandboxInput('');setSandboxMessages([{ sender: 'ai', text: ragBotConfig.welcomeGreeting }]);}}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              {can('Sử dụng chatbot tra cứu quy chế và nghiệp vụ') && <GeminiConnectionStatus />}
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
                      <ChatMessageText text={msg.text} format={msg.sender==='ai'} />
                      {msg.matchedDoc && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-400">
                          Trích dẫn: {msg.matchedDoc}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sandboxChat.isAnswering && <p role="status" className="text-slate-500 animate-pulse">AI đang soạn câu trả lời…</p>}
              </div>

              {/* Quick prompts */}
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5 text-[10px]">
                {ASSISTANT_QUICK_PROMPTS.map((p, idx) => (
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
                  disabled={sandboxChat.isAnswering || !sandboxInput.trim()}
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
                    required value={docCategory}
                    onChange={e => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="" disabled>Chọn loại tài liệu</option>
                    {documentCategories.filter(category=>category.isActive || category.id===docCategory).map(category=><option key={category.id} value={category.id}>{category.name}{!category.isActive?' (ngừng sử dụng)':''}</option>)}
                  </select>
                </div>
              </div>

              <label className="block font-semibold text-slate-700">Link Google Drive / Google Docs
                <input type="url" value={docDriveUrl} onChange={event => setDocDriveUrl(event.target.value)} placeholder="https://drive.google.com/file/d/.../view" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" />
                <span className="mt-1 block text-[11px] font-normal text-slate-500">Để bot tra cứu tài liệu này, tải tệp hoặc nhập nội dung bên dưới.</span>
              </label>
              <p className="text-[11px] text-slate-500">Thêm, sửa loại tài liệu tại Danh mục dùng chung → Loại tài liệu.</p>
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

              <label className="block font-semibold text-slate-700">Nội dung tài liệu để bot tra cứu
                <textarea value={docContent} onChange={event => setDocContent(event.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" />
              </label>
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
                  disabled={savingDocument || isExtractingDocument || (!docContent.trim() && !docDriveUrl.trim()) || !docCategory}
                  className="px-4 py-2 rounded-lg bg-[#FF5C00] text-white font-bold cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {savingDocument ? 'Đang lưu...' : 'Lưu tài liệu'}
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
              {viewingDocument.driveUrl && <a href={viewingDocument.driveUrl} target="_blank" rel="noopener noreferrer" className="mb-3 inline-block text-xs text-orange-600 underline">Mở tài liệu trên Google Drive</a>}
              {!viewingDocument.content && <p className="text-xs text-slate-500">Tài liệu mới lưu link nguồn, chưa có nội dung để bot tra cứu.</p>}
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-700">{viewingDocument.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
