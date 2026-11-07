import {useState} from 'react';
import type {useTeacherChatHistory} from '../hooks/useTeacherChatHistory';

/** Shared history actions for both portals. Ownership is checked by the SQL RPCs. */
export function ChatHistoryControls({chat,onSelect}:{chat:ReturnType<typeof useTeacherChatHistory>;onSelect:()=>void}) {
  const [expanded,setExpanded]=useState(false);
  return <div className="shrink-0 px-4 py-3 border-b border-slate-300 space-y-2 bg-white text-sm text-slate-900">
    <div className="flex gap-2 items-center justify-between">
      <button type="button" onClick={()=>setExpanded(value=>!value)} className="font-semibold text-orange-700 hover:underline" aria-expanded={expanded}>Lịch sử câu hỏi</button>
      <button type="button" disabled={chat.isBusy} onClick={()=>{chat.newChat();onSelect();setExpanded(false);}} className="ml-auto font-semibold text-orange-700 hover:underline disabled:opacity-40">+ Cuộc trò chuyện mới</button>
    </div>
    <p className="text-xs leading-relaxed text-slate-600">Chỉ lưu câu hỏi. Câu trả lời AI được giữ tạm, không lưu vào lịch sử.</p>
    {chat.activeChat && <p className="truncate font-medium text-slate-800" title={chat.chats.find(row=>row.maphien===chat.activeChat)?.tieude}>{chat.chats.find(row=>row.maphien===chat.activeChat)?.tieude||'Cuộc trò chuyện hiện tại'}</p>}
    {expanded && <div className="max-h-44 overflow-y-auto space-y-2 border-t border-slate-200 pt-2">
      <button type="button" disabled={chat.isBusy} onClick={()=>void chat.refresh()} className="text-slate-500 hover:text-orange-700 disabled:opacity-40">Tải lại danh sách</button>
      {!chat.chats.length && !chat.isBusy && <p className="text-slate-500">Chưa có lịch sử câu hỏi.</p>}
      {chat.chats.map(row=><button key={row.maphien} type="button" disabled={chat.isBusy}
        onClick={async()=>{if(await chat.open(row.maphien)){setExpanded(false);onSelect();}}}
        className={`block w-full text-left px-3 py-2.5 rounded-lg border disabled:opacity-40 ${chat.activeChat===row.maphien?'bg-orange-50 border-orange-300 text-orange-900':'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'}`}>
        <span className="block truncate font-medium">{row.tieude}</span>
        <span className="block mt-1 text-xs text-slate-600">{new Date(row.thoigianbatdau).toLocaleString('vi-VN')}</span>
      </button>)}
      {chat.hasMoreChats && <button type="button" disabled={chat.isBusy} onClick={()=>void chat.moreChats()} className="w-full text-orange-700 hover:underline disabled:opacity-40">Xem thêm cuộc trò chuyện</button>}
    </div>}
    {chat.error && <div role="alert" className="text-red-600 break-words">{chat.error}</div>}
    {chat.isBusy && !chat.isAnswering && <p role="status" className="text-slate-500 animate-pulse">Đang xử lý lịch sử…</p>}
  </div>;
}
