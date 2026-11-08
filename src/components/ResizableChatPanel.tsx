import React,{useEffect,useRef,useState} from 'react';
import {GripHorizontal} from 'lucide-react';

export function ResizableChatPanel({children}:{children:React.ReactNode}) {
 const panel=useRef<HTMLDivElement>(null);
 const drag=useRef({y:0,height:650});
 const clamp=(value:number)=>Math.max(Math.min(420,window.innerHeight-32),Math.min(value,window.innerHeight-32));
 const [height,setHeight]=useState(()=>typeof window==='undefined'?650:clamp(650));
 useEffect(()=>{
  const resize=()=>setHeight(value=>clamp(value));
  window.addEventListener('resize',resize);
  return()=>window.removeEventListener('resize',resize);
 },[]);
 return <div ref={panel} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs" style={{height}}>
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  <div role="separator" aria-label="Điều chỉnh chiều cao chatbot" aria-orientation="horizontal" tabIndex={0}
   aria-valuenow={Math.round(height)} aria-valuetext={`${Math.round(height)} pixel`}
   className="flex h-6 shrink-0 cursor-ns-resize touch-none select-none items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 text-slate-500 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500"
   title="Kéo lên/xuống để đổi chiều cao · Nhấp đúp để đặt lại"
   onDoubleClick={()=>setHeight(clamp(650))}
   onKeyDown={event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    setHeight(value=>clamp(event.key==='Home'?0:event.key==='End'?window.innerHeight:value+(event.key==='ArrowUp'?-20:20)));
   }}
   onPointerDown={event=>{
    if(event.button!==0)return;
    event.preventDefault();
    drag.current={y:event.clientY,height:panel.current?.getBoundingClientRect().height||height};
    event.currentTarget.setPointerCapture(event.pointerId);
   }}
   onPointerMove={event=>{
    if(event.currentTarget.hasPointerCapture(event.pointerId))setHeight(clamp(drag.current.height+event.clientY-drag.current.y));
   }}
   onPointerUp={event=>{
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
   }}>
   <GripHorizontal aria-hidden="true" className="h-4 w-4"/><span className="text-[10px]">Kéo để đổi chiều cao</span>
  </div>
 </div>;
}
