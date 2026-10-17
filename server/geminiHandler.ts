import type {IncomingMessage, ServerResponse} from 'node:http';
import {GeminiError, generateGeminiText, validateGeminiInput, type GeminiEnvironment} from '../services/geminiService.js';

type ApiRequest = IncomingMessage & {body?: unknown};
const MAX_BODY_BYTES = 512_000;

async function readBody(req: ApiRequest): Promise<unknown> {
  if (req.body !== undefined) {
    if (Buffer.byteLength(typeof req.body==='string' ? req.body : JSON.stringify(req.body)) > MAX_BODY_BYTES) throw new GeminiError(413,'Nội dung yêu cầu quá lớn.');
    return typeof req.body==='string' ? JSON.parse(req.body) : req.body;
  }
  const chunks:Buffer[]=[];
  let size=0;
  for await (const chunk of req) {
    const bytes=Buffer.from(chunk);size+=bytes.length;
    if(size>MAX_BODY_BYTES)throw new GeminiError(413,'Nội dung yêu cầu quá lớn.');
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function authorize(req:ApiRequest, env:GeminiEnvironment) {
  const authorization=req.headers.authorization;
  if (!authorization?.startsWith('Bearer ') || authorization.length>2048) throw new GeminiError(401,'Vui lòng đăng nhập lại.');
  const url=env.VITE_SUPABASE_URL?.trim(), anonKey=env.VITE_SUPABASE_ANON_KEY?.trim();
  if(!url || !anonKey)throw new GeminiError(503,'Máy chủ chưa cấu hình Supabase để xác thực phiên.');
  const response=await fetch(`${url.replace(/\/$/,'')}/rest/v1/rpc/vuihoc_session`, {
    method:'POST',headers:{'Content-Type':'application/json',apikey:anonKey,Authorization:`Bearer ${anonKey}`},
    body:JSON.stringify({p_token:authorization.slice(7)}),signal:AbortSignal.timeout(10_000),
  });
  if(!response.ok)throw new GeminiError(401,'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  const session=await response.json();
  const actor=session.actor;
  if(!actor || session.error || actor.trangthai!=='active')throw new GeminiError(401,'Vui lòng đăng nhập lại.');
  const group=session.role_groups?.find((row:{madinhdanh:string})=>row.madinhdanh===actor.manhomquyen);
  const allowed=group?.congtruycap==='TEACHER'
    ? ['ALL','TEACHER_PORTAL','T_SCHEDULE_ALL','Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy']
    : ['ALL','PH6_ALL','Sử dụng chatbot tra cứu quy chế và nghiệp vụ','Sử dụng AI sinh & tinh chỉnh nhận xét học sinh'];
  if(!Array.isArray(group?.danhsachquyen) || !group.danhsachquyen.some((permission:string)=>allowed.includes(permission))) {
    throw new GeminiError(403,'Bạn chưa có quyền sử dụng AI.');
  }
}

export function createGeminiHandler(getEnvironment:()=>GeminiEnvironment=()=>process.env) {
  return async (req:ApiRequest,res:ServerResponse)=>{
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){
      res.setHeader('Allow','POST');res.statusCode=405;res.end(JSON.stringify({error:'Chỉ hỗ trợ POST.'}));return;
    }
    try {
      if(!req.headers['content-type']?.startsWith('application/json'))throw new GeminiError(415,'Yêu cầu phải dùng application/json.');
      const input=validateGeminiInput(await readBody(req));
      const env=getEnvironment();
      await authorize(req,env);
      const text=await generateGeminiText(input,env);
      res.statusCode=200;res.end(JSON.stringify({text}));
    } catch(error) {
      const known=error instanceof GeminiError;
      const timeout=error instanceof Error && ['TimeoutError','AbortError'].includes(error.name);
      res.statusCode=known ? error.status : error instanceof SyntaxError ? 400 : timeout ? 504 : 502;
      res.end(JSON.stringify({error:known ? error.message : error instanceof SyntaxError ? 'JSON không hợp lệ.' : timeout ? 'Gemini phản hồi quá lâu. Vui lòng thử lại.' : 'Không kết nối được dịch vụ AI. Vui lòng thử lại.'}));
    }
  };
}
