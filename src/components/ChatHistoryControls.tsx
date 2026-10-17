import {useState} from 'react';
import type {useTeacherChatHistory} from '../hooks/useTeacherChatHistory';

/** Shared history actions for both portals. Ownership is checked by the SQL RPCs. */
export function ChatHistoryControls({chat,onSelect}:{chat:ReturnType<typeof useTeacherChatHistory>;onSelect:()=>void}) {
  const [expanded,setExpanded]=useState(false);
  return <div className="px-3 py-2 border-b border-slate-200 space-y-1.5 bg-white text-[11px]">
    <div className="flex gap-2 items-center justify-between">
      <button type="button" onClick={()=>setExpanded(value=>!value)} className="font-semibold text-orange-700 hover:underline" aria-expanded={expanded}>Lịch sử câu hỏi</button>
      <button type="button" disabled={chat.isBusy} onClick={()=>{chat.newChat();onSelect();setExpanded(false);}} className="ml-auto font-semibold text-orange-700 hover:underline disabled:opacity-40">+ Cuộc trò chuyện mới</button>
    </div>
    <p className="text-[10px] text-slate-500">Chỉ lưu câu hỏi. Câu trả lời AI được giữ tạm, không lưu vào lịch sử.</p>
    {chat.activeChat && <p className="truncate text-slate-600" title={chat.chats.find(row=>row.maphien===chat.activeChat)?.tieude}>{chat.chats.find(row=>row.maphien===chat.activeChat)?.tieude||'Cuộc trò chuyện hiện tại'}</p>}
    {expanded && <div className="max-h-36 overflow-y-auto space-y-1 border-t border-slate-100 pt-1.5">
      <button type="button" disabled={chat.isBusy} onClick={()=>void chat.refresh()} className="text-slate-500 hover:text-orange-700 disabled:opacity-40">Tải lại danh sách</button>
      {!chat.chats.length && !chat.isBusy && <p className="text-slate-500">Chưa có lịch sử câu hỏi.</p>}
      {chat.chats.map(row=><button key={row.maphien} type="button" disabled={chat.isBusy}
        onClick={async()=>{if(await chat.open(row.maphien)){setExpanded(false);onSelect();}}}
        className={`block w-full text-left px-2 py-1.5 rounded-lg disabled:opacity-40 ${chat.activeChat===row.maphien?'bg-orange-50 text-orange-800':'hover:bg-slate-50 text-slate-700'}`}>
        <span className="block truncate">{row.tieude}</span>
        <span className="block text-[9px] text-slate-400">{new Date(row.thoigianbatdau).toLocaleString('vi-VN')}</span>
      </button>)}
      {chat.hasMoreChats && <button type="button" disabled={chat.isBusy} onClick={()=>void chat.moreChats()} className="w-full text-orange-700 hover:underline disabled:opacity-40">Xem thêm cuộc trò chuyện</button>}
    </div>}
    {chat.error && <div role="alert" className="text-red-600 break-words">{chat.error}</div>}
    {chat.isBusy && !chat.isAnswering && <p role="status" className="text-slate-500 animate-pulse">Đang xử lý lịch sử…</p>}
  </div>;
}
