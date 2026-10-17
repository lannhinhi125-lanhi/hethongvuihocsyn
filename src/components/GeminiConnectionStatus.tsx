import {useEffect,useRef,useState} from 'react';
import {CheckCircle,LoaderCircle,RefreshCw,AlertCircle} from 'lucide-react';
import {checkGeminiConnection} from '../lib/geminiClient';

/** Check on opening the bot or explicit retry; never poll or persist status. */
export function GeminiConnectionStatus() {
  const [attempt,setAttempt]=useState(0);
  const [status,setStatus]=useState<'checking'|'connected'|'failed'>('checking');
  const [error,setError]=useState('');
  const retrying=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),60_000);
    let active=true;
    setStatus('checking');setError('');
    void checkGeminiConnection(controller.signal).then(()=>{
      if(active)setStatus('connected');
    }).catch((reason:unknown)=>{
      if(!active)return;
      setStatus('failed');
      setError(controller.signal.aborted ? 'Kiểm tra quá lâu. Vui lòng thử lại.'
        : reason instanceof TypeError ? 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
        : reason instanceof Error ? reason.message : 'Không kết nối được Gemini.');
    }).finally(()=>{window.clearTimeout(timeout);if(active)retrying.current=false;});
    return ()=>{active=false;window.clearTimeout(timeout);controller.abort();};
  },[attempt]);
  const checking=status==='checking';
  const Icon=checking ? LoaderCircle : status==='connected' ? CheckCircle : AlertCircle;
  return <div className="px-3 py-2 border-b border-slate-200 bg-white text-[11px]">
    <div className="flex items-center justify-between gap-2">
      <span role="status" aria-live="polite" className={`flex items-center gap-1.5 ${checking ? 'text-slate-500' : status==='connected' ? 'text-emerald-700' : 'text-red-600'}`}>
        <Icon aria-hidden="true" className={`w-3.5 h-3.5 shrink-0 ${checking ? 'animate-spin' : ''}`} />
        {checking ? 'Đang kết nối Gemini…' : status==='connected' ? 'Kết nối Gemini thành công' : 'Kết nối Gemini thất bại'}
      </span>
      <button type="button" disabled={checking} onClick={()=>{
        if(retrying.current)return;
        retrying.current=true;setStatus('checking');setAttempt(value=>value+1);
      }} className="flex items-center gap-1 shrink-0 text-slate-600 hover:text-[#FF5C00] disabled:opacity-40 disabled:cursor-wait" aria-label="Kiểm tra lại kết nối Gemini">
        <RefreshCw aria-hidden="true" className="w-3 h-3" />{status==='failed' ? 'Thử lại' : 'Kiểm tra lại'}
      </button>
    </div>
    {status==='failed' && <p className="mt-1 text-red-600 break-words">{error}</p>}
  </div>;
}
