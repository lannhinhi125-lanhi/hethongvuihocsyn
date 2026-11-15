import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Search,X,ArrowRight,ExternalLink,Pencil} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {canAccessModule} from '../lib/accessControl';
import {searchGuide,systemGuideTopics,DETAILED_GUIDE_URLS,type SystemGuideTopic} from '../lib/systemGuide';

const GUIDE_STORAGE_KEY = 'vuihoc_detailed_guide_urls';

function getStoredGuideUrl(portal: 'ADMIN' | 'TEACHER'): string {
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[portal] === 'string' && parsed[portal].trim()) {
        return parsed[portal].trim();
      }
    }
  } catch {}
  return DETAILED_GUIDE_URLS[portal] || 'https://drive.google.com';
}

export function SystemGuide() {
 const {workspaceMode,currentUser,roleGroups,activeModule,teacherPortalTab,setActiveModule,setTeacherPortalTab,showToast}=useApp();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState('');
 const [guideUrl,setGuideUrl]=useState(()=>getStoredGuideUrl(workspaceMode));
 const [isEditingUrl,setIsEditingUrl]=useState(false);
 const [urlDraft,setUrlDraft]=useState('');
 const dialog=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),headingId=useId();
 const topics=systemGuideTopics.filter(topic=>topic.portal===workspaceMode&&canAccessModule(currentUser,roleGroups,topic.moduleId));
 const filtered=searchGuide(topics,query),topic=filtered.find(t=>t.id===selected)||filtered[0];
 const currentId=workspaceMode==='ADMIN'?`admin-${activeModule}`:`teacher-${teacherPortalTab==='payroll'?'reconcile':teacherPortalTab}`;
 const show=()=>{setQuery('');setSelected(currentId);setOpen(true);};

 useEffect(()=>{
  setGuideUrl(getStoredGuideUrl(workspaceMode));
  setIsEditingUrl(false);
 },[workspaceMode,open]);

 useEffect(()=>{
  const onStorage=()=>setGuideUrl(getStoredGuideUrl(workspaceMode));
  window.addEventListener('storage',onStorage);
  return()=>window.removeEventListener('storage',onStorage);
 },[workspaceMode]);

 const handleSaveGuideUrl=(e:React.FormEvent)=>{
  e.preventDefault();
  const clean=urlDraft.trim();
  if(!clean)return;
  try{
    const raw=localStorage.getItem(GUIDE_STORAGE_KEY);
    const prev=raw?JSON.parse(raw):{};
    const next={...prev,[workspaceMode]:clean};
    if(!next.ADMIN)next.ADMIN=clean;
    if(!next.TEACHER)next.TEACHER=clean;
    localStorage.setItem(GUIDE_STORAGE_KEY,JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  }catch{}
  setGuideUrl(clean);
  setIsEditingUrl(false);
  showToast('Đã lưu đường link hướng dẫn sử dụng chi tiết!','success');
 };
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';const frame=requestAnimationFrame(()=>search.current?.focus());
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
   if(event.key!=='Tab')return;
   const elements=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
   const first=elements[0],last=elements.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  document.addEventListener('keydown',onKey);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',onKey);document.body.style.overflow=overflow;previous?.focus();};
 },[open]);
 useEffect(()=>{setOpen(false);},[currentUser.id,workspaceMode]);
 const navigate=(destination:SystemGuideTopic)=>{
  if(!canAccessModule(currentUser,roleGroups,destination.moduleId)){showToast('Bạn chưa được cấp quyền mở chức năng này.','warning');return;}
  if(typeof destination.target==='number')setActiveModule(destination.target);else setTeacherPortalTab(destination.target);
  setOpen(false);
 };
 return <>
  <button type="button" onClick={show} aria-label="Hướng dẫn hệ thống" aria-haspopup="dialog" aria-expanded={open} title="Hướng dẫn hệ thống" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:px-3">
   <BookOpen className="h-4 w-4"/><span className="hidden sm:inline">Hướng dẫn</span>
  </button>
  {open&&createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
   <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={headingId} className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
      <div>
        <h2 id={headingId} className="flex items-center gap-2 text-base font-bold text-slate-900"><BookOpen className="h-5 w-5 text-orange-600"/>Hướng dẫn sử dụng hệ thống</h2>
        <p className="mt-1 text-xs text-slate-500">{workspaceMode==='TEACHER'?'Dành cho giáo viên':'Dành cho quản lý và nhân viên'} · Các mục hiển thị theo quyền truy cập của bạn.</p>
        {isEditingUrl ? (
          <form onSubmit={handleSaveGuideUrl} className="mt-2.5 flex flex-wrap items-center gap-2">
            <input
              type="url"
              required
              autoFocus
              placeholder="Dán link Google Drive hoặc Docs (https://...)"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              className="w-full sm:w-80 rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700 cursor-pointer"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setIsEditingUrl(false)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <a
              href={guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở tài liệu hướng dẫn sử dụng chi tiết trên Google Drive / Docs trong tab mới"
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 hover:text-orange-800"
            >
              <ExternalLink className="h-3.5 w-3.5 text-orange-600" />
              <span>Mở tài liệu hướng dẫn chi tiết (Google Drive / Docs) ↗</span>
            </a>
            {workspaceMode === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setUrlDraft(guideUrl);
                  setIsEditingUrl(true);
                }}
                title="Quản trị viên: Đổi đường link hướng dẫn sử dụng"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-orange-600 cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                <span>Gán / Sửa link</span>
              </button>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={()=>setOpen(false)} aria-label="Đóng hướng dẫn" className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-5 w-5"/></button>
    </div>
    <label className="relative mx-4 my-3 block sm:mx-5"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><span className="sr-only">Tìm trong hướng dẫn</span><input ref={search} value={query} onChange={event=>setQuery(event.target.value)} maxLength={160} placeholder="Tìm: Excel, lịch rảnh, xếp lớp, AI…" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"/></label>
    <div className="grid min-h-0 flex-1 overflow-y-auto border-t border-slate-100 md:grid-cols-[250px_1fr]">
     <nav aria-label="Các mục hướng dẫn" className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-3 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r">{filtered.map(item=><button type="button" key={item.id} aria-current={topic?.id===item.id?'page':undefined} onClick={()=>setSelected(item.id)} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors md:shrink ${topic?.id===item.id?'border-orange-200 bg-orange-50 text-orange-800':'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'}`}>{item.title}</button>)}{!filtered.length&&<p className="text-xs text-slate-500">Không có mục phù hợp.</p>}</nav>
     <section aria-label="Nội dung hướng dẫn" className="min-w-0 p-4 sm:p-6">
      {topic?<article key={topic.id}><h3 className="text-lg font-bold text-slate-900">{topic.title}</h3><p className="mt-2 text-sm text-slate-600">{topic.summary}</p><ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">{topic.steps.map(step=><li key={step} className="pl-1">{step}</li>)}</ol>{topic.notes?.length&&<aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="text-xs font-bold text-amber-900">Lưu ý</h4><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed text-amber-950">{topic.notes.map(note=><li key={note}>{note}</li>)}</ul></aside>}<p className="mt-5 text-xs text-slate-500">Các thao tác thêm, sửa, xóa chỉ thực hiện được khi tài khoản có quyền tương ứng.</p><button type="button" onClick={()=>navigate(topic)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Đi đến chức năng<ArrowRight className="h-4 w-4"/></button></article>:<div role="status" className="py-8 text-sm text-slate-500">{topics.length?'Không tìm thấy hướng dẫn. Thử từ khóa khác hoặc xóa nội dung tìm kiếm.':'Tài khoản chưa có phân hệ được cấp quyền. Liên hệ người quản lý để được hỗ trợ.'}</div>}
     </section>
    </div>
   </div>
  </div>,document.body)}
 </>;
}
