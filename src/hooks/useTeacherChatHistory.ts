import {useCallback,useEffect,useRef,useState} from 'react';
import {askGemini} from '../lib/geminiClient';
import {knowledgeAnswerPrompt} from '../lib/knowledgeAnswer';
import {deleteTeacherChat,listTeacherChats,openTeacherChat,readTeacherChat,saveTeacherQuestion,teacherChatContext,type ChatSummary,type ChatTurn} from '../lib/teacherChatHistory';
import type {RAGBotConfig,SOPDocument} from '../types';

const ordered=(rows:ChatTurn[])=>[...rows].sort((a,b)=>a.thoigianhoi.localeCompare(b.thoigianhoi)||a.macauhoi.localeCompare(b.macauhoi));
export function useTeacherChatHistory(accountId:string|undefined,enabled:boolean,documents:SOPDocument[],config:RAGBotConfig) {
  const [chats,setChats]=useState<ChatSummary[]>([]);
  const [turns,setTurns]=useState<ChatTurn[]>([]);
  const [activeChat,setActiveChat]=useState<string|null>(null);
  const [hasMoreChats,setHasMoreChats]=useState(false);
  const [hasOlderTurns,setHasOlderTurns]=useState(false);
  const [isBusy,setIsBusy]=useState(false);
  const [isAnswering,setIsAnswering]=useState(false);
  const [error,setError]=useState('');
  const busy=useRef(false);
  const generation=useRef(0);
  const request=useRef<AbortController|null>(null);
  const selected=useRef<string|null>(null);
  const turnsOffset=useRef(0);
  const initialized=useRef(false);
  useEffect(()=>{
    generation.current++;selected.current=null;initialized.current=false;
    setChats([]);setTurns([]);setActiveChat(null);setHasMoreChats(false);setHasOlderTurns(false);setError('');
    busy.current=false;setIsBusy(false);setIsAnswering(false);
    return ()=>{generation.current++;request.current?.abort();request.current=null;};
  },[accountId]);
  const operate=useCallback(async(action:(version:number)=>Promise<void>)=>{
    if(busy.current)return false;
    busy.current=true;setIsBusy(true);setError('');const version=generation.current;
    try{await action(version);return version===generation.current;}catch(reason){
      if(version===generation.current)setError(reason instanceof Error?reason.message:'Không thao tác được với cuộc trò chuyện.');
      return false;
    }finally{if(version===generation.current){busy.current=false;setIsBusy(false);setIsAnswering(false);}}
  },[]);
  const load=useCallback(async(id:string,version:number)=>{
    const rows=await readTeacherChat(id);
    if(version!==generation.current)return;
    selected.current=id;setActiveChat(id);setTurns(ordered(rows.slice(0,20)));
    turnsOffset.current=Math.min(rows.length,20);setHasOlderTurns(rows.length>20);
  },[]);
  const refresh=useCallback(()=>operate(async version=>{
    if(!accountId)return;
    const rows=await listTeacherChats();
    if(version!==generation.current)return;
    setChats(rows.slice(0,20));setHasMoreChats(rows.length>20);
    if(!initialized.current){
      if(rows[0])await load(rows[0].maphien,version);
      if(version===generation.current)initialized.current=true;
    }
  }),[accountId,load,operate]);
  useEffect(()=>{if(enabled)void refresh();},[enabled,refresh]);
  const open=(id:string)=>operate(async version=>{await load(id,version);});
  const moreChats=()=>operate(async version=>{
    const rows=await listTeacherChats(chats.length);
    if(version!==generation.current)return;
    setChats(previous=>[...previous,...rows.slice(0,20).filter(row=>!previous.some(old=>old.maphien===row.maphien))]);
    setHasMoreChats(rows.length>20);
  });
  const olderTurns=()=>operate(async version=>{
    if(!selected.current)return;
    const rows=await readTeacherChat(selected.current,turnsOffset.current);
    if(version!==generation.current)return;
    setTurns(previous=>ordered([...previous,...rows.slice(0,20).filter(row=>!previous.some(old=>old.macauhoi===row.macauhoi))]));
    turnsOffset.current+=Math.min(rows.length,20);setHasOlderTurns(rows.length>20);
  });
  const newChat=()=>{
    if(busy.current)return;
    initialized.current=true;selected.current=null;setActiveChat(null);setTurns([]);setHasOlderTurns(false);turnsOffset.current=0;setError('');
  };
  const remove=()=>operate(async version=>{
    const id=selected.current;
    if(id && accountId)await deleteTeacherChat(id);
    if(version!==generation.current)return;
    selected.current=null;setActiveChat(null);setTurns([]);setHasOlderTurns(false);turnsOffset.current=0;
    setChats(previous=>previous.filter(chat=>chat.maphien!==id));initialized.current=true;
  });
  const send=(query:string,retryId?:string)=>operate(async version=>{
    query=query.trim();if(!query)return;
    if(query.length>8000)throw new Error('Câu hỏi tối đa 8.000 ký tự. Vui lòng chia nhỏ nội dung.');
    setIsAnswering(true);
    let id=selected.current;
    if(accountId && !id){
      id=crypto.randomUUID();await openTeacherChat(id);
      if(version!==generation.current)return;
      selected.current=id;setActiveChat(id);initialized.current=true;
    }
    const questionId=retryId||crypto.randomUUID();
    if(accountId && !retryId)await saveTeacherQuestion(id!,questionId,query);
    if(version!==generation.current)return;
    if(!retryId){
      setTurns(previous=>[...previous,{macauhoi:questionId,noidung:query,traloi:null,thoigianhoi:new Date().toISOString(),thoigiantraloi:null}]);
      turnsOffset.current++;
    }
    const messages=teacherChatContext(turns,query,retryId);
    const contextQuery=messages.filter(item=>item.role==='user').slice(-3).map(item=>item.text).join('\n');
    const controller=new AbortController();request.current=controller;
    const timeout=window.setTimeout(()=>controller.abort(),90_000);
    try{
      const text=await askGemini(messages,{signal:controller.signal,
        systemPrompt:knowledgeAnswerPrompt(contextQuery,documents,config.personaTone,config.fallbackResponse,config.systemPrompt)});
      if(version!==generation.current)return;
      setTurns(previous=>previous.map(turn=>turn.macauhoi===questionId?{...turn,traloi:text,thoigiantraloi:new Date().toISOString()}:turn));
    }catch(reason){
      if(controller.signal.aborted)throw new Error('AI phản hồi lâu. Câu hỏi đã được giữ lại; bạn có thể bấm Hỏi lại.');
      throw reason;
    }finally{
      window.clearTimeout(timeout);if(request.current===controller)request.current=null;
      if(accountId && version===generation.current){
        try{const rows=await listTeacherChats();if(version===generation.current){setChats(rows.slice(0,20));setHasMoreChats(rows.length>20);}}
        catch{/* Keep the chat outcome; the history list has a refresh action. */}
      }
    }
  });
  return {chats,turns,activeChat,hasMoreChats,hasOlderTurns,isBusy,isAnswering,error,refresh,open,moreChats,olderTurns,newChat,remove,send};
}
