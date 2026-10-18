import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MoreHorizontal} from 'lucide-react';

type Action={label:string;onSelect:()=>void;disabled?:boolean};
export function RowActionMenu({label,actions}:{label:string;actions:Action[]}){
 const [position,setPosition]=useState<{top:number;left:number}|null>(null);
 const trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();
 const close=(focus=false)=>{setPosition(null);if(focus)trigger.current?.focus();};
 useEffect(()=>{
  if(!position)return;
  panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  const outside=(event:PointerEvent)=>{if(!panel.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))close();};
  const scroll=(event:Event)=>{if(!panel.current?.contains(event.target as Node))close();};
  const resize=()=>close();
  document.addEventListener('pointerdown',outside);window.addEventListener('scroll',scroll,true);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',resize);};
 },[position]);
 return <>
  <button ref={trigger} type="button" aria-label={label} title="Thao tác khác" aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position?id:undefined}
   className="rounded p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600" onClick={()=>{
    if(position){close();return;}const rect=trigger.current!.getBoundingClientRect();const height=actions.length*40+12;
    setPosition({left:Math.max(8,Math.min(rect.right-200,window.innerWidth-208)),top:rect.bottom+height+8<=window.innerHeight?rect.bottom+5:Math.max(8,rect.top-height-5)});
   }}><MoreHorizontal className="h-3.5 w-3.5"/></button>
  {position&&createPortal(<div ref={panel} id={id} role="menu" aria-label={label} style={position} className="fixed z-[200] w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-lg"
   onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))close();}}
   onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();
    const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
   }}>
   {actions.map(action=><button key={action.label} type="button" role="menuitem" disabled={action.disabled} onClick={()=>{close(true);action.onSelect();}} className="block w-full rounded-lg px-3 py-2.5 text-left text-slate-700 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40">{action.label}</button>)}
  </div>,document.body)}
 </>;
}
