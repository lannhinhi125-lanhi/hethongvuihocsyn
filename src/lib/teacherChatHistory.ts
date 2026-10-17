import {supabase} from '../config/supabase';
import {getAccountSessionToken} from './accountSession';
import type {GeminiChatMessage} from './geminiClient';

export type ChatSummary={maphien:string;tieude:string;thoigianbatdau:string};
export type ChatTurn={macauhoi:string;noidung:string;traloi:string|null;thoigianhoi:string;thoigiantraloi:string|null};
async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T> {
  const {data,error}=await supabase.schema('public').rpc(name,{p_token:getAccountSessionToken(),...args}).abortSignal(AbortSignal.timeout(15_000));
  if(error)throw new Error(error.code==='PGRST202'
    ? 'Chưa cài lịch sử câu hỏi. Chạy toàn bộ file setup_teacher_question_history.sql trong Supabase.'
    : error.message||'Không đọc/lưu được lịch sử chat.');
  return data as T;
}
export const listTeacherChats=(offset=0)=>rpc<ChatSummary[]>('vuihoc_ai_chat_list',{p_offset:offset});
export const readTeacherChat=async(chat:string,offset=0):Promise<ChatTurn[]>=>{
  const rows=await rpc<Array<Pick<ChatTurn,'macauhoi'|'noidung'|'thoigianhoi'>>>('vuihoc_ai_chat_questions',{p_chat:chat,p_offset:offset});
  return rows.map(row=>({...row,traloi:null,thoigiantraloi:null}));
};
export const openTeacherChat=(chat:string)=>rpc<string>('vuihoc_ai_chat_open',{p_chat:chat});
export const saveTeacherQuestion=(chat:string,id:string,content:string)=>rpc<void>('vuihoc_ai_question_save',{p_chat:chat,p_question:id,p_content:content});
export const deleteTeacherChat=(chat:string)=>rpc<boolean>('vuihoc_ai_chat_delete',{p_chat:chat});

/** Only completed preceding turns go to Gemini, independent of the visible/history page size. */
export function teacherChatContext(turns:ChatTurn[],query:string,beforeId?:string):GeminiChatMessage[] {
  const index=beforeId?turns.findIndex(turn=>turn.macauhoi===beforeId):-1;
  const completed=(index<0?turns:turns.slice(0,index)).filter(turn=>turn.traloi!==null).slice(-6);
  let size=completed.reduce((total,turn)=>total+turn.noidung.length+turn.traloi!.length,0);
  while(completed.length && size>24_000){const turn=completed.shift()!;size-=turn.noidung.length+turn.traloi!.length;}
  return [...completed.flatMap(turn=>[{role:'user' as const,text:turn.noidung},{role:'model' as const,text:turn.traloi!}]),{role:'user',text:query}];
}
