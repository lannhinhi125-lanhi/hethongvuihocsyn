import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Info,X} from 'lucide-react';

export function InfoTitle({title,children}:{title:string;children:ReactNode}){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialog.current?.showModal();
  return ()=>{document.body.style.overflow=overflow;previous?.focus();};
 },[open]);
 return <><button type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} title="Xem ý nghĩa và cách tính" className="inline-flex items-center gap-2 rounded text-left hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500">{title}<Info className="h-3.5 w-3.5 shrink-0 text-slate-400"/></button>
  {open&&createPortal(<dialog ref={dialog} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md overflow-visible rounded-2xl border border-white/70 bg-white/95 p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm">
   <div className="p-5"><div className="flex items-start justify-between gap-4"><h2 id={titleId} className="text-sm font-bold">{title}</h2><button type="button" autoFocus aria-label="Đóng giải thích" onClick={()=>setOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4"/></button></div><div className="mt-3 max-h-[65vh] space-y-3 overflow-y-auto text-xs font-normal leading-6 text-slate-600">{children}</div></div>
  </dialog>,document.body)}
 </>;
}
