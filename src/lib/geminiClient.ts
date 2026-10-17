import {getAccountSessionToken} from './accountSession';

export type GeminiChatMessage={role:'user'|'model';text:string};

/** Browser calls our server; the Gemini key never enters browser code. */
export async function askGemini(messages:GeminiChatMessage[], options:{systemPrompt?:string;signal?:AbortSignal}={}) {
  const token=getAccountSessionToken();
  const response=await fetch('/api/gemini',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({messages,systemPrompt:options.systemPrompt}),signal:options.signal,
  });
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('API Gemini chưa chạy. Dùng npm run dev hoặc triển khai lên Vercel.');
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || 'Không gọi được trợ lý AI.');
  if(typeof result.text!=='string' || !result.text.trim())throw new Error('Trợ lý AI chưa trả về nội dung.');
  return result.text as string;
}
