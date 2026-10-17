import {useEffect,useRef,useState} from 'react';
import {askGemini,type GeminiChatMessage} from '../lib/geminiClient';
import {knowledgeAnswerPrompt} from '../lib/knowledgeAnswer';
import type {SOPDocument} from '../types';

export function useKnowledgeChat(documents:SOPDocument[],tone:string,fallback:string) {
  const [isAnswering,setIsAnswering]=useState(false);
  const request=useRef<AbortController|null>(null);
  const history=useRef<GeminiChatMessage[]>([]);
  useEffect(()=>()=>{request.current?.abort();request.current=null;history.current=[];},[]);
  const reset=()=>{
    request.current?.abort();request.current=null;history.current=[];setIsAnswering(false);
  };
  const answer=async(query:string):Promise<string|null>=>{
    if(request.current)return null;
    const controller=new AbortController();request.current=controller;setIsAnswering(true);
    const timeout=window.setTimeout(()=>controller.abort(),60_000);
    try{
      const messages=[...history.current,{role:'user' as const,text:query}];
      const contextQuery=[...history.current.filter(item=>item.role==='user').slice(-2).map(item=>item.text),query].join('\n');
      const text=await askGemini(messages,{systemPrompt:knowledgeAnswerPrompt(contextQuery,documents,tone,fallback),signal:controller.signal});
      if(request.current!==controller)return null;
      history.current=[...messages,{role:'model' as const,text}].slice(-12);
      while(history.current.length && history.current.reduce((total,item)=>total+item.text.length,0)>24_000){
        history.current=history.current.slice(2);
      }
      return text;
    }catch(error){
      if(request.current!==controller)return null;
      if(controller.signal.aborted)throw new Error('AI phản hồi quá lâu. Vui lòng gửi lại câu hỏi.');
      throw error;
    }finally{
      window.clearTimeout(timeout);
      if(request.current===controller){request.current=null;setIsAnswering(false);}
    }
  };
  return {answer,reset,isAnswering};
}
