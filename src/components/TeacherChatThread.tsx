import {useLayoutEffect,useRef} from 'react';
import {ChatMessageText} from './ChatMessageText';
import type {ChatTurn} from '../lib/teacherChatHistory';

export function TeacherChatThread({turns,greeting,isBusy,isAnswering,hasOlder,onOlder,onAskAgain}:{
  turns:ChatTurn[];greeting:string;isBusy:boolean;isAnswering:boolean;hasOlder:boolean;
  onOlder:()=>void;onAskAgain:(turn:ChatTurn)=>void;
}) {
  const scroll=useRef<HTMLDivElement>(null);
  const previous=useRef({first:'',last:'',height:0});
  useLayoutEffect(()=>{
    const element=scroll.current;if(!element)return;
    const first=turns[0]?.macauhoi||'',last=turns.at(-1)?.macauhoi||'';
    const older=previous.current.first && first!==previous.current.first && last===previous.current.last;
    element.scrollTop=older ? element.scrollTop+element.scrollHeight-previous.current.height : element.scrollHeight;
    previous.current={first,last,height:element.scrollHeight};
  },[turns,isAnswering]);
  const time=(value:string)=>new Date(value).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  return <div ref={scroll} className="ai-chat-thread flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-sm leading-relaxed text-slate-900 bg-slate-100">
    {hasOlder && <button type="button" disabled={isBusy} onClick={onOlder} className="w-full text-orange-700 text-[11px] hover:underline disabled:opacity-40">Xem câu hỏi cũ hơn</button>}
    {!turns.length && <div className="ai-chat-greeting p-4 rounded-2xl bg-white border border-slate-300 shadow-sm"><ChatMessageText text={greeting||'Thầy/cô cần hỗ trợ nội dung gì?'} /></div>}
    {turns.map(turn=><div key={turn.macauhoi} className="space-y-2">
      <div className="flex flex-col items-end">
        <span className="mb-1 text-xs font-medium text-slate-600">Thầy/Cô · {time(turn.thoigianhoi)}</span>
        <div className="max-w-[90%] p-3.5 rounded-2xl rounded-br-sm bg-orange-700 text-white shadow-sm"><ChatMessageText text={turn.noidung} format={false} /></div>
        <button type="button" disabled={isBusy} onClick={()=>onAskAgain(turn)} className="mt-1 text-xs font-medium text-orange-800 hover:underline disabled:opacity-40">Hỏi lại câu này</button>
      </div>
      {turn.traloi!==null && <div className="flex flex-col items-start">
        <span className="mb-1 text-xs font-medium text-slate-600">Bot chat AI{turn.thoigiantraloi?' · '+time(turn.thoigiantraloi):''}</span>
        <div className="ai-chat-answer max-w-[90%] p-4 rounded-2xl rounded-bl-sm bg-white border border-slate-300 text-slate-900 shadow-sm"><ChatMessageText text={turn.traloi} /></div>
      </div>}
    </div>)}
    {isAnswering && <p role="status" className="text-slate-500 animate-pulse">AI đang soạn câu trả lời…</p>}
  </div>;
}
